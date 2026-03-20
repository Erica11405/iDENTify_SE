const express = require('express');
const router = express.Router();
const db = require('../db'); 
const bcrypt = require('bcrypt'); // Added bcrypt to hash passwords for new accounts

// Helper to convert undefined to null to prevent MySQL crashes
const safeVal = (val) => val === undefined ? null : val;

// GET ALL DENTISTS / STAFF
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM dentists');
    const formattedDentists = rows.map(d => ({
      ...d,
      days: typeof d.schedule_days === 'string' ? JSON.parse(d.schedule_days) : (d.schedule_days || []),
      operatingHours: typeof d.operating_hours === 'string' ? JSON.parse(d.operating_hours) : (d.operating_hours || { start: '09:00', end: '17:00' }),
      lunch: typeof d.lunch === 'string' ? JSON.parse(d.lunch) : (d.lunch || { start: '', end: '' }),
      breaks: typeof d.breaks === 'string' ? JSON.parse(d.breaks) : (d.breaks || []),
      leaveDays: typeof d.leave_days === 'string' ? JSON.parse(d.leave_days) : (d.leave_days || []),
      name: d.name || `${d.first_name || ''} ${d.last_name || ''}`.trim()
    }));
    res.json(formattedDentists);
  } catch (err) {
    console.error("Error fetching dentists:", err);
    res.status(500).json({ error: err.message });
  }
});

// ADD NEW DENTIST OR AIDE (AND CREATE LOGIN ACCOUNT)
router.post('/', async (req, res) => {
  // We added 'password' and 'role' to what we extract from the frontend
  const { first_name, last_name, specialization, phone, email, days, operatingHours, lunch, breaks, leaveDays, status, password, role } = req.body;
  
  try {
    const fullName = `${first_name || ''} ${last_name || ''}`.trim() || 'Unnamed Staff';
    
    // 1. Check if the email is already in the users table to prevent duplicate account errors
    if (email) {
       const [existingUser] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
       if (existingUser.length > 0) {
           return res.status(400).json({ error: "An account with this email already exists." });
       }
    }

    // 2. Insert into the dentists (staff profile) table
    const sql = `INSERT INTO dentists (first_name, last_name, name, specialization, phone, email, schedule_days, operating_hours, lunch, breaks, leave_days, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const values = [
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
      status || 'Available'
    ];
    
    const [result] = await db.query(sql, values);
    const newStaffId = result.insertId;

    // 3. Automatically create their login credentials in the `users` table
    if (email) {
      // If the frontend didn't send a password, default to 'password123'
      const plainPassword = password || 'password123'; 
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(plainPassword, salt);
      
      // Determine the role: use the role sent from frontend, or guess based on specialization
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
  const { first_name, last_name, specialization, phone, email, days, operatingHours, lunch, breaks, leaveDays, status } = req.body;
  try {
    const fullName = `${first_name || ''} ${last_name || ''}`.trim() || 'Unnamed Staff';
    
    const sql = `UPDATE dentists SET first_name = ?, last_name = ?, name = ?, specialization = ?, phone = ?, email = ?, schedule_days = ?, operating_hours = ?, lunch = ?, breaks = ?, leave_days = ?, status = ? WHERE id = ?`;
    const values = [
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
      id
    ];
    
    const [result] = await db.query(sql, values);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Staff member not found' });
    res.json({ message: 'Staff updated successfully' });
  } catch (err) {
    console.error("Error updating staff:", err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE DENTIST / STAFF
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await db.query('DELETE FROM dentists WHERE id = ?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Staff member not found' });
    
    // Also delete their login account from users table
    await db.query('DELETE FROM users WHERE dentist_id = ?', [id]);

    res.json({ message: 'Staff deleted successfully' });
  } catch (err) {
    console.error("Error deleting staff:", err);
    res.status(500).json({ error: "Cannot delete staff member with active appointments or records." });
  }
});

module.exports = router;