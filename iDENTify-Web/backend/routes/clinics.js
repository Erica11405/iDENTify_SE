const express = require('express');
const router = express.Router();
const db = require('../db');

function normalizeRole(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'super_admin') return 'superadmin';
  if (normalized === 'global_admin') return 'globaladmin';
  return normalized;
}

function actorRole(req) {
  return normalizeRole(req.headers['x-user-role']);
}

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

function requireGlobalAdmin(req, res) {
  const role = actorRole(req);
  // Transitional compatibility: existing deployments use `superadmin` as the top-level role.
  if (role !== 'globaladmin' && role !== 'superadmin') {
    res.status(403).json({ message: 'Only global admins can manage clinics and branches.' });
    return false;
  }
  return true;
}

router.get('/discover', async (_req, res) => {
  try {
    const [clinicRows] = await db.query(
      `SELECT id, name
       FROM clinics
       WHERE is_active = 1
       ORDER BY name ASC`
    );

    const [branchRows] = await db.query(
      `SELECT id, clinic_id, name
       FROM clinic_branches
       WHERE is_active = 1
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
  if (!requireGlobalAdmin(req, res)) return;

  try {
    const [clinicCountRows] = await db.query(
      `SELECT COUNT(*) AS total_clinics,
              SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) AS active_clinics
       FROM clinics`
    );

    const [branchesPerClinicRows] = await db.query(
      `SELECT
         c.id,
         c.name,
         COUNT(cb.id) AS total_branches,
         SUM(CASE WHEN COALESCE(cb.is_active, 0) = 1 THEN 1 ELSE 0 END) AS active_branches
       FROM clinics c
       LEFT JOIN clinic_branches cb ON cb.clinic_id = c.id
       GROUP BY c.id, c.name
       ORDER BY c.name ASC`
    );

    return res.json({
      totals: {
        total_clinics: Number(clinicCountRows[0]?.total_clinics || 0),
        active_clinics: Number(clinicCountRows[0]?.active_clinics || 0),
      },
      branches_per_clinic: branchesPerClinicRows.map((row) => ({
        id: row.id,
        name: row.name,
        total_branches: Number(row.total_branches || 0),
        active_branches: Number(row.active_branches || 0),
      })),
    });
  } catch (error) {
    console.error('Error loading clinic summary:', error);
    return res.status(500).json({ message: 'Failed to load clinic summary.' });
  }
});

router.get('/', async (req, res) => {
  const includeInactive = toBoolean(req.query.includeInactive, false);

  try {
    const params = [];
    let whereSql = '';
    if (!includeInactive) {
      whereSql = 'WHERE c.is_active = 1';
    }

    const [rows] = await db.query(
      `SELECT
         c.id,
         c.name,
         c.code,
         c.is_active,
         c.created_at,
         c.updated_at,
         COUNT(cb.id) AS total_branches,
         SUM(CASE WHEN COALESCE(cb.is_active, 0) = 1 THEN 1 ELSE 0 END) AS active_branches
       FROM clinics c
       LEFT JOIN clinic_branches cb ON cb.clinic_id = c.id
       ${whereSql}
       GROUP BY c.id, c.name, c.code, c.is_active, c.created_at, c.updated_at
       ORDER BY c.name ASC`,
      params
    );

    return res.json(rows.map((row) => ({
      ...row,
      is_active: Number(row.is_active || 0) === 1,
      total_branches: Number(row.total_branches || 0),
      active_branches: Number(row.active_branches || 0),
    })));
  } catch (error) {
    console.error('Error loading clinics:', error);
    return res.status(500).json({ message: 'Failed to load clinics.' });
  }
});

router.post('/', async (req, res) => {
  if (!requireGlobalAdmin(req, res)) return;

  const name = cleanText(req.body?.name);
  const code = cleanText(req.body?.code, 64);

  if (!name) {
    return res.status(400).json({ message: 'Clinic name is required.' });
  }

  try {
    const [result] = await db.query(
      `INSERT INTO clinics (name, code, is_active)
       VALUES (?, ?, 1)`,
      [name, code || null]
    );

    const [rows] = await db.query(
      `SELECT id, name, code, is_active, created_at, updated_at
       FROM clinics
       WHERE id = ?
       LIMIT 1`,
      [result.insertId]
    );

    return res.status(201).json({
      ...rows[0],
      is_active: Number(rows[0]?.is_active || 0) === 1,
    });
  } catch (error) {
    if (error?.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'A clinic with the same name already exists.' });
    }

    console.error('Error creating clinic:', error);
    return res.status(500).json({ message: 'Failed to create clinic.' });
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
      `SELECT id, name, is_active FROM clinics WHERE id = ? LIMIT 1`,
      [clinicId]
    );

    if (!clinicRows.length) {
      return res.status(404).json({ message: 'Clinic not found.' });
    }

    const params = [clinicId];
    let whereSql = 'WHERE clinic_id = ?';
    if (!includeInactive) {
      whereSql += ' AND is_active = 1';
    }

    const [branchRows] = await db.query(
      `SELECT id, clinic_id, name, code, is_active, created_at, updated_at
       FROM clinic_branches
       ${whereSql}
       ORDER BY name ASC`,
      params
    );

    return res.json(branchRows.map((row) => ({
      ...row,
      is_active: Number(row.is_active || 0) === 1,
    })));
  } catch (error) {
    console.error('Error loading branches:', error);
    return res.status(500).json({ message: 'Failed to load branches.' });
  }
});

router.post('/:clinicId/branches', async (req, res) => {
  if (!requireGlobalAdmin(req, res)) return;

  const clinicId = toOptionalPositiveInt(req.params.clinicId);
  const name = cleanText(req.body?.name);
  const code = cleanText(req.body?.code, 64);

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

    const [result] = await db.query(
      `INSERT INTO clinic_branches (clinic_id, name, code, is_active)
       VALUES (?, ?, ?, 1)`,
      [clinicId, name, code || null]
    );

    const [branchRows] = await db.query(
      `SELECT id, clinic_id, name, code, is_active, created_at, updated_at
       FROM clinic_branches
       WHERE id = ?
       LIMIT 1`,
      [result.insertId]
    );

    return res.status(201).json({
      ...branchRows[0],
      is_active: Number(branchRows[0]?.is_active || 0) === 1,
    });
  } catch (error) {
    if (error?.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'A branch with the same name already exists for this clinic.' });
    }

    console.error('Error creating clinic branch:', error);
    return res.status(500).json({ message: 'Failed to create branch.' });
  }
});

module.exports = router;
