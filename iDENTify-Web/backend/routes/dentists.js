const express = require('express');
const router = express.Router();
const db = require('../db'); 
const bcrypt = require('bcrypt');
const { 
  enforceAdminAccess, 
  getActorTenantScope, 
  appendTenantWhereClauses,
  hasColumn,
  toPositiveInt
} = require('../utils/accessControl');
const { sendEmail } = require('../utils/mailer');

// Helper to convert undefined to null to prevent MySQL crashes
const safeVal = (val) => val === undefined ? null : val;

const safeJsonParse = (data, fallback) => {
  if (!data) return fallback;
  try {
    return typeof data === "string" ? JSON.parse(data) : data;
  } catch (e) {
    return fallback;
  }
};

function generateTemporaryPassword(length = 12) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
  let generated = '';
  for (let i = 0; i < length; i += 1) {
    generated += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
  }
  return generated;
}

function composeStaffName(firstName, middleName, lastName) {
  return [firstName, middleName, lastName]
    .map((part) => String(part || '').trim())
    .filter(Boolean)
    .join(' ') || 'Unnamed Staff';
}

// GET ALL DENTISTS / STAFF (Updated with strict filtering)
router.get('/', async (req, res) => {
  try {
    const { type, clinic_id, branch_id } = req.query;
    const actorScope = await getActorTenantScope(req);
    
    // Check for column support
    const supportsIsArchived = await hasColumn('dentists', 'is_archived');
    const supportsUsersClinic = await hasColumn('users', 'clinic_id');
    const supportsUsersBranch = await hasColumn('users', 'branch_id');

    const whereClauses = [];
    const params = [];

    if (supportsIsArchived) {
      whereClauses.push('COALESCE(d.is_archived, 0) = 0');
    }

    // Apply actor-based tenant scoping
    if (actorScope.scoped) {
      appendTenantWhereClauses({
        whereClauses,
        params,
        scope: actorScope,
        clinicExpression: supportsUsersClinic ? 'owner.clinic_id' : null,
        branchExpression: supportsUsersBranch ? 'owner.branch_id' : null,
      });
    }

    // NEW: Also apply explicit query parameter filters (useful for mobile app/patient booking)
    const qClinicId = toPositiveInt(clinic_id);
    const qBranchId = toPositiveInt(branch_id);

    if (qClinicId && supportsUsersClinic) {
      whereClauses.push('owner.clinic_id = ?');
      params.push(qClinicId);
    }
    if (qBranchId && supportsUsersBranch) {
      whereClauses.push('owner.branch_id = ?');
      params.push(qBranchId);
    }
    
    if (type === 'dentist') {
      whereClauses.push("d.specialization != 'Dental Aide'");
    } else if (type === 'aide') {
      whereClauses.push("d.specialization = 'Dental Aide'");
    }

    let query = 'SELECT d.*';
    
    if (supportsUsersClinic || supportsUsersBranch) {
       query += `, owner.clinic_id, owner.branch_id FROM dentists d LEFT JOIN (
          SELECT dentist_id, MAX(clinic_id) AS clinic_id, MAX(branch_id) AS branch_id
          FROM users
          GROUP BY dentist_id
        ) owner ON owner.dentist_id = d.id`;
    } else {
       query += ' FROM dentists d';
    }

    if (whereClauses.length > 0) {
      query += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    const [rows] = await db.query(query, params);
    const formattedDentists = rows.map(d => ({
      ...d,
      days: safeJsonParse(d.schedule_days, []),
      operatingHours: safeJsonParse(d.operating_hours, { start: '09:00', end: '17:00' }),
      lunch: safeJsonParse(d.lunch, { start: '', end: '' }),
      breaks: safeJsonParse(d.breaks, []),
      leaveDays: safeJsonParse(d.leave_days, []),
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
  const {
    first_name,
    middle_name,
    last_name,
    specialization,
    phone,
    email,
    days,
    operatingHours,
    lunch,
    breaks,
    leaveDays,
    status,
    password,
    role,
    clinic_id,
    branch_id,
  } = req.body;
  
  try {
    const access = await enforceAdminAccess(req, res, {
      allowGlobalAdmin: true,
      allowSuperAdmin: true,
      requireApprovedSuperAdmin: true,
    });
    if (!access.ok) return;

    const actorScope = await getActorTenantScope(req);
    const supportsUsersClinic = await hasColumn('users', 'clinic_id');
    const supportsUsersBranch = await hasColumn('users', 'branch_id');
    const supportsMiddleName = await hasColumn('dentists', 'middle_name');

    let assignedClinicId = toPositiveInt(clinic_id);
    let assignedBranchId = toPositiveInt(branch_id);

    if (actorScope.scoped) {
      // FORCE the assignment to the actor's scope to prevent mismatch errors
      assignedClinicId = actorScope.clinicId;
      assignedBranchId = actorScope.branchId;
    }

    const fullName = composeStaffName(first_name, middle_name, last_name);
    
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

    let generatedPassword = null;
    if (email) {
      generatedPassword = generateTemporaryPassword();
      const plainPassword = generatedPassword;
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(plainPassword, salt);
      const supportsPasswordChangeRequired = await hasColumn('users', 'password_change_required');
      
      let userRole = 'dentist';
      if (role) {
          userRole = role.toLowerCase();
      } else if (specialization && specialization.toLowerCase().includes('aide')) {
          userRole = 'aide';
      }

      const userColumns = [
        'email',
        'password_hash',
        'full_name',
        'role',
        'dentist_id',
        'is_verified',
      ];
      const userValues = [
        email,
        hashedPassword,
        fullName,
        userRole,
        newStaffId,
        1,
      ];

      if (supportsPasswordChangeRequired) {
        userColumns.push('password_change_required');
        userValues.push(1);
      }

      if (supportsUsersClinic) {
        userColumns.push('clinic_id');
        userValues.push(assignedClinicId || null);
      }

      if (supportsUsersBranch) {
        userColumns.push('branch_id');
        userValues.push(assignedBranchId || null);
      }

      const userSql = `INSERT INTO users (${userColumns.join(', ')}) VALUES (${userColumns.map(() => '?').join(', ')})`;
      await db.query(userSql, userValues);

      try {
        await sendEmail({
          to: email,
          subject: 'Your iDENTify Staff Account Credentials',
          text: `Hello ${fullName},\n\nYour iDENTify staff account has been created.\n\nLogin URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}\nEmail: ${email}\nTemporary Password: ${plainPassword}\n\nPlease change your password after your first login.\n\nBest regards,\niDENTify Team`,
          html: `
            <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
              <h2 style="color: #2c3e50;">Welcome to iDENTify!</h2>
              <p>Hello <strong>${fullName}</strong>,</p>
              <p>Your iDENTify staff account has been created successfully. You can now log in using the credentials below:</p>
              <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p style="margin: 5px 0;"><strong>Email:</strong> ${email}</p>
                <p style="margin: 5px 0;"><strong>Temporary Password:</strong> <code style="background: #eee; padding: 2px 5px; border-radius: 3px;">${plainPassword}</code></p>
              </div>
              <p>For security reasons, you will be required to change your password upon your first login.</p>
              <p><a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}" style="display: inline-block; background: #3498db; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Login to Your Account</a></p>
              <p style="color: #7f8c8d; font-size: 0.9em; margin-top: 30px;">This is an automated message. Please do not reply.</p>
            </div>
          `
        });
      } catch (mailErr) {
        console.error("Failed to send credentials email:", mailErr);
      }
    }

    res.status(201).json({
      id: newStaffId,
      message: 'Staff profile created and credentials have been sent to their email.',
      generated_password: generatedPassword,
      password_is_temporary: Boolean(generatedPassword),
    });
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
    const actorScope = await getActorTenantScope(req);
    const supportsMiddleName = await hasColumn('dentists', 'middle_name');
    const supportsUsersClinic = await hasColumn('users', 'clinic_id');
    const supportsUsersBranch = await hasColumn('users', 'branch_id');

    if (actorScope.role !== 'dentist' && actorScope.role !== 'superadmin' && actorScope.role !== 'globaladmin') {
      return res.status(403).json({ error: 'You are not allowed to update staff records.' });
    }

    // CHECK TENANT SCOPE for the target dentist
    const checkWhere = ['d.id = ?'];
    const checkParams = [id];
    if (actorScope.scoped) {
        appendTenantWhereClauses({
            whereClauses: checkWhere,
            params: checkParams,
            scope: actorScope,
            clinicExpression: 'owner.clinic_id',
            branchExpression: 'owner.branch_id'
        });
    }

    const [existingRows] = await db.query(`
        SELECT d.*, owner.clinic_id, owner.branch_id 
        FROM dentists d 
        LEFT JOIN (
          SELECT dentist_id, MAX(clinic_id) AS clinic_id, MAX(branch_id) AS branch_id
          FROM users
          GROUP BY dentist_id
        ) owner ON owner.dentist_id = d.id
        WHERE ${checkWhere.join(' AND ')} LIMIT 1
    `, checkParams);

    if (existingRows.length === 0) return res.status(404).json({ message: 'Staff member not found or access denied.' });

    if (actorScope.role === 'dentist' && actorScope.userId) {
       // Dentists can only edit themselves
       const [userRow] = await db.query('SELECT dentist_id FROM users WHERE id = ?', [actorScope.userId]);
       if (!userRow.length || Number(userRow[0].dentist_id) !== Number(id)) {
           return res.status(403).json({ error: 'Dentists can only edit their own profile.' });
       }
    }

    if (actorScope.role === 'superadmin' || actorScope.role === 'globaladmin') {
      const access = await enforceAdminAccess(req, res, {
        allowGlobalAdmin: true,
        allowSuperAdmin: true,
        requireApprovedSuperAdmin: true,
      });
      if (!access.ok) return;

      if (supportsUsersClinic || supportsUsersBranch) {
        const updates = [];
        const updateValues = [];
        
        if (supportsUsersClinic && Object.prototype.hasOwnProperty.call(req.body, 'clinic_id')) {
          updates.push('clinic_id = ?');
          updateValues.push(toPositiveInt(req.body.clinic_id) || null);
        }
        
        if (supportsUsersBranch && Object.prototype.hasOwnProperty.call(req.body, 'branch_id')) {
          updates.push('branch_id = ?');
          updateValues.push(toPositiveInt(req.body.branch_id) || null);
        }

        if (updates.length > 0) {
          updateValues.push(id);
          await db.query(`UPDATE users SET ${updates.join(', ')} WHERE dentist_id = ?`, updateValues);
        }
      }
    }

    const canEditSchedule = actorScope.role === 'dentist' || actorScope.role === 'superadmin' || actorScope.role === 'globaladmin';

    const currentStaff = existingRows[0];
    const nextFirstName = Object.prototype.hasOwnProperty.call(req.body, 'first_name') ? first_name : currentStaff.first_name;
    const nextMiddleName = Object.prototype.hasOwnProperty.call(req.body, 'middle_name') ? middle_name : currentStaff.middle_name;
    const nextLastName = Object.prototype.hasOwnProperty.call(req.body, 'last_name') ? last_name : currentStaff.last_name;
    const nextSpecialization = Object.prototype.hasOwnProperty.call(req.body, 'specialization') ? specialization : currentStaff.specialization;
    const nextPhone = Object.prototype.hasOwnProperty.call(req.body, 'phone') ? phone : currentStaff.phone;
    const nextEmail = Object.prototype.hasOwnProperty.call(req.body, 'email') ? email : currentStaff.email;
    const nextStatus = Object.prototype.hasOwnProperty.call(req.body, 'status') ? status : currentStaff.status;
    const fullName = composeStaffName(nextFirstName, nextMiddleName, nextLastName);

    const currentDays = parseJsonOrFallback(currentStaff.schedule_days, []);
    const currentOperatingHours = parseJsonOrFallback(currentStaff.operating_hours, { start: '09:00', end: '17:00' });
    const currentLunch = parseJsonOrFallback(currentStaff.lunch, { start: '', end: '' });
    const currentBreaks = parseJsonOrFallback(currentStaff.breaks, []);
    const currentLeaveDays = parseJsonOrFallback(currentStaff.leave_days, []);

    const nextDays = canEditSchedule ? (Array.isArray(days) ? days : currentDays) : currentDays;
    const nextOperatingHours = canEditSchedule
      ? (operatingHours && typeof operatingHours === 'object' ? operatingHours : currentOperatingHours)
      : currentOperatingHours;
    const nextLunch = canEditSchedule
      ? (lunch && typeof lunch === 'object' ? lunch : currentLunch)
      : currentLunch;
    const nextBreaks = canEditSchedule ? (Array.isArray(breaks) ? breaks : currentBreaks) : currentBreaks;
    const nextLeaveDays = canEditSchedule ? (Array.isArray(leaveDays) ? leaveDays : currentLeaveDays) : currentLeaveDays;

    const sql = supportsMiddleName
      ? `UPDATE dentists SET first_name = ?, middle_name = ?, last_name = ?, name = ?, specialization = ?, phone = ?, email = ?, schedule_days = ?, operating_hours = ?, lunch = ?, breaks = ?, leave_days = ?, status = ? WHERE id = ?`
      : `UPDATE dentists SET first_name = ?, last_name = ?, name = ?, specialization = ?, phone = ?, email = ?, schedule_days = ?, operating_hours = ?, lunch = ?, breaks = ?, leave_days = ?, status = ? WHERE id = ?`;

    const values = supportsMiddleName
      ? [safeVal(nextFirstName), safeVal(nextMiddleName), safeVal(nextLastName), fullName, safeVal(nextSpecialization), safeVal(nextPhone), safeVal(nextEmail), JSON.stringify(nextDays || []), JSON.stringify(nextOperatingHours || {}), JSON.stringify(nextLunch || {}), JSON.stringify(nextBreaks || []), JSON.stringify(nextLeaveDays || []), nextStatus || 'Available', id]
      : [safeVal(nextFirstName), safeVal(nextLastName), fullName, safeVal(nextSpecialization), safeVal(nextPhone), safeVal(nextEmail), JSON.stringify(nextDays || []), JSON.stringify(nextOperatingHours || {}), JSON.stringify(nextLunch || {}), JSON.stringify(nextBreaks || []), JSON.stringify(nextLeaveDays || []), nextStatus || 'Available', id];
    
    const [result] = await db.query(sql, values);
    res.json({ message: 'Staff updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE DENTIST / STAFF
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const access = await enforceAdminAccess(req, res, {
      allowGlobalAdmin: true,
      allowSuperAdmin: true,
      requireApprovedSuperAdmin: true,
    });
    if (!access.ok) return;

    const actorScope = await getActorTenantScope(req);
    const checkWhere = ['d.id = ?'];
    const checkParams = [id];
    if (actorScope.scoped) {
        appendTenantWhereClauses({
            whereClauses: checkWhere,
            params: checkParams,
            scope: actorScope,
            clinicExpression: 'owner.clinic_id',
            branchExpression: 'owner.branch_id'
        });
    }

    const [existing] = await db.query(`
        SELECT d.id FROM dentists d 
        LEFT JOIN (
          SELECT dentist_id, MAX(clinic_id) AS clinic_id, MAX(branch_id) AS branch_id
          FROM users
          GROUP BY dentist_id
        ) owner ON owner.dentist_id = d.id
        WHERE ${checkWhere.join(' AND ')} LIMIT 1
    `, checkParams);

    if (existing.length === 0) return res.status(404).json({ message: 'Staff member not found or access denied.' });

    const [result] = await db.query('DELETE FROM dentists WHERE id = ?', [id]);
    await db.query('DELETE FROM users WHERE dentist_id = ?', [id]);
    res.json({ message: 'Staff deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: "Cannot delete staff member with active appointments." });
  }
});

module.exports = router;