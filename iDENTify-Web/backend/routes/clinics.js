const express = require('express');
const router = express.Router();
const db = require('../db');
const { enforceAdminAccess } = require('../utils/accessControl');

const columnSupportCache = new Map();
let hasLoginAuditEventsTableCache = null;

function toOptionalPositiveInt(value) {
  const parsed = Number.parseInt(String(value || ''), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

function toBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  const normalized = String(value).trim().toLowerCase();
  return ['1', 'true', 'yes', 'on'].includes(normalized);
}

function cleanText(value, max = 255) {
  const text = String(value || '').trim();
  return text ? text.slice(0, max) : '';
}

function normalizeLifecycleStatusInput(value, fallback = null) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return fallback;
  if (normalized === 'active') return 'Active';
  if (normalized === 'suspended') return 'Suspended';
  if (normalized === 'deactivated') return 'Deactivated';
  return fallback;
}

function deriveStatusFromIsActive(value) {
  return Number(value || 0) === 1 ? 'Active' : 'Deactivated';
}

function mapLifecycleRow(row, supportsStatusColumn) {
  const fallbackStatus = deriveStatusFromIsActive(row.is_active);
  const status = supportsStatusColumn
    ? normalizeLifecycleStatusInput(row.status, fallbackStatus)
    : fallbackStatus;

  return {
    ...row,
    status,
    is_active: Number(row.is_active || 0) === 1,
  };
}

function buildStatusExpr(alias, supportsStatusColumn) {
  const prefix = alias ? `${alias}.` : '';
  if (!supportsStatusColumn) {
    return `CASE WHEN ${prefix}is_active = 1 THEN 'Active' ELSE 'Deactivated' END`;
  }

  return `COALESCE(NULLIF(TRIM(${prefix}status), ''), CASE WHEN ${prefix}is_active = 1 THEN 'Active' ELSE 'Deactivated' END)`;
}

async function hasTableColumn(tableName, columnName) {
  const cacheKey = `${tableName}.${columnName}`;
  if (columnSupportCache.has(cacheKey)) {
    return columnSupportCache.get(cacheKey);
  }

  try {
    const [rows] = await db.query(`SHOW COLUMNS FROM ${tableName} LIKE ?`, [columnName]);
    const supported = rows.length > 0;
    columnSupportCache.set(cacheKey, supported);
    return supported;
  } catch (_err) {
    columnSupportCache.set(cacheKey, false);
    return false;
  }
}

async function hasLoginAuditEventsTable() {
  if (hasLoginAuditEventsTableCache !== null) {
    return hasLoginAuditEventsTableCache;
  }

  try {
    const [rows] = await db.query("SHOW TABLES LIKE 'login_audit_events'");
    hasLoginAuditEventsTableCache = rows.length > 0;
  } catch (_err) {
    hasLoginAuditEventsTableCache = false;
  }

  return hasLoginAuditEventsTableCache;
}

async function getClinicColumnSupport() {
  const [status, suspended_at, deactivated_at, archived_at] = await Promise.all([
    hasTableColumn('clinics', 'status'),
    hasTableColumn('clinics', 'suspended_at'),
    hasTableColumn('clinics', 'deactivated_at'),
    hasTableColumn('clinics', 'archived_at'),
  ]);

  return { status, suspended_at, deactivated_at, archived_at };
}

async function getBranchColumnSupport() {
  const [status, suspended_at, deactivated_at, archived_at, address] = await Promise.all([
    hasTableColumn('clinic_branches', 'status'),
    hasTableColumn('clinic_branches', 'suspended_at'),
    hasTableColumn('clinic_branches', 'deactivated_at'),
    hasTableColumn('clinic_branches', 'archived_at'),
    hasTableColumn('clinic_branches', 'address'),
  ]);

  return { status, suspended_at, deactivated_at, archived_at, address };
}

function buildLifecycleUpdateClauses({ support, nextStatus, archiveMode = 'none' }) {
  const clauses = ['is_active = ?'];
  const values = [nextStatus === 'Active' ? 1 : 0];

  if (support.status) {
    clauses.push('status = ?');
    values.push(nextStatus);
  }

  if (support.suspended_at) {
    clauses.push(nextStatus === 'Suspended' ? 'suspended_at = NOW()' : 'suspended_at = NULL');
  }

  if (support.deactivated_at) {
    clauses.push(nextStatus === 'Deactivated' ? 'deactivated_at = NOW()' : 'deactivated_at = NULL');
  }

  if (support.archived_at) {
    if (archiveMode === 'archive') {
      clauses.push('archived_at = NOW()');
    } else if (archiveMode === 'restore') {
      clauses.push('archived_at = NULL');
    }
  }

  return { clauses, values };
}

async function requireGlobalAdmin(req, res) {
  const access = await enforceAdminAccess(req, res, {
    allowGlobalAdmin: true,
    allowSuperAdmin: true,
    requireApprovedSuperAdmin: true,
  });

  return access.ok;
}

async function requireSystemAdmin(req, res) {
  const access = await enforceAdminAccess(req, res, {
    allowGlobalAdmin: true,
    allowSuperAdmin: false,
    requireApprovedSuperAdmin: false,
  });

  return access.ok;
}

async function selectClinicById(clinicId, support) {
  const columns = ['id', 'name', 'code', 'is_active'];
  if (support.status) columns.push('status');
  if (support.suspended_at) columns.push('suspended_at');
  if (support.deactivated_at) columns.push('deactivated_at');
  if (support.archived_at) columns.push('archived_at');
  columns.push('created_at', 'updated_at');

  const [rows] = await db.query(
    `SELECT ${columns.join(', ')} FROM clinics WHERE id = ? LIMIT 1`,
    [clinicId]
  );

  return rows[0] || null;
}

async function selectBranchById(branchId, support) {
  const columns = ['id', 'clinic_id', 'name', 'code', 'is_active'];
  if (support.address) columns.push('address');
  if (support.status) columns.push('status');
  if (support.suspended_at) columns.push('suspended_at');
  if (support.deactivated_at) columns.push('deactivated_at');
  if (support.archived_at) columns.push('archived_at');
  columns.push('created_at', 'updated_at');

  const [rows] = await db.query(
    `SELECT ${columns.join(', ')} FROM clinic_branches WHERE id = ? LIMIT 1`,
    [branchId]
  );

  return rows[0] || null;
}

router.get('/discover', async (_req, res) => {
  try {
    const clinicSupport = await getClinicColumnSupport();
    const branchSupport = await getBranchColumnSupport();

    const clinicStatusExpr = buildStatusExpr('', clinicSupport.status);
    const branchStatusExpr = buildStatusExpr('', branchSupport.status);

    const [clinicRows] = await db.query(
      `SELECT id, name
       FROM clinics
       WHERE ${clinicStatusExpr} = 'Active'
       ORDER BY name ASC`
    );

    const [branchRows] = await db.query(
      `SELECT id, clinic_id, name
       FROM clinic_branches
       WHERE ${branchStatusExpr} = 'Active'
       ORDER BY name ASC`
    );

    const branchesByClinic = new Map();
    branchRows.forEach((branch) => {
      const clinicId = Number(branch.clinic_id);
      if (!branchesByClinic.has(clinicId)) {
        branchesByClinic.set(clinicId, []);
      }
      branchesByClinic.get(clinicId).push({
        id: branch.id,
        name: branch.name,
      });
    });

    const clinics = clinicRows.map((clinic) => ({
      id: clinic.id,
      name: clinic.name,
      branches: branchesByClinic.get(Number(clinic.id)) || [],
    }));

    return res.json(clinics);
  } catch (error) {
    console.error('Error loading clinic discovery data:', error);
    return res.status(500).json({ message: 'Failed to load clinic discovery data.' });
  }
});

router.get('/summary', async (req, res) => {
  if (!(await requireGlobalAdmin(req, res))) return;

  try {
    const clinicSupport = await getClinicColumnSupport();
    const branchSupport = await getBranchColumnSupport();
    const hasAuditEvents = await hasLoginAuditEventsTable();

    const clinicStatusExpr = buildStatusExpr('c', clinicSupport.status);
    const branchStatusExpr = buildStatusExpr('cb', branchSupport.status);

    const [clinicCountRows] = await db.query(
      `SELECT
         COUNT(*) AS total_clinics,
         SUM(CASE WHEN ${clinicStatusExpr} = 'Active' THEN 1 ELSE 0 END) AS active_clinics,
         SUM(CASE WHEN ${clinicStatusExpr} = 'Suspended' THEN 1 ELSE 0 END) AS suspended_clinics,
         SUM(CASE WHEN ${clinicStatusExpr} = 'Deactivated' THEN 1 ELSE 0 END) AS deactivated_clinics
       FROM clinics c`
    );

    const [branchesPerClinicRows] = await db.query(
      `SELECT
         c.id,
         c.name,
         COUNT(cb.id) AS total_branches,
         SUM(CASE WHEN cb.id IS NOT NULL AND ${branchStatusExpr} = 'Active' THEN 1 ELSE 0 END) AS active_branches,
         SUM(CASE WHEN cb.id IS NOT NULL AND ${branchStatusExpr} = 'Suspended' THEN 1 ELSE 0 END) AS suspended_branches,
         SUM(CASE WHEN cb.id IS NOT NULL AND ${branchStatusExpr} = 'Deactivated' THEN 1 ELSE 0 END) AS deactivated_branches
       FROM clinics c
       LEFT JOIN clinic_branches cb ON cb.clinic_id = c.id
       GROUP BY c.id, c.name
       ORDER BY c.name ASC`
    );

    const [growthRows] = await db.query(
      `SELECT
         (SELECT COUNT(*) FROM clinics WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)) AS new_clinics_30d,
         (SELECT COUNT(*) FROM clinic_branches WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)) AS new_branches_30d`
    );

    const activeUsersByClinic = new Map();
    let totalActiveUsers30d = 0;
    if (hasAuditEvents) {
      const [activityRows] = await db.query(
        `SELECT
           clinic_id,
           COUNT(DISTINCT user_id) AS active_users_30d
         FROM login_audit_events
         WHERE outcome = 'success'
           AND user_id IS NOT NULL
           AND clinic_id IS NOT NULL
           AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
         GROUP BY clinic_id`
      );

      activityRows.forEach((row) => {
        const count = Number(row.active_users_30d || 0);
        activeUsersByClinic.set(Number(row.clinic_id), count);
        totalActiveUsers30d += count;
      });
    }

    return res.json({
      totals: {
        total_clinics: Number(clinicCountRows[0]?.total_clinics || 0),
        active_clinics: Number(clinicCountRows[0]?.active_clinics || 0),
        suspended_clinics: Number(clinicCountRows[0]?.suspended_clinics || 0),
        deactivated_clinics: Number(clinicCountRows[0]?.deactivated_clinics || 0),
      },
      growth: {
        new_clinics_30d: Number(growthRows[0]?.new_clinics_30d || 0),
        new_branches_30d: Number(growthRows[0]?.new_branches_30d || 0),
        active_users_30d: Number(totalActiveUsers30d || 0),
      },
      branches_per_clinic: branchesPerClinicRows.map((row) => ({
        id: row.id,
        name: row.name,
        total_branches: Number(row.total_branches || 0),
        active_branches: Number(row.active_branches || 0),
        suspended_branches: Number(row.suspended_branches || 0),
        deactivated_branches: Number(row.deactivated_branches || 0),
        active_users_30d: Number(activeUsersByClinic.get(Number(row.id)) || 0),
      })),
    });
  } catch (error) {
    console.error('Error loading clinic summary:', error);
    return res.status(500).json({ message: 'Failed to load clinic summary.' });
  }
});

router.get('/', async (req, res) => {
  const includeInactive = toBoolean(req.query.includeInactive, false);
  const userId = toOptionalPositiveInt(req.headers['x-user-id']);
  const role = String(req.headers['x-user-role'] || '').trim().toLowerCase();

  try {
    const clinicSupport = await getClinicColumnSupport();
    const branchSupport = await getBranchColumnSupport();

    const clinicStatusExpr = buildStatusExpr('c', clinicSupport.status);
    const branchStatusExpr = buildStatusExpr('cb', branchSupport.status);

    const whereClauses = [];
    if (!includeInactive) {
      whereClauses.push(`${clinicStatusExpr} = 'Active'`);
    }

    // NEW: Restrict clinics to the assigned one for Super Admins
    if (['superadmin', 'dentist', 'aide'].includes(role) && userId) {
        try {
            const [colCheck] = await db.query("SHOW COLUMNS FROM users LIKE 'clinic_id'");
            if (colCheck.length > 0) {
                const [userRows] = await db.query('SELECT clinic_id FROM users WHERE id = ? LIMIT 1', [userId]);
                if (userRows.length && userRows[0].clinic_id) {
                    whereClauses.push(`c.id = ${Number(userRows[0].clinic_id)}`);
                } else {
                    whereClauses.push('1 = 0'); // No clinic assigned, show nothing
                }
            }
        } catch (err) {
            console.warn('Failed to apply tenant scope filter to clinics:', err);
        }
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const selectColumns = ['c.id', 'c.name', 'c.code', 'c.is_active'];
    if (clinicSupport.status) selectColumns.push('c.status');
    if (clinicSupport.suspended_at) selectColumns.push('c.suspended_at');
    if (clinicSupport.deactivated_at) selectColumns.push('c.deactivated_at');
    if (clinicSupport.archived_at) selectColumns.push('c.archived_at');
    selectColumns.push('c.created_at', 'c.updated_at');
    selectColumns.push('COUNT(cb.id) AS total_branches');
    selectColumns.push(`SUM(CASE WHEN cb.id IS NOT NULL AND ${branchStatusExpr} = 'Active' THEN 1 ELSE 0 END) AS active_branches`);

    const groupByColumns = ['c.id', 'c.name', 'c.code', 'c.is_active'];
    if (clinicSupport.status) groupByColumns.push('c.status');
    if (clinicSupport.suspended_at) groupByColumns.push('c.suspended_at');
    if (clinicSupport.deactivated_at) groupByColumns.push('c.deactivated_at');
    if (clinicSupport.archived_at) groupByColumns.push('c.archived_at');
    groupByColumns.push('c.created_at', 'c.updated_at');

    const [rows] = await db.query(
      `SELECT ${selectColumns.join(', ')}
       FROM clinics c
       LEFT JOIN clinic_branches cb ON cb.clinic_id = c.id
       ${whereSql}
       GROUP BY ${groupByColumns.join(', ')}
       ORDER BY c.name ASC`
    );

    return res.json(rows.map((row) => ({
      ...mapLifecycleRow(row, clinicSupport.status),
      total_branches: Number(row.total_branches || 0),
      active_branches: Number(row.active_branches || 0),
    })));
  } catch (error) {
    console.error('Error loading clinics:', error);
    return res.status(500).json({ message: 'Failed to load clinics.' });
  }
});

router.post('/', async (req, res) => {
  if (!(await requireGlobalAdmin(req, res))) return;

  const name = cleanText(req.body?.name);
  const code = cleanText(req.body?.code, 64);

  if (!name) {
    return res.status(400).json({ message: 'Clinic name is required.' });
  }

  try {
    const clinicSupport = await getClinicColumnSupport();

    let result;
    if (clinicSupport.status) {
      [result] = await db.query(
        `INSERT INTO clinics (name, code, is_active, status)
         VALUES (?, ?, 1, 'Active')`,
        [name, code || null]
      );
    } else {
      [result] = await db.query(
        `INSERT INTO clinics (name, code, is_active)
         VALUES (?, ?, 1)`,
        [name, code || null]
      );
    }

    const row = await selectClinicById(result.insertId, clinicSupport);
    return res.status(201).json(mapLifecycleRow(row, clinicSupport.status));
  } catch (error) {
    if (error?.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'A clinic with the same name already exists.' });
    }

    console.error('Error creating clinic:', error);
    return res.status(500).json({ message: 'Failed to create clinic.' });
  }
});

router.patch('/:clinicId/status', async (req, res) => {
  if (!(await requireSystemAdmin(req, res))) return;

  const clinicId = toOptionalPositiveInt(req.params.clinicId);
  const nextStatus = normalizeLifecycleStatusInput(req.body?.status, null);

  if (!clinicId) {
    return res.status(400).json({ message: 'Invalid clinic id.' });
  }

  if (!nextStatus) {
    return res.status(400).json({ message: 'Status must be one of Active, Suspended, or Deactivated.' });
  }

  try {
    const clinicSupport = await getClinicColumnSupport();
    const existingRow = await selectClinicById(clinicId, clinicSupport);
    if (!existingRow) {
      return res.status(404).json({ message: 'Clinic not found.' });
    }

    const updates = buildLifecycleUpdateClauses({
      support: clinicSupport,
      nextStatus,
      archiveMode: 'none',
    });

    updates.values.push(clinicId);
    await db.query(
      `UPDATE clinics
       SET ${updates.clauses.join(', ')}
       WHERE id = ?`,
      updates.values
    );

    const updatedRow = await selectClinicById(clinicId, clinicSupport);
    return res.json(mapLifecycleRow(updatedRow, clinicSupport.status));
  } catch (error) {
    console.error('Error updating clinic status:', error);
    return res.status(500).json({ message: 'Failed to update clinic status.' });
  }
});

router.patch('/:clinicId/archive', async (req, res) => {
  if (!(await requireSystemAdmin(req, res))) return;

  const clinicId = toOptionalPositiveInt(req.params.clinicId);
  if (!clinicId) {
    return res.status(400).json({ message: 'Invalid clinic id.' });
  }

  try {
    const clinicSupport = await getClinicColumnSupport();
    const existingRow = await selectClinicById(clinicId, clinicSupport);
    if (!existingRow) {
      return res.status(404).json({ message: 'Clinic not found.' });
    }

    const updates = buildLifecycleUpdateClauses({
      support: clinicSupport,
      nextStatus: 'Deactivated',
      archiveMode: 'archive',
    });

    updates.values.push(clinicId);
    await db.query(
      `UPDATE clinics
       SET ${updates.clauses.join(', ')}
       WHERE id = ?`,
      updates.values
    );

    return res.json({ message: 'Clinic archived successfully.' });
  } catch (error) {
    console.error('Error archiving clinic:', error);
    return res.status(500).json({ message: 'Failed to archive clinic.' });
  }
});

router.patch('/:clinicId/restore', async (req, res) => {
  if (!(await requireSystemAdmin(req, res))) return;

  const clinicId = toOptionalPositiveInt(req.params.clinicId);
  if (!clinicId) {
    return res.status(400).json({ message: 'Invalid clinic id.' });
  }

  try {
    const clinicSupport = await getClinicColumnSupport();
    const existingRow = await selectClinicById(clinicId, clinicSupport);
    if (!existingRow) {
      return res.status(404).json({ message: 'Clinic not found.' });
    }

    const updates = buildLifecycleUpdateClauses({
      support: clinicSupport,
      nextStatus: 'Active',
      archiveMode: 'restore',
    });

    updates.values.push(clinicId);
    await db.query(
      `UPDATE clinics
       SET ${updates.clauses.join(', ')}
       WHERE id = ?`,
      updates.values
    );

    return res.json({ message: 'Clinic restored successfully.' });
  } catch (error) {
    console.error('Error restoring clinic:', error);
    return res.status(500).json({ message: 'Failed to restore clinic.' });
  }
});

router.get('/:clinicId/branches', async (req, res) => {
  const clinicId = toOptionalPositiveInt(req.params.clinicId);
  if (!clinicId) {
    return res.status(400).json({ message: 'Invalid clinic id.' });
  }

  const includeInactive = toBoolean(req.query.includeInactive, false);

  try {
    const [clinicRows] = await db.query(
      `SELECT id, name FROM clinics WHERE id = ? LIMIT 1`,
      [clinicId]
    );

    if (!clinicRows.length) {
      return res.status(404).json({ message: 'Clinic not found.' });
    }

    const branchSupport = await getBranchColumnSupport();
    const branchStatusExpr = buildStatusExpr('', branchSupport.status);

    const whereParts = ['clinic_id = ?'];
    const params = [clinicId];
    if (!includeInactive) {
      whereParts.push(`${branchStatusExpr} = 'Active'`);
    }

    const columns = ['id', 'clinic_id', 'name', 'code', 'is_active'];
    if (branchSupport.address) columns.push('address');
    if (branchSupport.status) columns.push('status');
    if (branchSupport.suspended_at) columns.push('suspended_at');
    if (branchSupport.deactivated_at) columns.push('deactivated_at');
    if (branchSupport.archived_at) columns.push('archived_at');
    columns.push('created_at', 'updated_at');

    const [branchRows] = await db.query(
      `SELECT ${columns.join(', ')}
       FROM clinic_branches
       WHERE ${whereParts.join(' AND ')}
       ORDER BY name ASC`,
      params
    );

    return res.json(branchRows.map((row) => mapLifecycleRow(row, branchSupport.status)));
  } catch (error) {
    console.error('Error loading branches:', error);
    return res.status(500).json({ message: 'Failed to load branches.' });
  }
});

router.post('/:clinicId/branches', async (req, res) => {
  if (!(await requireGlobalAdmin(req, res))) return;

  const clinicId = toOptionalPositiveInt(req.params.clinicId);
  const name = cleanText(req.body?.name);
  const code = cleanText(req.body?.code, 64);
  const address = cleanText(req.body?.address, 500);

  if (!clinicId) {
    return res.status(400).json({ message: 'Invalid clinic id.' });
  }

  if (!name) {
    return res.status(400).json({ message: 'Branch name is required.' });
  }

  try {
    const [clinicRows] = await db.query(
      `SELECT id FROM clinics WHERE id = ? LIMIT 1`,
      [clinicId]
    );

    if (!clinicRows.length) {
      return res.status(404).json({ message: 'Clinic not found.' });
    }

    const branchSupport = await getBranchColumnSupport();

    let result;
    if (branchSupport.status && branchSupport.address) {
      [result] = await db.query(
        `INSERT INTO clinic_branches (clinic_id, name, code, address, is_active, status)
         VALUES (?, ?, ?, ?, 1, 'Active')`,
        [clinicId, name, code || null, address || null]
      );
    } else if (branchSupport.status) {
      [result] = await db.query(
        `INSERT INTO clinic_branches (clinic_id, name, code, is_active, status)
         VALUES (?, ?, ?, 1, 'Active')`,
        [clinicId, name, code || null]
      );
    } else if (branchSupport.address) {
      [result] = await db.query(
        `INSERT INTO clinic_branches (clinic_id, name, code, address, is_active)
         VALUES (?, ?, ?, ?, 1)`,
        [clinicId, name, code || null, address || null]
      );
    } else {
      [result] = await db.query(
        `INSERT INTO clinic_branches (clinic_id, name, code, is_active)
         VALUES (?, ?, ?, 1)`,
        [clinicId, name, code || null]
      );
    }

    const row = await selectBranchById(result.insertId, branchSupport);
    return res.status(201).json(mapLifecycleRow(row, branchSupport.status));
  } catch (error) {
    if (error?.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'A branch with the same name already exists for this clinic.' });
    }

    console.error('Error creating clinic branch:', error);
    return res.status(500).json({ message: 'Failed to create branch.' });
  }
});

router.patch('/:clinicId/branches/:branchId/status', async (req, res) => {
  if (!(await requireSystemAdmin(req, res))) return;

  const clinicId = toOptionalPositiveInt(req.params.clinicId);
  const branchId = toOptionalPositiveInt(req.params.branchId);
  const nextStatus = normalizeLifecycleStatusInput(req.body?.status, null);

  if (!clinicId || !branchId) {
    return res.status(400).json({ message: 'Invalid clinic or branch id.' });
  }

  if (!nextStatus) {
    return res.status(400).json({ message: 'Status must be one of Active, Suspended, or Deactivated.' });
  }

  try {
    const branchSupport = await getBranchColumnSupport();

    const [existingRows] = await db.query(
      `SELECT id FROM clinic_branches WHERE id = ? AND clinic_id = ? LIMIT 1`,
      [branchId, clinicId]
    );

    if (!existingRows.length) {
      return res.status(404).json({ message: 'Branch not found for this clinic.' });
    }

    const updates = buildLifecycleUpdateClauses({
      support: branchSupport,
      nextStatus,
      archiveMode: 'none',
    });

    updates.values.push(branchId, clinicId);
    await db.query(
      `UPDATE clinic_branches
       SET ${updates.clauses.join(', ')}
       WHERE id = ?
         AND clinic_id = ?`,
      updates.values
    );

    const updatedRow = await selectBranchById(branchId, branchSupport);
    return res.json(mapLifecycleRow(updatedRow, branchSupport.status));
  } catch (error) {
    console.error('Error updating branch status:', error);
    return res.status(500).json({ message: 'Failed to update branch status.' });
  }
});

router.patch('/:clinicId/branches/:branchId/archive', async (req, res) => {
  if (!(await requireSystemAdmin(req, res))) return;

  const clinicId = toOptionalPositiveInt(req.params.clinicId);
  const branchId = toOptionalPositiveInt(req.params.branchId);

  if (!clinicId || !branchId) {
    return res.status(400).json({ message: 'Invalid clinic or branch id.' });
  }

  try {
    const branchSupport = await getBranchColumnSupport();

    const [existingRows] = await db.query(
      `SELECT id FROM clinic_branches WHERE id = ? AND clinic_id = ? LIMIT 1`,
      [branchId, clinicId]
    );

    if (!existingRows.length) {
      return res.status(404).json({ message: 'Branch not found for this clinic.' });
    }

    const updates = buildLifecycleUpdateClauses({
      support: branchSupport,
      nextStatus: 'Deactivated',
      archiveMode: 'archive',
    });

    updates.values.push(branchId, clinicId);
    await db.query(
      `UPDATE clinic_branches
       SET ${updates.clauses.join(', ')}
       WHERE id = ?
         AND clinic_id = ?`,
      updates.values
    );

    return res.json({ message: 'Branch archived successfully.' });
  } catch (error) {
    console.error('Error archiving branch:', error);
    return res.status(500).json({ message: 'Failed to archive branch.' });
  }
});

router.patch('/:clinicId/branches/:branchId/restore', async (req, res) => {
  if (!(await requireSystemAdmin(req, res))) return;

  const clinicId = toOptionalPositiveInt(req.params.clinicId);
  const branchId = toOptionalPositiveInt(req.params.branchId);

  if (!clinicId || !branchId) {
    return res.status(400).json({ message: 'Invalid clinic or branch id.' });
  }

  try {
    const branchSupport = await getBranchColumnSupport();

    const [existingRows] = await db.query(
      `SELECT id FROM clinic_branches WHERE id = ? AND clinic_id = ? LIMIT 1`,
      [branchId, clinicId]
    );

    if (!existingRows.length) {
      return res.status(404).json({ message: 'Branch not found for this clinic.' });
    }

    const updates = buildLifecycleUpdateClauses({
      support: branchSupport,
      nextStatus: 'Active',
      archiveMode: 'restore',
    });

    updates.values.push(branchId, clinicId);
    await db.query(
      `UPDATE clinic_branches
       SET ${updates.clauses.join(', ')}
       WHERE id = ?
         AND clinic_id = ?`,
      updates.values
    );

    return res.json({ message: 'Branch restored successfully.' });
  } catch (error) {
    console.error('Error restoring branch:', error);
    return res.status(500).json({ message: 'Failed to restore branch.' });
  }
});

module.exports = router;