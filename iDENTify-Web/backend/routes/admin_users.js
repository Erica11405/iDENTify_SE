const express = require('express');
const router = express.Router();
const db = require('../db');

const ALLOWED_ROLES = new Set(['dentist', 'aide']);
let hasDentistArchivedAtColumnCache = null;

function normalizeRole(role) {
  const normalized = String(role || '').trim().toLowerCase();
  if (normalized === 'super_admin') return 'superadmin';
  return normalized;
}

async function syncDentistArchiveFlag(dentistId, isArchived) {
  if (!dentistId) return;

  try {
    if (hasDentistArchivedAtColumnCache === null) {
      const [rows] = await db.query("SHOW COLUMNS FROM dentists LIKE 'archived_at'");
      hasDentistArchivedAtColumnCache = rows.length > 0;
    }

    if (hasDentistArchivedAtColumnCache) {
      if (Number(isArchived) === 1) {
        await db.query(
          'UPDATE dentists SET is_archived = 1, archived_at = COALESCE(archived_at, NOW()) WHERE id = ?',
          [dentistId]
        );
      } else {
        await db.query(
          'UPDATE dentists SET is_archived = 0, archived_at = NULL WHERE id = ?',
          [dentistId]
        );
      }
      return;
    }

    await db.query('UPDATE dentists SET is_archived = ? WHERE id = ?', [isArchived, dentistId]);
  } catch (err) {
    if (err.code === 'ER_BAD_FIELD_ERROR') return;
    throw err;
  }
}

async function syncAideArchiveFlag(userId, isArchived) {
  try {
    await db.query('UPDATE aides SET is_archived = ? WHERE user_id = ?', [isArchived, userId]);
  } catch (err) {
    if (err.code === 'ER_NO_SUCH_TABLE' || err.code === 'ER_BAD_FIELD_ERROR') return;
    throw err;
  }
}

router.get('/', async (req, res) => {
  const roleFilter = normalizeRole(req.query?.role);
  const archivedFilter = String(req.query?.archived || 'false').trim().toLowerCase();

  const where = ["LOWER(u.role) IN ('dentist', 'aide')"];
  const params = [];

  if (roleFilter && roleFilter !== 'all') {
    if (!ALLOWED_ROLES.has(roleFilter)) {
      return res.status(400).json({ error: 'Invalid role filter.' });
    }
    where.push('LOWER(u.role) = ?');
    params.push(roleFilter);
  }

  if (archivedFilter === 'true') {
    where.push('u.is_archived = 1');
  } else if (archivedFilter === 'false') {
    where.push('u.is_archived = 0');
  } else if (archivedFilter !== 'all') {
    return res.status(400).json({ error: "Invalid archived filter. Use 'true', 'false', or 'all'." });
  }

  try {
    const [rows] = await db.query(
      `SELECT
        u.id,
        u.full_name,
        u.last_name,
        u.email,
        LOWER(u.role) AS role,
        u.is_archived,
        u.is_verified,
        u.dentist_id,
        d.specialization AS dentist_specialization,
        d.status AS dentist_status,
        d.is_archived AS dentist_is_archived
      FROM users u
      LEFT JOIN dentists d ON d.id = u.dentist_id
      WHERE ${where.join(' AND ')}
      ORDER BY u.is_archived ASC, u.full_name ASC`,
      params
    );

    const users = rows.map((row) => ({
      ...row,
      role: normalizeRole(row.role),
      is_archived: Number(row.is_archived || 0),
      is_verified: Number(row.is_verified || 0),
    }));

    res.json(users);
  } catch (err) {
    console.error('Error fetching admin user list:', err);
    res.status(500).json({ error: 'Failed to fetch users.' });
  }
});

router.patch('/:id/archive', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid user id.' });
  }

  try {
    const [users] = await db.query('SELECT id, role, dentist_id FROM users WHERE id = ? LIMIT 1', [id]);
    if (!users.length) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const user = users[0];
    const role = normalizeRole(user.role);
    if (!ALLOWED_ROLES.has(role)) {
      return res.status(400).json({ error: 'Only dentist and aide accounts can be archived here.' });
    }

    await db.query('UPDATE users SET is_archived = 1, otp_code = NULL, otp_expires_at = NULL WHERE id = ?', [id]);

    if (role === 'dentist') {
      await syncDentistArchiveFlag(user.dentist_id, 1);
    }

    if (role === 'aide') {
      await syncAideArchiveFlag(id, 1);
    }

    res.json({ message: 'User archived successfully.' });
  } catch (err) {
    console.error('Error archiving user:', err);
    res.status(500).json({ error: 'Failed to archive user.' });
  }
});

router.patch('/:id/restore', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid user id.' });
  }

  try {
    const [users] = await db.query('SELECT id, role, dentist_id FROM users WHERE id = ? LIMIT 1', [id]);
    if (!users.length) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const user = users[0];
    const role = normalizeRole(user.role);
    if (!ALLOWED_ROLES.has(role)) {
      return res.status(400).json({ error: 'Only dentist and aide accounts can be restored here.' });
    }

    await db.query('UPDATE users SET is_archived = 0 WHERE id = ?', [id]);

    if (role === 'dentist') {
      await syncDentistArchiveFlag(user.dentist_id, 0);
    }

    if (role === 'aide') {
      await syncAideArchiveFlag(id, 0);
    }

    res.json({ message: 'User restored successfully.' });
  } catch (err) {
    console.error('Error restoring user:', err);
    res.status(500).json({ error: 'Failed to restore user.' });
  }
});

module.exports = router;
