const express = require("express");
const router = express.Router();
const db = require("../db");
let dentistArchiveColumnsCache = null;
let hasAppointmentClinicColumnCache = null;
let hasAppointmentBranchColumnCache = null;
let hasQueueClinicColumnCache = null;
let hasQueueBranchColumnCache = null;
let hasUsersClinicColumnCache = null;
let hasUsersBranchColumnCache = null;

function normalizeActorRole(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "super_admin") return "superadmin";
  if (normalized === "global_admin") return "globaladmin";
  return normalized;
}

function actorUserId(req) {
  return toPositiveInt(req.headers["x-user-id"]);
}

function actorDentistId(req) {
  return toPositiveInt(req.headers["x-user-dentist-id"]);
}

function assertReportActorContext(req, {
  requireDentistContextForDentist = false,
  disallowDentist = false,
} = {}) {
  const role = normalizeActorRole(req.headers["x-user-role"]);
  const userId = actorUserId(req);
  const dentistId = actorDentistId(req);

  const allowedRoles = new Set(["globaladmin", "superadmin", "dentist", "aide"]);
  if (!role || !allowedRoles.has(role)) {
    return {
      allowed: false,
      status: 401,
      message: "User role context is required.",
      role,
      userId,
      dentistId,
    };
  }

  if (!userId) {
    return {
      allowed: false,
      status: 403,
      message: "User context is missing. Please sign in again.",
      role,
      userId,
      dentistId,
    };
  }

  if (disallowDentist && role === "dentist") {
    return {
      allowed: false,
      status: 403,
      message: "Dentists can only access dentist-specific report endpoints.",
      role,
      userId,
      dentistId,
    };
  }

  if (role === "dentist" && requireDentistContextForDentist && !dentistId) {
    return {
      allowed: false,
      status: 403,
      message: "Dentist context is missing. Please sign in again.",
      role,
      userId,
      dentistId,
    };
  }

  return {
    allowed: true,
    status: 200,
    message: "",
    role,
    userId,
    dentistId,
  };
}

async function hasAppointmentClinicColumn() {
  if (hasAppointmentClinicColumnCache !== null) {
    return hasAppointmentClinicColumnCache;
  }

  try {
    const [rows] = await db.query("SHOW COLUMNS FROM appointments LIKE 'clinic_id'");
    hasAppointmentClinicColumnCache = rows.length > 0;
  } catch (_err) {
    hasAppointmentClinicColumnCache = false;
  }

  return hasAppointmentClinicColumnCache;
}

async function hasAppointmentBranchColumn() {
  if (hasAppointmentBranchColumnCache !== null) {
    return hasAppointmentBranchColumnCache;
  }

  try {
    const [rows] = await db.query("SHOW COLUMNS FROM appointments LIKE 'branch_id'");
    hasAppointmentBranchColumnCache = rows.length > 0;
  } catch (_err) {
    hasAppointmentBranchColumnCache = false;
  }

  return hasAppointmentBranchColumnCache;
}

async function hasQueueClinicColumn() {
  if (hasQueueClinicColumnCache !== null) {
    return hasQueueClinicColumnCache;
  }

  try {
    const [rows] = await db.query("SHOW COLUMNS FROM walk_in_queue LIKE 'clinic_id'");
    hasQueueClinicColumnCache = rows.length > 0;
  } catch (_err) {
    hasQueueClinicColumnCache = false;
  }

  return hasQueueClinicColumnCache;
}

async function hasQueueBranchColumn() {
  if (hasQueueBranchColumnCache !== null) {
    return hasQueueBranchColumnCache;
  }

  try {
    const [rows] = await db.query("SHOW COLUMNS FROM walk_in_queue LIKE 'branch_id'");
    hasQueueBranchColumnCache = rows.length > 0;
  } catch (_err) {
    hasQueueBranchColumnCache = false;
  }

  return hasQueueBranchColumnCache;
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

async function getActorTenantScope(req) {
  const role = normalizeActorRole(req.headers["x-user-role"]);
  const userId = actorUserId(req);
  const scopedRoles = new Set(["superadmin", "dentist", "aide"]);

  if (!userId) {
    return {
      role,
      userId: null,
      clinicId: null,
      branchId: null,
      scoped: false,
      scopeMissing: false,
      scopeResolutionError: false,
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
      scopeMissing: false,
      scopeResolutionError: false,
    };
  }

  const selectColumns = [];
  if (supportsUsersClinic) selectColumns.push("clinic_id");
  if (supportsUsersBranch) selectColumns.push("branch_id");

  try {
    const [rows] = await db.query(
      `SELECT ${selectColumns.join(", ")} FROM users WHERE id = ? LIMIT 1`,
      [userId]
    );

    const row = rows[0] || {};
    const clinicId = supportsUsersClinic ? toPositiveInt(row.clinic_id) : null;
    const branchId = supportsUsersBranch ? toPositiveInt(row.branch_id) : null;

    if (role === "globaladmin") {
      return {
        role,
        userId,
        clinicId,
        branchId,
        scoped: false,
        scopeMissing: false,
        scopeResolutionError: false,
      };
    }

    const roleNeedsScope = scopedRoles.has(role);
    const scoped = roleNeedsScope && Boolean(clinicId || branchId);
    const scopeMissing = roleNeedsScope && !scoped;

    return {
      role,
      userId,
      clinicId,
      branchId,
      scoped,
      scopeMissing,
      scopeResolutionError: false,
    };
  } catch (_err) {
    const roleNeedsScope = scopedRoles.has(role);
    return {
      role,
      userId,
      clinicId: null,
      branchId: null,
      scoped: false,
      scopeMissing: roleNeedsScope,
      scopeResolutionError: true,
    };
  }
}

function assertResolvedTenantScope(actorScope) {
  if (!actorScope) {
    return {
      allowed: false,
      status: 403,
      message: "Unable to resolve user tenant scope.",
    };
  }

  if (actorScope.role === "globaladmin") {
    return {
      allowed: true,
      status: 200,
      message: "",
    };
  }

  if (actorScope.scopeMissing) {
    return {
      allowed: false,
      status: 403,
      message: "Tenant assignment is required to access reports.",
    };
  }

  return {
    allowed: true,
    status: 200,
    message: "",
  };
}

function hasTenantScopeViolation(scope, clinicId, branchId) {
  if (!scope?.scoped) return null;

  if (scope.clinicId && clinicId && Number(scope.clinicId) !== Number(clinicId)) {
    return "You can only access reports within your assigned clinic.";
  }

  if (scope.branchId && branchId && Number(scope.branchId) !== Number(branchId)) {
    return "You can only access reports within your assigned branch.";
  }

  return null;
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

function buildSourceTenantScope({
  actorScope,
  sourceAlias,
  ownerAlias,
  supportsClinicColumn,
  supportsBranchColumn,
  supportsUsersClinic,
  supportsUsersBranch,
}) {
  const whereClauses = [];
  const params = [];
  const needsOwnerJoin = Boolean(actorScope?.scoped) && (supportsUsersClinic || supportsUsersBranch);

  const joinSql = needsOwnerJoin
    ? `LEFT JOIN (
         SELECT dentist_id, MAX(clinic_id) AS clinic_id, MAX(branch_id) AS branch_id
         FROM users
         GROUP BY dentist_id
       ) ${ownerAlias} ON ${ownerAlias}.dentist_id = ${sourceAlias}.dentist_id`
    : "";

  let clinicExpression = null;
  if (supportsClinicColumn && needsOwnerJoin && supportsUsersClinic) {
    clinicExpression = `COALESCE(${sourceAlias}.clinic_id, ${ownerAlias}.clinic_id)`;
  } else if (supportsClinicColumn) {
    clinicExpression = `${sourceAlias}.clinic_id`;
  } else if (needsOwnerJoin && supportsUsersClinic) {
    clinicExpression = `${ownerAlias}.clinic_id`;
  }

  let branchExpression = null;
  if (supportsBranchColumn && needsOwnerJoin && supportsUsersBranch) {
    branchExpression = `COALESCE(${sourceAlias}.branch_id, ${ownerAlias}.branch_id)`;
  } else if (supportsBranchColumn) {
    branchExpression = `${sourceAlias}.branch_id`;
  } else if (needsOwnerJoin && supportsUsersBranch) {
    branchExpression = `${ownerAlias}.branch_id`;
  }

  appendTenantWhereClauses({
    whereClauses,
    params,
    scope: actorScope,
    clinicExpression,
    branchExpression,
  });

  return {
    joinSql,
    whereClauses,
    params,
  };
}

function buildDentistTenantWhereClause({ actorScope, supportsUsersClinic, supportsUsersBranch, dentistAlias = "d" }) {
  if (!actorScope?.scoped) {
    return { clause: "", params: [] };
  }

  const whereClauses = [];
  const params = [];

  if (actorScope.clinicId && supportsUsersClinic) {
    whereClauses.push(
      `EXISTS (SELECT 1 FROM users du WHERE du.dentist_id = ${dentistAlias}.id AND du.clinic_id = ?)`
    );
    params.push(actorScope.clinicId);
  }

  if (actorScope.branchId && supportsUsersBranch) {
    whereClauses.push(
      `EXISTS (SELECT 1 FROM users du WHERE du.dentist_id = ${dentistAlias}.id AND du.branch_id = ?)`
    );
    params.push(actorScope.branchId);
  }

  return {
    clause: whereClauses.join(" AND "),
    params,
  };
}

async function inferTenantFromDentist(dentistId) {
  const parsedDentistId = toPositiveInt(dentistId);
  if (!parsedDentistId) {
    return { clinicId: null, branchId: null };
  }

  const supportsUsersClinic = await hasUsersClinicColumn();
  const supportsUsersBranch = await hasUsersBranchColumn();
  if (!supportsUsersClinic && !supportsUsersBranch) {
    return { clinicId: null, branchId: null };
  }

  const selectColumns = [];
  if (supportsUsersClinic) selectColumns.push("clinic_id");
  if (supportsUsersBranch) selectColumns.push("branch_id");

  try {
    const [rows] = await db.query(
      `SELECT ${selectColumns.join(", ")}
       FROM users
       WHERE dentist_id = ?
         AND role IN ('dentist', 'aide', 'superadmin', 'globaladmin')
       ORDER BY CASE
         WHEN role = 'dentist' THEN 0
         WHEN role = 'aide' THEN 1
         WHEN role = 'superadmin' THEN 2
         ELSE 3
       END,
       id ASC
       LIMIT 1`,
      [parsedDentistId]
    );

    const row = rows[0] || {};
    return {
      clinicId: supportsUsersClinic ? toPositiveInt(row.clinic_id) : null,
      branchId: supportsUsersBranch ? toPositiveInt(row.branch_id) : null,
    };
  } catch (_err) {
    return { clinicId: null, branchId: null };
  }
}

async function assertDentistReportAccess(req, dentistId) {
  const actorContext = assertReportActorContext(req, {
    requireDentistContextForDentist: true,
  });
  if (!actorContext.allowed) {
    return {
      allowed: false,
      status: actorContext.status,
      message: actorContext.message,
      actorScope: null,
    };
  }

  const role = actorContext.role;
  const actorDentist = actorContext.dentistId;

  if (role === "dentist" && !actorDentist) {
    return {
      allowed: false,
      status: 403,
      message: "Dentist context is missing. Please sign in again.",
      actorScope: null,
    };
  }

  if (role === "dentist" && Number(actorDentist) !== Number(dentistId)) {
    return {
      allowed: false,
      status: 403,
      message: "Dentists can only access their own report data.",
      actorScope: null,
    };
  }

  const actorScope = await getActorTenantScope(req);
  const tenantScopeAccess = assertResolvedTenantScope(actorScope);
  if (!tenantScopeAccess.allowed) {
    return {
      allowed: false,
      status: tenantScopeAccess.status,
      message: tenantScopeAccess.message,
      actorScope,
    };
  }

  const targetTenant = await inferTenantFromDentist(dentistId);
  const scopeViolation = hasTenantScopeViolation(actorScope, targetTenant.clinicId, targetTenant.branchId);

  if (scopeViolation) {
    return {
      allowed: false,
      status: 403,
      message: scopeViolation,
      actorScope,
    };
  }

  return {
    allowed: true,
    status: 200,
    actorScope,
    message: "",
  };
}

async function getDentistArchiveColumns() {
  if (dentistArchiveColumnsCache !== null) {
    return dentistArchiveColumnsCache;
  }

  try {
    const [rows] = await db.query(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_schema = DATABASE()
         AND table_name = 'dentists'
         AND column_name IN ('is_archived', 'archived_at')`
    );

    const columnNames = new Set(
      rows.map((row) => String(row.column_name || row.COLUMN_NAME || '').toLowerCase())
    );

    dentistArchiveColumnsCache = {
      hasIsArchived: columnNames.has('is_archived'),
      hasArchivedAt: columnNames.has('archived_at'),
    };
  } catch (_error) {
    dentistArchiveColumnsCache = {
      hasIsArchived: false,
      hasArchivedAt: false,
    };
  }

  return dentistArchiveColumnsCache;
}

function buildArchiveRecordCondition({ dentistAlias, recordDateExpr, hasIsArchived, hasArchivedAt }) {
  if (hasIsArchived && hasArchivedAt) {
    return `(COALESCE(${dentistAlias}.is_archived, 0) = 0 OR ${recordDateExpr} < COALESCE(${dentistAlias}.archived_at, NOW()))`;
  }

  if (hasArchivedAt) {
    return `${recordDateExpr} < COALESCE(${dentistAlias}.archived_at, NOW())`;
  }

  if (hasIsArchived) {
    return `COALESCE(${dentistAlias}.is_archived, 0) = 0`;
  }

  return '1=1';
}

function buildArchivedDentistHavingClause({ hasIsArchived, hasArchivedAt }) {
  if (hasIsArchived) {
    return 'COALESCE(d.is_archived, 0) = 0 OR COUNT(h.record_id) > 0';
  }

  if (hasArchivedAt) {
    return 'd.archived_at IS NULL OR COUNT(h.record_id) > 0';
  }

  return 'COUNT(h.record_id) > 0';
}

function buildDentistGroupByClause({ hasIsArchived, hasArchivedAt }) {
  const columns = ['d.id', 'd.name'];

  if (hasIsArchived) {
    columns.push('d.is_archived');
  }

  if (hasArchivedAt) {
    columns.push('d.archived_at');
  }

  return columns.join(', ');
}

function buildDentistSelectColumns({ hasIsArchived, hasArchivedAt }) {
  const columns = ['d.id', 'd.name'];

  if (hasIsArchived) {
    columns.push('COALESCE(d.is_archived, 0) AS is_archived');
  }

  if (hasArchivedAt) {
    columns.push('d.archived_at AS archived_at');
  }

  return columns.join(',\n        ');
}

function isValidDateOnly(dateOnly) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
    return false;
  }

  const [year, month, day] = dateOnly
    .split("-")
    .map((part) => Number.parseInt(part, 10));

  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year
    && parsed.getUTCMonth() === month - 1
    && parsed.getUTCDate() === day
  );
}

function parseDateQueryValue(value, label) {
  const raw = String(value || "").trim();
  if (!raw) {
    return {
      ok: true,
      provided: false,
      value: null,
      message: "",
    };
  }

  const dateOnly = raw.split("T")[0];
  if (!isValidDateOnly(dateOnly)) {
    return {
      ok: false,
      provided: true,
      value: null,
      message: `Invalid ${label}. Expected YYYY-MM-DD.`,
    };
  }

  return {
    ok: true,
    provided: true,
    value: dateOnly,
    message: "",
  };
}

function resolveReportDateRange(query) {
  const today = new Date().toISOString().split("T")[0];

  const parsedStartDate = parseDateQueryValue(query.startDate, "startDate");
  if (!parsedStartDate.ok) {
    return parsedStartDate;
  }

  let parsedDateAlias = {
    ok: true,
    provided: false,
    value: null,
    message: "",
  };
  if (!parsedStartDate.provided) {
    parsedDateAlias = parseDateQueryValue(query.date, "date");
    if (!parsedDateAlias.ok) {
      return parsedDateAlias;
    }
  }

  const parsedEndDate = parseDateQueryValue(query.endDate, "endDate");
  if (!parsedEndDate.ok) {
    return parsedEndDate;
  }

  const start = parsedStartDate.provided
    ? parsedStartDate.value
    : (parsedDateAlias.provided ? parsedDateAlias.value : today);
  const end = parsedEndDate.provided ? parsedEndDate.value : start;

  if (start > end) {
    return {
      ok: false,
      provided: true,
      value: null,
      message: "Invalid date range. startDate must be less than or equal to endDate.",
    };
  }

  return {
    ok: true,
    provided: true,
    value: null,
    message: "",
    start,
    end,
  };
}

function toPositiveInt(value) {
  const parsed = Number.parseInt(String(value || ""), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

function normalizeServiceToken(token, sourceType) {
  const cleaned = String(token || "").replace(/\s+/g, " ").trim();
  if (cleaned) return cleaned;
  return sourceType === "walk-in" ? "Walk-in" : "Unspecified";
}

function splitServiceText(value, sourceType) {
  const normalized = String(value || "").replace(/\r/g, "\n");
  const tokens = normalized
    .split(/[,;\n]+/)
    .map((token) => normalizeServiceToken(token, sourceType))
    .filter(Boolean);

  if (!tokens.length) {
    return [sourceType === "walk-in" ? "Walk-in" : "Unspecified"];
  }

  return [...new Set(tokens)];
}

router.get("/", async (req, res) => {
  try {
    const actorContext = assertReportActorContext(req, { disallowDentist: true });
    if (!actorContext.allowed) {
      return res.status(actorContext.status).json({ message: actorContext.message });
    }

    const dateRange = resolveReportDateRange(req.query);
    if (!dateRange.ok) {
      return res.status(400).json({ message: dateRange.message });
    }

    const { start, end } = dateRange;
    const actorScope = await getActorTenantScope(req);
    const tenantScopeAccess = assertResolvedTenantScope(actorScope);
    if (!tenantScopeAccess.allowed) {
      return res.status(tenantScopeAccess.status).json({ message: tenantScopeAccess.message });
    }
    const supportsAppointmentClinic = await hasAppointmentClinicColumn();
    const supportsAppointmentBranch = await hasAppointmentBranchColumn();
    const supportsQueueClinic = await hasQueueClinicColumn();
    const supportsQueueBranch = await hasQueueBranchColumn();
    const supportsUsersClinic = await hasUsersClinicColumn();
    const supportsUsersBranch = await hasUsersBranchColumn();

    const appointmentTenantScope = buildSourceTenantScope({
      actorScope,
      sourceAlias: 'a',
      ownerAlias: 'owner_a',
      supportsClinicColumn: supportsAppointmentClinic,
      supportsBranchColumn: supportsAppointmentBranch,
      supportsUsersClinic,
      supportsUsersBranch,
    });

    const walkInTenantScope = buildSourceTenantScope({
      actorScope,
      sourceAlias: 'q',
      ownerAlias: 'owner_q',
      supportsClinicColumn: supportsQueueClinic,
      supportsBranchColumn: supportsQueueBranch,
      supportsUsersClinic,
      supportsUsersBranch,
    });

    const dentistTenantScope = buildDentistTenantWhereClause({
      actorScope,
      supportsUsersClinic,
      supportsUsersBranch,
      dentistAlias: 'd',
    });

    const archiveColumns = await getDentistArchiveColumns();
    const handledArchiveCondition = buildArchiveRecordCondition({
      dentistAlias: 'd',
      recordDateExpr: 'h.handled_at',
      hasIsArchived: archiveColumns.hasIsArchived,
      hasArchivedAt: archiveColumns.hasArchivedAt,
    });
    const appointmentArchiveCondition = buildArchiveRecordCondition({
      dentistAlias: 'd',
      recordDateExpr: 'a.appointment_datetime',
      hasIsArchived: archiveColumns.hasIsArchived,
      hasArchivedAt: archiveColumns.hasArchivedAt,
    });
    const walkInArchiveCondition = buildArchiveRecordCondition({
      dentistAlias: 'd',
      recordDateExpr: 'q.time_added',
      hasIsArchived: archiveColumns.hasIsArchived,
      hasArchivedAt: archiveColumns.hasArchivedAt,
    });
    const dentistSelectColumns = buildDentistSelectColumns(archiveColumns);
    const dentistGroupByClause = buildDentistGroupByClause(archiveColumns);
    const dentistHavingClause = buildArchivedDentistHavingClause(archiveColumns);

    const appointmentTenantSql = appointmentTenantScope.whereClauses.length
      ? ` AND ${appointmentTenantScope.whereClauses.join(' AND ')}`
      : '';
    const walkInTenantSql = walkInTenantScope.whereClauses.length
      ? ` AND ${walkInTenantScope.whereClauses.join(' AND ')}`
      : '';
    const dentistTenantSql = dentistTenantScope.clause
      ? `WHERE ${dentistTenantScope.clause}`
      : '';

    // 1. Daily/Range Summary Queries
    
    // A. Patients Seen (Unique patients handled in range, including walk-ins)
    const [patientsSeenRes] = await db.query(
      `SELECT COUNT(DISTINCT handled.patient_id) AS count
       FROM (
         SELECT a.patient_id
         FROM appointments a
         ${appointmentTenantScope.joinSql}
         WHERE DATE(a.appointment_datetime) BETWEEN ? AND ?
           AND a.status IN ('Done', 'Completed')
           ${appointmentTenantSql}
         UNION ALL
         SELECT q.patient_id
         FROM walk_in_queue q
         ${walkInTenantScope.joinSql}
         WHERE DATE(q.time_added) BETWEEN ? AND ?
           AND q.source = 'walk-in'
           AND q.status IN ('Done', 'Completed')
           ${walkInTenantSql}
       ) handled`,
      [
        start,
        end,
        ...appointmentTenantScope.params,
        start,
        end,
        ...walkInTenantScope.params,
      ]
    );

    // B. Procedures Done (Appointments + walk-ins completed in range)
    const [proceduresRes] = await db.query(
      `SELECT (
         SELECT COUNT(*)
         FROM appointments a
         ${appointmentTenantScope.joinSql}
         WHERE DATE(a.appointment_datetime) BETWEEN ? AND ?
           AND a.status IN ('Done', 'Completed')
           ${appointmentTenantSql}
       ) + (
         SELECT COUNT(*)
         FROM walk_in_queue q
         ${walkInTenantScope.joinSql}
         WHERE DATE(q.time_added) BETWEEN ? AND ?
           AND q.source = 'walk-in'
           AND q.status IN ('Done', 'Completed')
           ${walkInTenantSql}
       ) AS count`,
      [
        start,
        end,
        ...appointmentTenantScope.params,
        start,
        end,
        ...walkInTenantScope.params,
      ]
    );

    // C. New Patients (Patients registered in range)
    let newPatients = 0;
    try {
        const [newPatientsRes] = await db.query(
            `SELECT COUNT(DISTINCT p.id) as count
             FROM patients p
             JOIN (
               SELECT a.patient_id
               FROM appointments a
               ${appointmentTenantScope.joinSql}
               WHERE DATE(a.appointment_datetime) BETWEEN ? AND ?
                 AND a.status IN ('Done', 'Completed')
                 ${appointmentTenantSql}

               UNION ALL

               SELECT q.patient_id
               FROM walk_in_queue q
               ${walkInTenantScope.joinSql}
               WHERE DATE(q.time_added) BETWEEN ? AND ?
                 AND q.source = 'walk-in'
                 AND q.status IN ('Done', 'Completed')
                 ${walkInTenantSql}
             ) handled ON handled.patient_id = p.id
             WHERE DATE(p.created_at) BETWEEN ? AND ?`,
            [
              start,
              end,
              ...appointmentTenantScope.params,
              start,
              end,
              ...walkInTenantScope.params,
              start,
              end,
            ]
        );
        newPatients = newPatientsRes[0].count;
    } catch (e) {
        console.warn("Could not query new patients (missing created_at?)", e);
    }

    // D. Average Treatment Duration 
    const [durationRes] = await db.query(
      `SELECT AVG(TIMESTAMPDIFF(MINUTE, a.appointment_datetime, a.end_datetime)) as avg_min 
       FROM appointments a
       ${appointmentTenantScope.joinSql}
       WHERE DATE(a.appointment_datetime) BETWEEN ? AND ?
         AND a.status IN ('Done', 'Completed')
         AND a.end_datetime IS NOT NULL
         ${appointmentTenantSql}`,
      [start, end, ...appointmentTenantScope.params]
    );

    // 2. Dentist Performance
    const [dentistPerformance] = await db.query(`
      SELECT
        ${dentistSelectColumns},
        COUNT(h.record_id) AS patientsHandled,
        COALESCE(AVG(h.duration_minutes), 0) AS avgTimePerPatient
      FROM dentists d
      LEFT JOIN (
        SELECT
          CAST(a.id AS CHAR) AS record_id,
          a.dentist_id,
          a.appointment_datetime AS handled_at,
          TIMESTAMPDIFF(MINUTE, a.appointment_datetime, a.end_datetime) AS duration_minutes
        FROM appointments a
        ${appointmentTenantScope.joinSql}
        WHERE DATE(a.appointment_datetime) BETWEEN ? AND ?
          AND a.status IN ('Done', 'Completed')
          ${appointmentTenantSql}

        UNION ALL

        SELECT
          CONCAT('walkin-', q.id) AS record_id,
          q.dentist_id,
          q.time_added AS handled_at,
          NULL AS duration_minutes
        FROM walk_in_queue q
        ${walkInTenantScope.joinSql}
        WHERE DATE(q.time_added) BETWEEN ? AND ?
          AND q.source = 'walk-in'
          AND q.status IN ('Done', 'Completed')
          ${walkInTenantSql}
      ) h ON d.id = h.dentist_id
        AND ${handledArchiveCondition}
      ${dentistTenantSql}
      GROUP BY ${dentistGroupByClause}
      HAVING ${dentistHavingClause}
    `, [
      start,
      end,
      ...appointmentTenantScope.params,
      start,
      end,
      ...walkInTenantScope.params,
      ...dentistTenantScope.params,
    ]);

    // 3. Treatment Distribution
    const [distributionRes] = await db.query(`
      SELECT
        distribution.dentist_id,
        distribution.treatment,
        SUM(distribution.entry_count) AS count
      FROM (
        SELECT
          a.dentist_id,
          COALESCE(NULLIF(TRIM(a.reason), ''), 'Unspecified') AS treatment,
          COUNT(a.id) AS entry_count
        FROM appointments a
        JOIN dentists d ON d.id = a.dentist_id
        ${appointmentTenantScope.joinSql}
        WHERE DATE(a.appointment_datetime) BETWEEN ? AND ?
          AND a.status IN ('Done', 'Completed')
          AND a.dentist_id IS NOT NULL
          AND ${appointmentArchiveCondition}
          ${appointmentTenantSql}
        GROUP BY a.dentist_id, COALESCE(NULLIF(TRIM(a.reason), ''), 'Unspecified')

        UNION ALL

        SELECT
          q.dentist_id,
          COALESCE(NULLIF(TRIM(q.notes), ''), 'Walk-in') AS treatment,
          COUNT(q.id) AS entry_count
        FROM walk_in_queue q
        JOIN dentists d ON d.id = q.dentist_id
        ${walkInTenantScope.joinSql}
        WHERE DATE(q.time_added) BETWEEN ? AND ?
          AND q.source = 'walk-in'
          AND q.status IN ('Done', 'Completed')
          AND q.dentist_id IS NOT NULL
          AND ${walkInArchiveCondition}
          ${walkInTenantSql}
        GROUP BY q.dentist_id, COALESCE(NULLIF(TRIM(q.notes), ''), 'Walk-in')
      ) distribution
      GROUP BY distribution.dentist_id, distribution.treatment
    `, [
      start,
      end,
      ...appointmentTenantScope.params,
      start,
      end,
      ...walkInTenantScope.params,
    ]);
    
    const distributionMap = distributionRes.reduce((acc, row) => {
        if (!acc[row.dentist_id]) {
            acc[row.dentist_id] = {};
        }
        const treatmentName = row.treatment || 'Unspecified';
        acc[row.dentist_id][treatmentName] = row.count;
        return acc;
    }, {});

    dentistPerformance.forEach(dentist => {
        dentist.treatmentDistribution = distributionMap[dentist.id] || {};
    });

    res.json({
      startDate: start,
      endDate: end,
      dailySummary: {
        patientsSeen: patientsSeenRes[0].count || 0,
        proceduresDone: proceduresRes[0].count || 0,
        newPatients: newPatients,
        avgTreatmentDuration: durationRes[0].avg_min ? `${Math.round(durationRes[0].avg_min)} min` : "0 min",
      },
      dentistPerformance,
    });

  } catch (err) {
    console.error("Reports API Error:", err);
    res.status(500).json({ message: "Failed to load reports" });
  }
});

router.get("/services/popularity", async (req, res) => {
  const dateRange = resolveReportDateRange(req.query);
  if (!dateRange.ok) {
    return res.status(400).json({ message: dateRange.message });
  }

  const { start, end } = dateRange;
  const rawDentistId = String(req.query.dentistId || "").trim();
  const dentistId = rawDentistId ? toPositiveInt(rawDentistId) : null;

  if (rawDentistId && !dentistId) {
    return res.status(400).json({
      message: "Invalid dentistId. Expected a positive integer.",
    });
  }

  try {
    const actorContext = assertReportActorContext(req, {
      requireDentistContextForDentist: true,
    });
    if (!actorContext.allowed) {
      return res.status(actorContext.status).json({ message: actorContext.message });
    }

    const actorRole = actorContext.role;
    const actorDentist = actorContext.dentistId;
    const actorScope = await getActorTenantScope(req);
    const tenantScopeAccess = assertResolvedTenantScope(actorScope);
    if (!tenantScopeAccess.allowed) {
      return res.status(tenantScopeAccess.status).json({ message: tenantScopeAccess.message });
    }
    const supportsAppointmentClinic = await hasAppointmentClinicColumn();
    const supportsAppointmentBranch = await hasAppointmentBranchColumn();
    const supportsQueueClinic = await hasQueueClinicColumn();
    const supportsQueueBranch = await hasQueueBranchColumn();
    const supportsUsersClinic = await hasUsersClinicColumn();
    const supportsUsersBranch = await hasUsersBranchColumn();

    let effectiveDentistId = dentistId;
    if (actorRole === "dentist") {
      if (effectiveDentistId && Number(effectiveDentistId) !== Number(actorDentist)) {
        return res.status(403).json({
          message: "Dentists can only access their own report data.",
        });
      }
      effectiveDentistId = actorDentist;
    }

    const appointmentTenantScope = buildSourceTenantScope({
      actorScope,
      sourceAlias: 'a',
      ownerAlias: 'owner_a',
      supportsClinicColumn: supportsAppointmentClinic,
      supportsBranchColumn: supportsAppointmentBranch,
      supportsUsersClinic,
      supportsUsersBranch,
    });

    const walkInTenantScope = buildSourceTenantScope({
      actorScope,
      sourceAlias: 'q',
      ownerAlias: 'owner_q',
      supportsClinicColumn: supportsQueueClinic,
      supportsBranchColumn: supportsQueueBranch,
      supportsUsersClinic,
      supportsUsersBranch,
    });

    const appointmentConditions = [
      "DATE(a.appointment_datetime) BETWEEN ? AND ?",
      "a.status IN ('Done', 'Completed')",
    ];
    const appointmentParams = [start, end];

    if (effectiveDentistId) {
      appointmentConditions.push("a.dentist_id = ?");
      appointmentParams.push(effectiveDentistId);
    }

    appointmentConditions.push(...appointmentTenantScope.whereClauses);
    appointmentParams.push(...appointmentTenantScope.params);

    const walkInConditions = [
      "DATE(q.time_added) BETWEEN ? AND ?",
      "q.source = 'walk-in'",
      "q.status IN ('Done', 'Completed')",
    ];
    const walkInParams = [start, end];

    if (effectiveDentistId) {
      walkInConditions.push("q.dentist_id = ?");
      walkInParams.push(effectiveDentistId);
    }

    walkInConditions.push(...walkInTenantScope.whereClauses);
    walkInParams.push(...walkInTenantScope.params);

    const [appointmentRows] = await db.query(
      `SELECT COALESCE(NULLIF(TRIM(a.reason), ''), 'Unspecified') AS service_text
       FROM appointments a
       ${appointmentTenantScope.joinSql}
       WHERE ${appointmentConditions.join(" AND ")}`,
      appointmentParams
    );

    const [walkInRows] = await db.query(
      `SELECT COALESCE(NULLIF(TRIM(q.notes), ''), 'Walk-in') AS service_text
       FROM walk_in_queue q
       ${walkInTenantScope.joinSql}
       WHERE ${walkInConditions.join(" AND ")}`,
      walkInParams
    );

    const counters = new Map();
    const totals = {
      appointments: 0,
      walkIns: 0,
      overall: 0,
    };

    const ensureCounter = (service) => {
      if (!counters.has(service)) {
        counters.set(service, {
          service,
          appointmentCount: 0,
          walkInCount: 0,
          totalCount: 0,
        });
      }
      return counters.get(service);
    };

    appointmentRows.forEach((row) => {
      const tokens = splitServiceText(row?.service_text, "appointment");
      tokens.forEach((service) => {
        const entry = ensureCounter(service);
        entry.appointmentCount += 1;
        entry.totalCount += 1;
        totals.appointments += 1;
        totals.overall += 1;
      });
    });

    walkInRows.forEach((row) => {
      const tokens = splitServiceText(row?.service_text, "walk-in");
      tokens.forEach((service) => {
        const entry = ensureCounter(service);
        entry.walkInCount += 1;
        entry.totalCount += 1;
        totals.walkIns += 1;
        totals.overall += 1;
      });
    });

    const services = [...counters.values()].sort((a, b) => {
      if (b.totalCount !== a.totalCount) return b.totalCount - a.totalCount;
      return a.service.localeCompare(b.service);
    });

    res.json({
      startDate: start,
      endDate: end,
      dentistId: effectiveDentistId || null,
      totals,
      services,
    });
  } catch (error) {
    console.error("Error building service popularity report:", error);
    res.status(500).json({ message: "Failed to load service popularity data." });
  }
});

// Dentist-only analytics summary for a date range
router.get("/dentist/:id/summary", async (req, res) => {
  const dentistId = toPositiveInt(req.params.id);
  if (!dentistId) {
    return res.status(400).json({ error: "Invalid dentist id." });
  }

  const dateRange = resolveReportDateRange(req.query);
  if (!dateRange.ok) {
    return res.status(400).json({ error: dateRange.message });
  }

  const { start, end } = dateRange;

  try {
    const access = await assertDentistReportAccess(req, dentistId);
    if (!access.allowed) {
      return res.status(access.status || 403).json({ error: access.message });
    }

    const actorScope = access.actorScope;
    const supportsAppointmentClinic = await hasAppointmentClinicColumn();
    const supportsAppointmentBranch = await hasAppointmentBranchColumn();
    const supportsQueueClinic = await hasQueueClinicColumn();
    const supportsQueueBranch = await hasQueueBranchColumn();
    const supportsUsersClinic = await hasUsersClinicColumn();
    const supportsUsersBranch = await hasUsersBranchColumn();

    const appointmentTenantScope = buildSourceTenantScope({
      actorScope,
      sourceAlias: 'a',
      ownerAlias: 'owner_a',
      supportsClinicColumn: supportsAppointmentClinic,
      supportsBranchColumn: supportsAppointmentBranch,
      supportsUsersClinic,
      supportsUsersBranch,
    });

    const walkInTenantScope = buildSourceTenantScope({
      actorScope,
      sourceAlias: 'q',
      ownerAlias: 'owner_q',
      supportsClinicColumn: supportsQueueClinic,
      supportsBranchColumn: supportsQueueBranch,
      supportsUsersClinic,
      supportsUsersBranch,
    });

    const appointmentTenantSql = appointmentTenantScope.whereClauses.length
      ? ` AND ${appointmentTenantScope.whereClauses.join(' AND ')}`
      : '';
    const walkInTenantSql = walkInTenantScope.whereClauses.length
      ? ` AND ${walkInTenantScope.whereClauses.join(' AND ')}`
      : '';

    const archiveColumns = await getDentistArchiveColumns();
    const appointmentArchiveCondition = buildArchiveRecordCondition({
      dentistAlias: 'd',
      recordDateExpr: 'a.appointment_datetime',
      hasIsArchived: archiveColumns.hasIsArchived,
      hasArchivedAt: archiveColumns.hasArchivedAt,
    });
    const walkInArchiveCondition = buildArchiveRecordCondition({
      dentistAlias: 'd',
      recordDateExpr: 'q.time_added',
      hasIsArchived: archiveColumns.hasIsArchived,
      hasArchivedAt: archiveColumns.hasArchivedAt,
    });
    const dentistSelectColumns = [
      'id',
      'name',
      archiveColumns.hasIsArchived ? 'COALESCE(is_archived, 0) AS is_archived' : null,
      archiveColumns.hasArchivedAt ? 'archived_at' : null,
    ].filter(Boolean).join(', ');

    const [dentistRows] = await db.query(
      `SELECT ${dentistSelectColumns} FROM dentists WHERE id = ? LIMIT 1`,
      [dentistId]
    );

    if (!dentistRows.length) {
      return res.status(404).json({ error: "Dentist not found." });
    }

    const [summaryRows] = await db.query(
      `SELECT
         COUNT(DISTINCT handled.patient_id) AS patientsHandled,
         COUNT(*) AS proceduresDone,
         AVG(handled.duration_minutes) AS avgTreatmentMinutes
       FROM (
         SELECT
           a.patient_id,
           TIMESTAMPDIFF(MINUTE, a.appointment_datetime, a.end_datetime) AS duration_minutes
         FROM appointments a
         JOIN dentists d ON d.id = a.dentist_id
         ${appointmentTenantScope.joinSql}
         WHERE a.dentist_id = ?
           AND DATE(a.appointment_datetime) BETWEEN ? AND ?
           AND a.status IN ('Done', 'Completed')
           AND ${appointmentArchiveCondition}
           ${appointmentTenantSql}

         UNION ALL

         SELECT
           q.patient_id,
           NULL AS duration_minutes
         FROM walk_in_queue q
         JOIN dentists d ON d.id = q.dentist_id
         ${walkInTenantScope.joinSql}
         WHERE q.dentist_id = ?
           AND DATE(q.time_added) BETWEEN ? AND ?
           AND q.source = 'walk-in'
           AND q.status IN ('Done', 'Completed')
           AND ${walkInArchiveCondition}
           ${walkInTenantSql}
       ) handled`,
      [
        dentistId,
        start,
        end,
        ...appointmentTenantScope.params,
        dentistId,
        start,
        end,
        ...walkInTenantScope.params,
      ]
    );

    const [distributionRows] = await db.query(
      `SELECT
         distribution.service,
         SUM(distribution.entry_count) AS count
       FROM (
         SELECT
           COALESCE(NULLIF(TRIM(a.reason), ''), 'Unspecified') AS service,
           COUNT(*) AS entry_count
         FROM appointments a
         JOIN dentists d ON d.id = a.dentist_id
         ${appointmentTenantScope.joinSql}
         WHERE a.dentist_id = ?
           AND DATE(a.appointment_datetime) BETWEEN ? AND ?
           AND a.status IN ('Done', 'Completed')
           AND ${appointmentArchiveCondition}
           ${appointmentTenantSql}
         GROUP BY COALESCE(NULLIF(TRIM(a.reason), ''), 'Unspecified')

         UNION ALL

         SELECT
           COALESCE(NULLIF(TRIM(q.notes), ''), 'Walk-in') AS service,
           COUNT(*) AS entry_count
         FROM walk_in_queue q
         JOIN dentists d ON d.id = q.dentist_id
         ${walkInTenantScope.joinSql}
         WHERE q.dentist_id = ?
           AND DATE(q.time_added) BETWEEN ? AND ?
           AND q.source = 'walk-in'
           AND q.status IN ('Done', 'Completed')
           AND ${walkInArchiveCondition}
           ${walkInTenantSql}
         GROUP BY COALESCE(NULLIF(TRIM(q.notes), ''), 'Walk-in')
       ) distribution
       GROUP BY distribution.service
       ORDER BY count DESC, service ASC`,
      [
        dentistId,
        start,
        end,
        ...appointmentTenantScope.params,
        dentistId,
        start,
        end,
        ...walkInTenantScope.params,
      ]
    );

    const summary = summaryRows[0] || {};
    const avgMinutes = Number(summary.avgTreatmentMinutes || 0);

    res.json({
      dentist: dentistRows[0],
      startDate: start,
      endDate: end,
      summary: {
        patientsHandled: Number(summary.patientsHandled || 0),
        proceduresDone: Number(summary.proceduresDone || 0),
        avgTreatmentMinutes: avgMinutes,
        avgTreatmentDuration: avgMinutes > 0 ? `${Math.round(avgMinutes)} min` : "0 min",
      },
      serviceDistribution: distributionRows.map((row) => ({
        service: row.service,
        count: Number(row.count || 0),
      })),
    });
  } catch (error) {
    console.error("Error fetching dentist summary report:", error);
    res.status(500).json({ error: "Failed to load dentist summary report." });
  }
});

// Get detailed list of patients for a specific dentist on a specific date range
router.get("/dentist/:id/patients", async (req, res) => {
  const dentistId = toPositiveInt(req.params.id);
  if (!dentistId) {
    return res.status(400).json({ error: "Invalid dentist id." });
  }

  const dateRange = resolveReportDateRange(req.query);
  if (!dateRange.ok) {
    return res.status(400).json({ error: dateRange.message });
  }

  const { start, end } = dateRange;

  try {
    const access = await assertDentistReportAccess(req, dentistId);
    if (!access.allowed) {
      return res.status(access.status || 403).json({ error: access.message });
    }

    const actorScope = access.actorScope;
    const supportsAppointmentClinic = await hasAppointmentClinicColumn();
    const supportsAppointmentBranch = await hasAppointmentBranchColumn();
    const supportsQueueClinic = await hasQueueClinicColumn();
    const supportsQueueBranch = await hasQueueBranchColumn();
    const supportsUsersClinic = await hasUsersClinicColumn();
    const supportsUsersBranch = await hasUsersBranchColumn();

    const appointmentTenantScope = buildSourceTenantScope({
      actorScope,
      sourceAlias: 'a',
      ownerAlias: 'owner_a',
      supportsClinicColumn: supportsAppointmentClinic,
      supportsBranchColumn: supportsAppointmentBranch,
      supportsUsersClinic,
      supportsUsersBranch,
    });

    const walkInTenantScope = buildSourceTenantScope({
      actorScope,
      sourceAlias: 'q',
      ownerAlias: 'owner_q',
      supportsClinicColumn: supportsQueueClinic,
      supportsBranchColumn: supportsQueueBranch,
      supportsUsersClinic,
      supportsUsersBranch,
    });

    const appointmentTenantSql = appointmentTenantScope.whereClauses.length
      ? ` AND ${appointmentTenantScope.whereClauses.join(' AND ')}`
      : '';
    const walkInTenantSql = walkInTenantScope.whereClauses.length
      ? ` AND ${walkInTenantScope.whereClauses.join(' AND ')}`
      : '';

    const archiveColumns = await getDentistArchiveColumns();
    const appointmentArchiveCondition = buildArchiveRecordCondition({
      dentistAlias: 'd',
      recordDateExpr: 'a.appointment_datetime',
      hasIsArchived: archiveColumns.hasIsArchived,
      hasArchivedAt: archiveColumns.hasArchivedAt,
    });
    const walkInArchiveCondition = buildArchiveRecordCondition({
      dentistAlias: 'd',
      recordDateExpr: 'q.time_added',
      hasIsArchived: archiveColumns.hasIsArchived,
      hasArchivedAt: archiveColumns.hasArchivedAt,
    });

    const query = `
      SELECT
        history.appointment_id,
        history.patient_id,
        history.full_name,
        history.appointment_datetime,
        history.end_datetime,
        history.reason,
        history.status
      FROM (
        SELECT
          CAST(a.id AS CHAR) AS appointment_id,
          p.id AS patient_id,
          p.full_name,
          a.appointment_datetime,
          a.end_datetime,
          a.reason,
          a.status
        FROM patients p
        JOIN appointments a ON p.id = a.patient_id
        JOIN dentists d ON d.id = a.dentist_id
        ${appointmentTenantScope.joinSql}
        WHERE a.dentist_id = ?
          AND DATE(a.appointment_datetime) BETWEEN ? AND ?
          AND a.status IN ('Done', 'Completed')
          AND ${appointmentArchiveCondition}
          ${appointmentTenantSql}

        UNION ALL

        SELECT
          CONCAT('walkin-', q.id) AS appointment_id,
          p.id AS patient_id,
          p.full_name,
          q.time_added AS appointment_datetime,
          NULL AS end_datetime,
          COALESCE(NULLIF(TRIM(q.notes), ''), 'Walk-in') AS reason,
          q.status
        FROM patients p
        JOIN walk_in_queue q ON p.id = q.patient_id
        JOIN dentists d ON d.id = q.dentist_id
        ${walkInTenantScope.joinSql}
        WHERE q.dentist_id = ?
          AND DATE(q.time_added) BETWEEN ? AND ?
          AND q.source = 'walk-in'
          AND q.status IN ('Done', 'Completed')
          AND ${walkInArchiveCondition}
          ${walkInTenantSql}
      ) history
      ORDER BY history.appointment_datetime ASC
    `;
    const [rows] = await db.query(query, [
      dentistId,
      start,
      end,
      ...appointmentTenantScope.params,
      dentistId,
      start,
      end,
      ...walkInTenantScope.params,
    ]);
    res.json({ patients: rows });
  } catch (error) {
    console.error("Error fetching dentist patient details:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;