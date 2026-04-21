const express = require('express');
const router = express.Router();
const db = require('../db'); 
const bcrypt = require('bcrypt');
const { enforceAdminAccess } = require('../utils/accessControl');

// Helper to convert undefined to null to prevent MySQL crashes
const safeVal = (val) => val === undefined ? null : val;

let hasMiddleNameColumnCache = null;
let hasIsArchivedColumnCache = null;
let hasPasswordChangeRequiredColumnCache = null;
let hasUsersClinicColumnCache = null;
let hasUsersBranchColumnCache = null;

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

async function hasPasswordChangeRequiredColumn() {
  if (hasPasswordChangeRequiredColumnCache !== null) {
    return hasPasswordChangeRequiredColumnCache;
  }

  try {
    const [rows] = await db.query("SHOW COLUMNS FROM users LIKE 'password_change_required'");
    hasPasswordChangeRequiredColumnCache = rows.length > 0;
  } catch (_err) {
    hasPasswordChangeRequiredColumnCache = false;
  }

  return hasPasswordChangeRequiredColumnCache;
}

async function hasUsersClinicColumn() {
  if (hasUsersClinicColumnCache !== null) {
    return hasUsersClinicColumnCache;
  }

  try {
    const [rows] = await db.query("SHOW COLUMNS FROM users LIKE 'clinic_id'");
    hasUsersClinicColumnCache = rows.length > 0;
  } catch (_err) {
    hasUsersClinicColumnCache = false;
  }

  return hasUsersClinicColumnCache;
}

async function hasUsersBranchColumn() {
  if (hasUsersBranchColumnCache !== null) {
    return hasUsersBranchColumnCache;
  }

  try {
    const [rows] = await db.query("SHOW COLUMNS FROM users LIKE 'branch_id'");
    hasUsersBranchColumnCache = rows.length > 0;
  } catch (_err) {
    hasUsersBranchColumnCache = false;
  }

  return hasUsersBranchColumnCache;
}

function normalizeActorRole(req) {
  const normalized = String(req.headers['x-user-role'] || '').trim().toLowerCase();
  if (normalized === 'super_admin') return 'superadmin';
  if (normalized === 'global_admin') return 'globaladmin';
  return normalized;
}

function actorDentistId(req) {
  const parsed = Number.parseInt(String(req.headers['x-user-dentist-id'] || ''), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

function actorUserId(req) {
  const parsed = Number.parseInt(String(req.headers['x-user-id'] || ''), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

function toPositiveInt(value) {
  const parsed = Number.parseInt(String(value || ''), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

function hasTenantScopeViolation(scope, clinicId, branchId) {
  if (!scope?.scoped) return null;

  if (scope.clinicId && clinicId && Number(scope.clinicId) !== Number(clinicId)) {
    return 'You can only manage users within your assigned clinic.';
  }

  if (scope.branchId && branchId && Number(scope.branchId) !== Number(branchId)) {
    return 'You can only manage users within your assigned branch.';
  }

  return null;
}

async function resolveClinicIdFromBranch(branchId) {
  const parsedBranchId = toPositiveInt(branchId);
  if (!parsedBranchId) return null;

  try {
    const [rows] = await db.query(
      `SELECT clinic_id FROM clinic_branches WHERE id = ? LIMIT 1`,
      [parsedBranchId]
    );
    if (!rows.length) return null;
    return toPositiveInt(rows[0]?.clinic_id);
  } catch (_err) {
    return null;
  }
}

async function getActorTenantScope(req) {
  const role = normalizeActorRole(req);
  const userId = actorUserId(req);

  if (!userId) {
    return {
      role,
      userId: null,
      clinicId: null,
      branchId: null,
      scoped: false,
    };
  }

  const supportsUsersClinic = await hasUsersClinicColumn();
  const supportsUsersBranch = await hasUsersBranchColumn();
  if (!supportsUsersClinic && !supportsUsersBranch) {
    return {
      role,
      userId,
      clinicId: null,
      branchId: null,
      scoped: false,
    };
  }

  const selectColumns = [];
  if (supportsUsersClinic) selectColumns.push('clinic_id');
  if (supportsUsersBranch) selectColumns.push('branch_id');

  try {
    const [rows] = await db.query(
      `SELECT ${selectColumns.join(', ')} FROM users WHERE id = ? LIMIT 1`,
      [userId]
    );

    const row = rows[0] || {};
    const clinicId = supportsUsersClinic ? toPositiveInt(row.clinic_id) : null;
    const branchId = supportsUsersBranch ? toPositiveInt(row.branch_id) : null;

    if (role === 'globaladmin') {
      return {
        role,
        userId,
        clinicId,
        branchId,
        scoped: false,
      };
    }

    const scopedRoles = new Set(['superadmin', 'dentist', 'aide']);
    const scoped = scopedRoles.has(role) && Boolean(clinicId || branchId);

    return {
      role,
      userId,
      clinicId,
      branchId,
      scoped,
    };
  } catch (_err) {
    return {
      role,
      userId,
      clinicId: null,
      branchId: null,
      scoped: false,
    };
  }
}

function parseJsonOrFallback(value, fallback) {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch (_err) {
      return fallback;
    }
  }
  return value;
}

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

// GET ALL DENTISTS / STAFF (Updated with filtering)
router.get('/', async (req, res) => {
  try {
    const { type } = req.query;
    const actorScope = await getActorTenantScope(req);
    const supportsUsersClinic = await hasUsersClinicColumn();
    const supportsUsersBranch = await hasUsersBranchColumn();
    const needsOwnerJoin = actorScope.scoped && (
      (actorScope.clinicId && supportsUsersClinic) ||
      (actorScope.branchId && supportsUsersBranch)
    );

    const whereClauses = [];
    const params = [];

    if (await hasIsArchivedColumn()) {
      whereClauses.push('COALESCE(is_archived, 0) = 0');
    }

    if (actorScope.scoped) {
      if (actorScope.clinicId && supportsUsersClinic) {
        whereClauses.push('owner.clinic_id = ?');
        params.push(actorScope.clinicId);
      }

      if (actorScope.branchId && supportsUsersBranch) {
        whereClauses.push('owner.branch_id = ?');
        params.push(actorScope.branchId);
      }
    }
    
    if (type === 'dentist') {
      whereClauses.push("specialization != 'Dental Aide'");
    } else if (type === 'aide') {
      whereClauses.push("specialization = 'Dental Aide'");
    }

    let query = 'SELECT d.* FROM dentists d';
    if (needsOwnerJoin) {
      query += `
        LEFT JOIN (
          SELECT dentist_id, MAX(clinic_id) AS clinic_id, MAX(branch_id) AS branch_id
          FROM users
          GROUP BY dentist_id
        ) owner ON owner.dentist_id = d.id`;
    }

    if (whereClauses.length > 0) {
      query += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    const [rows] = await db.query(query, params);
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
    const supportsUsersClinic = await hasUsersClinicColumn();
    const supportsUsersBranch = await hasUsersBranchColumn();

    let assignedClinicId = toPositiveInt(clinic_id);
    let assignedBranchId = toPositiveInt(branch_id);

    if (actorScope.scoped) {
      // FORCE the assignment to the actor's scope to prevent mismatch errors
      assignedClinicId = actorScope.clinicId;
      assignedBranchId = actorScope.branchId;
    } else if (!assignedClinicId && assignedBranchId) {
      assignedClinicId = await resolveClinicIdFromBranch(assignedBranchId);
    }

    const tenantViolation = hasTenantScopeViolation(actorScope, assignedClinicId, assignedBranchId);
    if (tenantViolation) {
      return res.status(403).json({ error: tenantViolation });
    }

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

    let generatedPassword = null;
    if (email) {
      generatedPassword = generateTemporaryPassword();
      const plainPassword = generatedPassword;
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(plainPassword, salt);
      const supportsPasswordChangeRequired = await hasPasswordChangeRequiredColumn();
      
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
    }

    res.status(201).json({
      id: newStaffId,
      message: 'Staff profile and login account created successfully.',
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
    const actorRole = normalizeActorRole(req);
    const actorDentist = actorDentistId(req);
    const supportsMiddleName = await hasMiddleNameColumn();

    if (actorRole !== 'dentist' && actorRole !== 'superadmin' && actorRole !== 'globaladmin') {
      return res.status(403).json({ error: 'You are not allowed to update staff records.' });
    }

    if (actorRole === 'superadmin' || actorRole === 'globaladmin') {
      const access = await enforceAdminAccess(req, res, {
        allowGlobalAdmin: true,
        allowSuperAdmin: true,
        requireApprovedSuperAdmin: true,
      });
      if (!access.ok) return;
    }

    const [existingRows] = await db.query('SELECT * FROM dentists WHERE id = ? LIMIT 1', [id]);
    if (existingRows.length === 0) return res.status(404).json({ message: 'Staff member not found' });

    if (actorRole === 'dentist' && actorDentist && Number(actorDentist) !== Number(id)) {
      return res.status(403).json({ error: 'Dentists can only edit their own schedule profile.' });
    }

    const canEditSchedule = actorRole === 'dentist';

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
    const access = await enforceAdminAccess(req, res, {
      allowGlobalAdmin: true,
      allowSuperAdmin: true,
      requireApprovedSuperAdmin: true,
    });
    if (!access.ok) return;

    const [result] = await db.query('DELETE FROM dentists WHERE id = ?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Staff member not found' });
    await db.query('DELETE FROM users WHERE dentist_id = ?', [id]);
    res.json({ message: 'Staff deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: "Cannot delete staff member with active appointments." });
  }
});

module.exports = router;