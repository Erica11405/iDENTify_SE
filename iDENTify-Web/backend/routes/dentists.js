const express = require('express');
const router = express.Router();
const db = require('../db'); 
const bcrypt = require('bcrypt');

// Helper to convert undefined to null to prevent MySQL crashes
const safeVal = (val) => val === undefined ? null : val;

let hasMiddleNameColumnCache = null;
let hasIsArchivedColumnCache = null;

async function hasMiddleNameColumn() {
  if (hasMiddleNameColumnCache !== null) {
    return hasMiddleNameColumnCache;
  }

  try {
    const [rows] = await db.query("SHOW COLUMNS FROM dentists LIKE 'middle_name'");
    hasMiddleNameColumnCache = rows.length > 0;
  } catch (_err) {
    hasMiddleNameColumnCache = false;
  }

  return hasMiddleNameColumnCache;
}

async function hasIsArchivedColumn() {
  if (hasIsArchivedColumnCache !== null) {
    return hasIsArchivedColumnCache;
  }

  try {
    const [rows] = await db.query("SHOW COLUMNS FROM dentists LIKE 'is_archived'");
    hasIsArchivedColumnCache = rows.length > 0;
  } catch (_err) {
    hasIsArchivedColumnCache = false;
  }

  return hasIsArchivedColumnCache;
}

function composeStaffName(firstName, middleName, lastName) {
  return [firstName, middleName, lastName]
    .map((part) => String(part || '').trim())
    .filter(Boolean)
    .join(' ') || 'Unnamed Staff';
}

// GET ALL DENTISTS / STAFF (Updated with filtering)
router.get('/', async (req, res) => {
  try {
    const { type } = req.query;
    const whereClauses = [];

    if (await hasIsArchivedColumn()) {
      whereClauses.push('COALESCE(is_archived, 0) = 0');
    }
    
    // Server-side filtering logic
    if (type === 'dentist') {
      whereClauses.push("specialization != 'Dental Aide'");
    } else if (type === 'aide') {
      whereClauses.push("specialization = 'Dental Aide'");
    }

    let query = 'SELECT * FROM dentists';
    if (whereClauses.length > 0) {
      query += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    const [rows] = await db.query(query);
    const formattedDentists = rows.map(d => ({
      ...d,
      days: typeof d.schedule_days === 'string' ? JSON.parse(d.schedule_days) : (d.schedule_days || []),
      operatingHours: typeof d.operating_hours === 'string' ? JSON.parse(d.operating_hours) : (d.operating_hours || { start: '09:00', end: '17:00' }),
      lunch: typeof d.lunch === 'string' ? JSON.parse(d.lunch) : (d.lunch || { start: '', end: '' }),
      breaks: typeof d.breaks === 'string' ? JSON.parse(d.breaks) : (d.breaks || []),
      leaveDays: typeof d.leave_days === 'string' ? JSON.parse(d.leave_days) : (d.leave_days || []),
      name: d.name || composeStaffName(d.first_name, d.middle_name, d.last_name)
    }));
    res.json(formattedDentists);
  } catch (err) {
    console.error("Error fetching staff:", err);
    res.status(500).json({ error: err.message });
  }
});

// ADD NEW DENTIST OR AIDE (AND CREATE LOGIN ACCOUNT)
router.post('/', async (req, res) => {
  const { first_name, middle_name, last_name, specialization, phone, email, days, operatingHours, lunch, breaks, leaveDays, status, password, role } = req.body;
  
  try {
    const fullName = composeStaffName(first_name, middle_name, last_name);
    const supportsMiddleName = await hasMiddleNameColumn();
    
    if (email) {
       const [existingUser] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
       if (existingUser.length > 0) {
           return res.status(400).json({ error: "An account with this email already exists." });
       }
    }

    const sql = supportsMiddleName
      ? `INSERT INTO dentists (first_name, middle_name, last_name, name, specialization, phone, email, schedule_days, operating_hours, lunch, breaks, leave_days, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      : `INSERT INTO dentists (first_name, last_name, name, specialization, phone, email, schedule_days, operating_hours, lunch, breaks, leave_days, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const values = supportsMiddleName
      ? [
          safeVal(first_name),
          safeVal(middle_name),
          safeVal(last_name),
          fullName,
          safeVal(specialization),
          safeVal(phone),
          safeVal(email),
          JSON.stringify(days || []),
          JSON.stringify(operatingHours || {}),
          JSON.stringify(lunch || {}),
          JSON.stringify(breaks || []),
          JSON.stringify(leaveDays || []),
          status || 'Available',
        ]
      : [
          safeVal(first_name),
          safeVal(last_name),
          fullName,
          safeVal(specialization),
          safeVal(phone),
          safeVal(email),
          JSON.stringify(days || []),
          JSON.stringify(operatingHours || {}),
          JSON.stringify(lunch || {}),
          JSON.stringify(breaks || []),
          JSON.stringify(leaveDays || []),
          status || 'Available',
        ];
    
    const [result] = await db.query(sql, values);
    const newStaffId = result.insertId;

    if (email) {
      const plainPassword = password || 'password123'; 
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(plainPassword, salt);
      
      let userRole = 'dentist';
      if (role) {
          userRole = role.toLowerCase();
      } else if (specialization && specialization.toLowerCase().includes('aide')) {
          userRole = 'aide';
      }

      const userSql = `INSERT INTO users (email, password_hash, full_name, role, dentist_id, is_verified) VALUES (?, ?, ?, ?, ?, 1)`;
      await db.query(userSql, [email, hashedPassword, fullName, userRole, newStaffId]);
    }

    res.status(201).json({ id: newStaffId, message: 'Staff profile and login account created successfully!' });
  } catch (err) {
    console.error("Error adding staff:", err);
    res.status(500).json({ error: err.message });
  }
});

// UPDATE DENTIST / STAFF
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { first_name, middle_name, last_name, specialization, phone, email, days, operatingHours, lunch, breaks, leaveDays, status } = req.body;
  try {
    const fullName = composeStaffName(first_name, middle_name, last_name);
    const supportsMiddleName = await hasMiddleNameColumn();

    const sql = supportsMiddleName
      ? `UPDATE dentists SET first_name = ?, middle_name = ?, last_name = ?, name = ?, specialization = ?, phone = ?, email = ?, schedule_days = ?, operating_hours = ?, lunch = ?, breaks = ?, leave_days = ?, status = ? WHERE id = ?`
      : `UPDATE dentists SET first_name = ?, last_name = ?, name = ?, specialization = ?, phone = ?, email = ?, schedule_days = ?, operating_hours = ?, lunch = ?, breaks = ?, leave_days = ?, status = ? WHERE id = ?`;

    const values = supportsMiddleName
      ? [safeVal(first_name), safeVal(middle_name), safeVal(last_name), fullName, safeVal(specialization), safeVal(phone), safeVal(email), JSON.stringify(days || []), JSON.stringify(operatingHours || {}), JSON.stringify(lunch || {}), JSON.stringify(breaks || []), JSON.stringify(leaveDays || []), status || 'Available', id]
      : [safeVal(first_name), safeVal(last_name), fullName, safeVal(specialization), safeVal(phone), safeVal(email), JSON.stringify(days || []), JSON.stringify(operatingHours || {}), JSON.stringify(lunch || {}), JSON.stringify(breaks || []), JSON.stringify(leaveDays || []), status || 'Available', id];
    
    const [result] = await db.query(sql, values);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Staff member not found' });
    res.json({ message: 'Staff updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE DENTIST / STAFF
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await db.query('DELETE FROM dentists WHERE id = ?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Staff member not found' });
    await db.query('DELETE FROM users WHERE dentist_id = ?', [id]);
    res.json({ message: 'Staff deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: "Cannot delete staff member with active appointments." });
  }
});

module.exports = router;