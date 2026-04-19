const db = require('../db');

let hasUsersApprovalStatusColumnCache = null;

function normalizeRole(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'super_admin') return 'superadmin';
  if (normalized === 'global_admin') return 'globaladmin';
  return normalized;
}

function toPositiveInt(value) {
  const parsed = Number.parseInt(String(value || ''), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

function normalizeApprovalStatus(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return 'approved';

  if (normalized === 'pendingrequirements') return 'pending_requirements';
  if (normalized === 'pendingreview') return 'pending_review';

  if (
    normalized === 'pending_requirements'
    || normalized === 'pending_review'
    || normalized === 'approved'
    || normalized === 'declined'
  ) {
    return normalized;
  }

  return 'approved';
}

function actorRole(req) {
  return normalizeRole(req.headers['x-user-role']);
}

function actorUserId(req) {
  return toPositiveInt(req.headers['x-user-id']);
}

async function hasUsersApprovalStatusColumn() {
  if (hasUsersApprovalStatusColumnCache !== null) {
    return hasUsersApprovalStatusColumnCache;
  }

  try {
    const [rows] = await db.query("SHOW COLUMNS FROM users LIKE 'approval_status'");
    hasUsersApprovalStatusColumnCache = rows.length > 0;
  } catch (_err) {
    hasUsersApprovalStatusColumnCache = false;
  }

  return hasUsersApprovalStatusColumnCache;
}

async function getActorUserRow(userId) {
  const parsedUserId = toPositiveInt(userId);
  if (!parsedUserId) return null;

  const [rows] = await db.query(
    `SELECT id, email, full_name, role, is_archived, approval_status
     FROM users
     WHERE id = ?
     LIMIT 1`,
    [parsedUserId]
  );

  if (!rows.length) return null;
  const row = rows[0];

  return {
    id: row.id,
    email: row.email,
    full_name: row.full_name,
    role: normalizeRole(row.role),
    is_archived: Number(row.is_archived || 0) === 1,
    approval_status: normalizeApprovalStatus(row.approval_status),
  };
}

async function enforceAdminAccess(req, res, {
  allowGlobalAdmin = true,
  allowSuperAdmin = true,
  requireApprovedSuperAdmin = true,
} = {}) {
  const role = actorRole(req);
  const userId = actorUserId(req);

  if (!role || !userId) {
    res.status(403).json({
      message: 'User context is missing. Please sign in again.',
      code: 'ADMIN_CONTEXT_MISSING',
    });
    return { ok: false, role: null, userId: null, actor: null };
  }

  const roleAllowed = (
    (allowGlobalAdmin && role === 'globaladmin')
    || (allowSuperAdmin && role === 'superadmin')
  );

  if (!roleAllowed) {
    res.status(403).json({
      message: 'You are not allowed to perform this action.',
      code: 'ADMIN_FORBIDDEN_ROLE',
    });
    return { ok: false, role, userId, actor: null };
  }

  let actor;
  try {
    actor = await getActorUserRow(userId);
  } catch (error) {
    console.error('Failed to resolve actor context:', error);
    res.status(500).json({ message: 'Failed to verify actor context.' });
    return { ok: false, role, userId, actor: null };
  }

  if (!actor || actor.role !== role) {
    res.status(403).json({
      message: 'Actor context is invalid. Please sign in again.',
      code: 'ADMIN_ACTOR_INVALID',
    });
    return { ok: false, role, userId, actor: null };
  }

  if (actor.is_archived) {
    res.status(403).json({
      message: 'This account has been archived.',
      code: 'ADMIN_ACTOR_ARCHIVED',
    });
    return { ok: false, role, userId, actor };
  }

  if (role === 'superadmin' && requireApprovedSuperAdmin) {
    const supportsApproval = await hasUsersApprovalStatusColumn();
    const approvalStatus = supportsApproval ? actor.approval_status : 'approved';

    if (approvalStatus !== 'approved') {
      res.status(403).json({
        message: 'Your superadmin access request is not approved yet.',
        code: 'SUPERADMIN_NOT_APPROVED',
        approval_status: approvalStatus,
      });
      return { ok: false, role, userId, actor: { ...actor, approval_status: approvalStatus } };
    }
  }

  return { ok: true, role, userId, actor };
}

module.exports = {
  normalizeRole,
  normalizeApprovalStatus,
  actorRole,
  actorUserId,
  hasUsersApprovalStatusColumn,
  getActorUserRow,
  enforceAdminAccess,
};
