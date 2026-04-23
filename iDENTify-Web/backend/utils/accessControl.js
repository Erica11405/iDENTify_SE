const db = require('../db');

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

function normalizeLifecycleStatus(value, fallback = 'Active') {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return fallback;

  if (normalized === 'active') return 'Active';
  if (normalized === 'suspended') return 'Suspended';
  if (normalized === 'deactivated') return 'Deactivated';

  return fallback;
}

function lifecycleStatusFromIsActive(value) {
  return Number(value || 0) === 1 ? 'Active' : 'Deactivated';
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
  try {
    await db.query("SELECT approval_status FROM users LIMIT 0");
    return true;
  } catch (_err) {
    return false;
  }
}

async function hasUsersClinicColumn() {
  try {
    await db.query("SELECT clinic_id FROM users LIMIT 0");
    return true;
  } catch (_err) {
    return false;
  }
}

async function hasUsersBranchColumn() {
  try {
    await db.query("SELECT branch_id FROM users LIMIT 0");
    return true;
  } catch (_err) {
    return false;
  }
}

async function hasClinicsStatusColumn() {
  try {
    await db.query("SELECT status FROM clinics LIMIT 0");
    return true;
  } catch (_err) {
    return false;
  }
}

async function hasClinicBranchesStatusColumn() {
  try {
    await db.query("SELECT status FROM clinic_branches LIMIT 0");
    return true;
  } catch (_err) {
    return false;
  }
}

async function getUserTenantAssignment(userId) {
  const parsedUserId = toPositiveInt(userId);
  if (!parsedUserId) {
    return {
      clinicId: null,
      branchId: null,
    };
  }

  const supportsUsersClinic = await hasUsersClinicColumn();
  const supportsUsersBranch = await hasUsersBranchColumn();
  if (!supportsUsersClinic && !supportsUsersBranch) {
    return {
      clinicId: null,
      branchId: null,
    };
  }

  const columns = [];
  if (supportsUsersClinic) columns.push('clinic_id');
  if (supportsUsersBranch) columns.push('branch_id');

  try {
    const [rows] = await db.query(
      `SELECT ${columns.join(', ')} FROM users WHERE id = ? LIMIT 1`,
      [parsedUserId]
    );

    const row = rows[0] || {};
    return {
      clinicId: supportsUsersClinic ? toPositiveInt(row.clinic_id) : null,
      branchId: supportsUsersBranch ? toPositiveInt(row.branch_id) : null,
    };
  } catch (_err) {
    return {
      clinicId: null,
      branchId: null,
    };
  }
}

async function getTenantLifecycleStatus({ clinicId, branchId } = {}) {
  const parsedClinicId = toPositiveInt(clinicId);
  const parsedBranchId = toPositiveInt(branchId);

  let clinicStatus = 'Active';
  let branchStatus = 'Active';

  if (parsedClinicId) {
    const supportsClinicStatus = await hasClinicsStatusColumn();
    const [clinicRows] = await db.query(
      `SELECT ${supportsClinicStatus ? 'status,' : ''} is_active FROM clinics WHERE id = ? LIMIT 1`,
      [parsedClinicId]
    );

    if (clinicRows.length) {
      const row = clinicRows[0];
      clinicStatus = supportsClinicStatus
        ? normalizeLifecycleStatus(row.status, lifecycleStatusFromIsActive(row.is_active))
        : lifecycleStatusFromIsActive(row.is_active);
    }
  }

  if (parsedBranchId) {
    const supportsBranchStatus = await hasClinicBranchesStatusColumn();
    const [branchRows] = await db.query(
      `SELECT ${supportsBranchStatus ? 'status,' : ''} is_active FROM clinic_branches WHERE id = ? LIMIT 1`,
      [parsedBranchId]
    );

    if (branchRows.length) {
      const row = branchRows[0];
      branchStatus = supportsBranchStatus
        ? normalizeLifecycleStatus(row.status, lifecycleStatusFromIsActive(row.is_active))
        : lifecycleStatusFromIsActive(row.is_active);
    }
  }

  return {
    clinicStatus,
    branchStatus,
  };
}

function getLifecycleBlockMessage(lifecycle = {}, { action = 'access' } = {}) {
  const clinicStatus = normalizeLifecycleStatus(lifecycle.clinicStatus, 'Active');
  const branchStatus = normalizeLifecycleStatus(lifecycle.branchStatus, 'Active');
  const blockedStatuses = new Set(['Suspended', 'Deactivated']);

  if (blockedStatuses.has(branchStatus)) {
    if (action === 'login') {
      return `Your assigned branch is ${branchStatus.toLowerCase()}. Staff login is currently blocked.`;
    }
    if (action === 'booking') {
      return `Bookings are currently blocked because the selected branch is ${branchStatus.toLowerCase()}.`;
    }
    return `Branch access is blocked because the branch is ${branchStatus.toLowerCase()}.`;
  }

  if (blockedStatuses.has(clinicStatus)) {
    if (action === 'login') {
      return `Your assigned clinic is ${clinicStatus.toLowerCase()}. Staff login is currently blocked.`;
    }
    if (action === 'booking') {
      return `Bookings are currently blocked because the selected clinic is ${clinicStatus.toLowerCase()}.`;
    }
    return `Clinic access is blocked because the clinic is ${clinicStatus.toLowerCase()}.`;
  }

  return null;
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

async function getActorTenantScope(req) {
  const role = normalizeRole(req.headers['x-user-role']);
  const userId = actorUserId(req);

  if (!userId) {
    return { role, userId: null, clinicId: null, branchId: null, scoped: false };
  }

  const supportsUsersClinic = await hasUsersClinicColumn();
  const supportsUsersBranch = await hasUsersBranchColumn();
  if (!supportsUsersClinic && !supportsUsersBranch) {
    return { role, userId, clinicId: null, branchId: null, scoped: false };
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
      return { role, userId, clinicId, branchId, scoped: false };
    }

    const scopedRoles = new Set(['superadmin', 'dentist', 'aide']);
    const scoped = scopedRoles.has(role) && Boolean(clinicId || branchId);

    return { role, userId, clinicId, branchId, scoped };
  } catch (_err) {
    return { role, userId, clinicId: null, branchId: null, scoped: false };
  }
}

function appendTenantWhereClauses({ whereClauses, params, scope, clinicExpression, branchExpression }) {
  if (!scope?.scoped) return;

  if (scope.clinicId && clinicExpression) {
    whereClauses.push(`${clinicExpression} = ?`);
    params.push(scope.clinicId);
  }

  if (scope.branchId && branchExpression) {
    whereClauses.push(`${branchExpression} = ?`);
    params.push(scope.branchId);
  }
}

async function hasColumn(tableName, columnName) {
  try {
    const [rows] = await db.query(`SHOW COLUMNS FROM ${tableName} LIKE '${columnName}'`);
    return rows.length > 0;
  } catch (_err) {
    return false;
  }
}

module.exports = {
  normalizeRole,
  normalizeLifecycleStatus,
  normalizeApprovalStatus,
  actorRole,
  actorUserId,
  hasUsersClinicColumn,
  hasUsersBranchColumn,
  hasClinicsStatusColumn,
  hasClinicBranchesStatusColumn,
  getUserTenantAssignment,
  getTenantLifecycleStatus,
  getLifecycleBlockMessage,
  hasUsersApprovalStatusColumn,
  getActorUserRow,
  enforceAdminAccess,
  getActorTenantScope,
  appendTenantWhereClauses,
  hasColumn,
};
