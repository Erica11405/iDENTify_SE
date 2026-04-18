const express = require("express");
const router = express.Router();
const db = require("../db");

function isDateOnly(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
}

function getTodayDateOnly() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
}

function toDateRange(startDate, endDate) {
  const today = getTodayDateOnly();
  let start = isDateOnly(startDate) ? String(startDate) : today;
  let end = isDateOnly(endDate) ? String(endDate) : start;

  if (start > end) {
    const tmp = start;
    start = end;
    end = tmp;
  }

  return { start, end };
}

function toOptionalInt(value) {
  const parsed = Number.parseInt(String(value || ""), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

function roundMoney(value) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

function toMoney(value, { allowZero = true } = {}) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  const rounded = roundMoney(parsed);
  if (!allowZero && rounded <= 0) return null;
  if (allowZero && rounded < 0) return null;
  return rounded;
}

function normalizeBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === "") return Boolean(fallback);
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  const normalized = String(value).trim().toLowerCase();
  return ["1", "true", "yes", "on"].includes(normalized);
}

const CASHLESS_ALIASES = new Set([
  "cashless",
  "gcash",
  "online",
  "online transfer",
  "bank transfer",
  "e-wallet",
  "ewallet",
]);

function normalizeMethod(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return "";
  if (normalized === "cash") return "cash";
  if (CASHLESS_ALIASES.has(normalized)) return "cashless";
  return "";
}

function normalizeMethodForDisplay(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return "";
  return normalized === "cash" ? "cash" : "cashless";
}

function isOnlineMethod(method) {
  return normalizeMethodForDisplay(method) !== "cash";
}

function sanitizeText(value, max = 255) {
  const str = String(value || "").trim();
  if (!str) return "";
  return str.slice(0, max);
}

let hasQueueClinicColumnCache = null;
let hasQueueBranchColumnCache = null;
let hasAppointmentClinicColumnCache = null;
let hasAppointmentBranchColumnCache = null;
let hasUsersClinicColumnCache = null;
let hasUsersBranchColumnCache = null;

function normalizeActorRole(req) {
  const normalized = String(req.headers['x-user-role'] || '').trim().toLowerCase();
  if (normalized === 'super_admin') return 'superadmin';
  if (normalized === 'global_admin') return 'globaladmin';
  return normalized;
}

function actorUserId(req) {
  return toOptionalInt(req.headers['x-user-id']);
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
    const clinicId = supportsUsersClinic ? toOptionalInt(row.clinic_id) : null;
    const branchId = supportsUsersBranch ? toOptionalInt(row.branch_id) : null;

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

function hasTenantScopeViolation(scope, clinicId, branchId) {
  if (!scope?.scoped) return null;

  if (scope.clinicId && clinicId && Number(scope.clinicId) !== Number(clinicId)) {
    return 'You can only access payments within your assigned clinic.';
  }

  if (scope.branchId && branchId && Number(scope.branchId) !== Number(branchId)) {
    return 'You can only access payments within your assigned branch.';
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

async function resolveClinicIdFromBranch(branchId) {
  const parsedBranchId = toOptionalInt(branchId);
  if (!parsedBranchId) return null;

  try {
    const [rows] = await db.query(
      `SELECT clinic_id FROM clinic_branches WHERE id = ? LIMIT 1`,
      [parsedBranchId]
    );

    if (!rows.length) return null;
    return toOptionalInt(rows[0]?.clinic_id);
  } catch (_err) {
    return null;
  }
}

async function inferTenantFromDentist(dentistId) {
  const parsedDentistId = toOptionalInt(dentistId);
  if (!parsedDentistId) {
    return { clinicId: null, branchId: null };
  }

  const supportsUsersClinic = await hasUsersClinicColumn();
  const supportsUsersBranch = await hasUsersBranchColumn();
  if (!supportsUsersClinic && !supportsUsersBranch) {
    return { clinicId: null, branchId: null };
  }

  const selectColumns = [];
  if (supportsUsersClinic) selectColumns.push('clinic_id');
  if (supportsUsersBranch) selectColumns.push('branch_id');

  try {
    const [rows] = await db.query(
      `SELECT ${selectColumns.join(', ')}
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
      clinicId: supportsUsersClinic ? toOptionalInt(row.clinic_id) : null,
      branchId: supportsUsersBranch ? toOptionalInt(row.branch_id) : null,
    };
  } catch (_err) {
    return { clinicId: null, branchId: null };
  }
}

function canMutatePayments(req) {
  const actorRole = normalizeActorRole(req);

  // Backward compatibility for legacy clients that do not yet send actor context.
  if (!actorRole) {
    return { allowed: true };
  }

  if (actorRole === 'dentist') {
    return {
      allowed: false,
      message: 'Dentists have read-only access to payments. Only dental aides can edit payment records.',
    };
  }

  if (actorRole !== 'aide') {
    return {
      allowed: false,
      message: 'Only dental aides can create or update payment records.',
    };
  }

  return { allowed: true };
}

function normalizeServices(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item || "").trim())
      .filter(Boolean);
  }

  const text = String(value || "").trim();
  if (!text) return [];

  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      return parsed
        .map((item) => String(item || "").trim())
        .filter(Boolean);
    }
  } catch {
    // Ignore JSON parse errors and fall back to comma parsing.
  }

  return text
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeServiceLabel(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function labelsMatch(left, right) {
  return left === right || left.includes(right) || right.includes(left);
}

function toUniqueServiceEntries(value) {
  const seen = new Set();
  const entries = [];

  normalizeServices(value).forEach((item) => {
    const raw = String(item || "").trim();
    const label = normalizeServiceLabel(raw);
    if (!label || seen.has(label)) return;
    seen.add(label);
    entries.push({ raw, label });
  });

  return entries;
}

function splitIncomingServicesByExisting(existingServices, incomingServices) {
  const existingEntries = toUniqueServiceEntries(existingServices);
  const incomingEntries = toUniqueServiceEntries(incomingServices);

  if (incomingEntries.length === 0) {
    return {
      matched_services: [],
      remaining_services: [],
      overlap_count: 0,
      incoming_count: 0,
    };
  }

  const matchedServices = [];
  const remainingServices = [];

  incomingEntries.forEach((incomingEntry) => {
    const hasMatch = existingEntries.some((existingEntry) => (
      labelsMatch(existingEntry.label, incomingEntry.label)
    ));

    if (hasMatch) {
      matchedServices.push(incomingEntry.raw);
    } else {
      remainingServices.push(incomingEntry.raw);
    }
  });

  return {
    matched_services: matchedServices,
    remaining_services: remainingServices,
    overlap_count: matchedServices.length,
    incoming_count: incomingEntries.length,
  };
}

function hasServiceOverlap(existingServices, incomingServices) {
  return splitIncomingServicesByExisting(existingServices, incomingServices).overlap_count > 0;
}

function formatServicesText(services) {
  return normalizeServices(services).join(", ");
}

function mapPaymentRow(row) {
  if (!row) return null;

  const latestPaymentAt = row.latest_payment_at || row.updated_at || row.created_at || null;

  return {
    ...row,
    total_due: roundMoney(row.total_due),
    amount_paid: roundMoney(row.amount_paid),
    balance_due: roundMoney(row.balance_due),
    is_deposit: Boolean(Number(row.is_deposit || 0)),
    latest_payment_method: normalizeMethodForDisplay(row.latest_payment_method),
    latest_payment_at: latestPaymentAt,
    has_proof: Boolean(Number(row.has_proof || 0)),
    transaction_count: Number(row.transaction_count || 0),
  };
}

function mapTransactionRow(row) {
  return {
    ...row,
    payment_method: normalizeMethodForDisplay(row.payment_method),
    amount_paid: roundMoney(row.amount_paid),
    cash_received: row.cash_received === null ? null : roundMoney(row.cash_received),
    change_amount: row.change_amount === null ? null : roundMoney(row.change_amount),
  };
}

function getPaymentStatus(balanceDue) {
  return balanceDue <= 0 ? "Paid" : "Partial";
}

function getLinkedWorkflowStatus(balanceDue, isDeposit) {
  return "Done";
}

function determineLinkedWorkflowStatusFromRows(rows, fallbackStatus) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return fallbackStatus;
  }

  return "Done";
}

async function resolveLinkedWorkflowStatus(connection, {
  queueId,
  appointmentId,
  fallbackBalanceDue,
  fallbackIsDeposit,
}) {
  const linkedQueueId = toOptionalInt(queueId);
  const linkedAppointmentId = toOptionalInt(appointmentId);
  const fallbackStatus = getLinkedWorkflowStatus(
    roundMoney(fallbackBalanceDue),
    Boolean(fallbackIsDeposit)
  );

  if (!linkedQueueId && !linkedAppointmentId) {
    return fallbackStatus;
  }

  let rows = [];

  if (linkedQueueId) {
    const [queueRows] = await connection.query(
      `SELECT balance_due, is_deposit FROM payment_records WHERE queue_id = ?`,
      [linkedQueueId]
    );
    rows = queueRows;
  }

  if (rows.length === 0 && linkedAppointmentId) {
    const [appointmentRows] = await connection.query(
      `SELECT balance_due, is_deposit FROM payment_records WHERE appointment_id = ?`,
      [linkedAppointmentId]
    );
    rows = appointmentRows;
  }

  return determineLinkedWorkflowStatusFromRows(rows, fallbackStatus);
}

async function syncQueueAndAppointmentStatus(connection, { queueId, appointmentId, status }) {
  let linkedAppointmentId = toOptionalInt(appointmentId);
  let linkedQueueId = toOptionalInt(queueId);

  if (!linkedQueueId && linkedAppointmentId) {
    const [queueByAppointment] = await connection.query(
      `SELECT id FROM walk_in_queue WHERE appointment_id = ? ORDER BY id DESC LIMIT 1`,
      [linkedAppointmentId]
    );

    if (queueByAppointment.length > 0) {
      linkedQueueId = toOptionalInt(queueByAppointment[0].id);
    }
  }

  if (linkedQueueId) {
    await connection.query(
      `UPDATE walk_in_queue SET status = ? WHERE id = ?`,
      [status, linkedQueueId]
    );

    const [queueRows] = await connection.query(
      `SELECT appointment_id FROM walk_in_queue WHERE id = ? LIMIT 1`,
      [linkedQueueId]
    );

    if (!linkedAppointmentId && queueRows.length > 0) {
      linkedAppointmentId = toOptionalInt(queueRows[0].appointment_id);
    }
  }

  if (linkedAppointmentId) {
    await connection.query(
      `UPDATE appointments SET status = ? WHERE id = ?`,
      [status, linkedAppointmentId]
    );
  }
}

function buildPaymentTenantJoinConfig({
  actorScope,
  supportsQueueClinic,
  supportsQueueBranch,
  supportsAppointmentClinic,
  supportsAppointmentBranch,
  supportsUsersClinic,
  supportsUsersBranch,
}) {
  const needsOwnerJoin = Boolean(actorScope?.scoped) && (
    (actorScope?.clinicId && !supportsQueueClinic && !supportsAppointmentClinic && supportsUsersClinic) ||
    (actorScope?.branchId && !supportsQueueBranch && !supportsAppointmentBranch && supportsUsersBranch)
  );

  const joinSql = [
    'LEFT JOIN walk_in_queue q ON q.id = pr.queue_id',
    'LEFT JOIN appointments a ON a.id = pr.appointment_id',
  ];

  if (needsOwnerJoin) {
    joinSql.push(`LEFT JOIN (
      SELECT dentist_id, MAX(clinic_id) AS clinic_id, MAX(branch_id) AS branch_id
      FROM users
      GROUP BY dentist_id
    ) owner ON owner.dentist_id = COALESCE(pr.dentist_id, q.dentist_id, a.dentist_id)`);
  }

  const clinicExpressions = [];
  const branchExpressions = [];

  if (supportsQueueClinic) clinicExpressions.push('q.clinic_id');
  if (supportsAppointmentClinic) clinicExpressions.push('a.clinic_id');
  if (needsOwnerJoin) clinicExpressions.push('owner.clinic_id');

  if (supportsQueueBranch) branchExpressions.push('q.branch_id');
  if (supportsAppointmentBranch) branchExpressions.push('a.branch_id');
  if (needsOwnerJoin) branchExpressions.push('owner.branch_id');

  return {
    joinSql: joinSql.join('\n'),
    clinicExpression: clinicExpressions.length > 0 ? `COALESCE(${clinicExpressions.join(', ')})` : null,
    branchExpression: branchExpressions.length > 0 ? `COALESCE(${branchExpressions.join(', ')})` : null,
  };
}

async function resolveTenantFromQueue(connection, queueId) {
  const parsedQueueId = toOptionalInt(queueId);
  if (!parsedQueueId) {
    return { clinicId: null, branchId: null, dentistId: null };
  }

  const supportsQueueClinic = await hasQueueClinicColumn();
  const supportsQueueBranch = await hasQueueBranchColumn();

  const selectColumns = ['dentist_id'];
  if (supportsQueueClinic) selectColumns.push('clinic_id');
  if (supportsQueueBranch) selectColumns.push('branch_id');

  try {
    const [rows] = await connection.query(
      `SELECT ${selectColumns.join(', ')} FROM walk_in_queue WHERE id = ? LIMIT 1`,
      [parsedQueueId]
    );

    if (!rows.length) {
      return { clinicId: null, branchId: null, dentistId: null };
    }

    const row = rows[0] || {};
    let clinicId = supportsQueueClinic ? toOptionalInt(row.clinic_id) : null;
    const branchId = supportsQueueBranch ? toOptionalInt(row.branch_id) : null;
    const dentistId = toOptionalInt(row.dentist_id);

    if (!clinicId && branchId) {
      clinicId = await resolveClinicIdFromBranch(branchId);
    }

    return { clinicId, branchId, dentistId };
  } catch (_err) {
    return { clinicId: null, branchId: null, dentistId: null };
  }
}

async function resolveTenantFromAppointment(connection, appointmentId) {
  const parsedAppointmentId = toOptionalInt(appointmentId);
  if (!parsedAppointmentId) {
    return { clinicId: null, branchId: null, dentistId: null };
  }

  const supportsAppointmentClinic = await hasAppointmentClinicColumn();
  const supportsAppointmentBranch = await hasAppointmentBranchColumn();

  const selectColumns = ['dentist_id'];
  if (supportsAppointmentClinic) selectColumns.push('clinic_id');
  if (supportsAppointmentBranch) selectColumns.push('branch_id');

  try {
    const [rows] = await connection.query(
      `SELECT ${selectColumns.join(', ')} FROM appointments WHERE id = ? LIMIT 1`,
      [parsedAppointmentId]
    );

    if (!rows.length) {
      return { clinicId: null, branchId: null, dentistId: null };
    }

    const row = rows[0] || {};
    let clinicId = supportsAppointmentClinic ? toOptionalInt(row.clinic_id) : null;
    const branchId = supportsAppointmentBranch ? toOptionalInt(row.branch_id) : null;
    const dentistId = toOptionalInt(row.dentist_id);

    if (!clinicId && branchId) {
      clinicId = await resolveClinicIdFromBranch(branchId);
    }

    return { clinicId, branchId, dentistId };
  } catch (_err) {
    return { clinicId: null, branchId: null, dentistId: null };
  }
}

async function resolvePaymentTenant(connection, { queueId, appointmentId, dentistId, actorScope }) {
  let resolvedClinicId = null;
  let resolvedBranchId = null;
  let resolvedDentistId = toOptionalInt(dentistId);

  if (queueId) {
    const queueTenant = await resolveTenantFromQueue(connection, queueId);
    if (queueTenant.clinicId) resolvedClinicId = queueTenant.clinicId;
    if (queueTenant.branchId) resolvedBranchId = queueTenant.branchId;
    if (!resolvedDentistId && queueTenant.dentistId) {
      resolvedDentistId = queueTenant.dentistId;
    }
  }

  if ((!resolvedClinicId || !resolvedBranchId) && appointmentId) {
    const appointmentTenant = await resolveTenantFromAppointment(connection, appointmentId);
    if (!resolvedClinicId && appointmentTenant.clinicId) resolvedClinicId = appointmentTenant.clinicId;
    if (!resolvedBranchId && appointmentTenant.branchId) resolvedBranchId = appointmentTenant.branchId;
    if (!resolvedDentistId && appointmentTenant.dentistId) {
      resolvedDentistId = appointmentTenant.dentistId;
    }
  }

  if ((!resolvedClinicId || !resolvedBranchId) && resolvedDentistId) {
    const inferredTenant = await inferTenantFromDentist(resolvedDentistId);
    if (!resolvedClinicId) resolvedClinicId = inferredTenant.clinicId;
    if (!resolvedBranchId) resolvedBranchId = inferredTenant.branchId;
  }

  if (!resolvedClinicId && resolvedBranchId) {
    resolvedClinicId = await resolveClinicIdFromBranch(resolvedBranchId);
  }

  const scopeViolation = hasTenantScopeViolation(actorScope, resolvedClinicId, resolvedBranchId);
  return {
    clinicId: resolvedClinicId,
    branchId: resolvedBranchId,
    scopeViolation,
  };
}

async function ensurePaymentRecordScope(connection, paymentRow, actorScope) {
  if (!paymentRow) {
    return null;
  }

  const tenant = await resolvePaymentTenant(connection, {
    queueId: paymentRow.queue_id,
    appointmentId: paymentRow.appointment_id,
    dentistId: paymentRow.dentist_id,
    actorScope,
  });

  return tenant.scopeViolation;
}

async function fetchPaymentRecord(connection, paymentId) {
  const [rows] = await connection.query(
    `SELECT
      pr.*,
      COALESCE(p.full_name, pr.patient_name) AS patient_name,
      COALESCE(d.name, pr.dentist_name) AS dentist_name,
      latest_tx.payment_method AS latest_payment_method,
      latest_tx.created_at AS latest_payment_at,
      CASE WHEN COALESCE(latest_tx.proof_data, '') = '' THEN 0 ELSE 1 END AS has_proof,
      (SELECT COUNT(*) FROM payment_transactions tx WHERE tx.payment_record_id = pr.id) AS transaction_count
    FROM payment_records pr
    LEFT JOIN patients p ON p.id = pr.patient_id
    LEFT JOIN dentists d ON d.id = pr.dentist_id
    LEFT JOIN payment_transactions latest_tx
      ON latest_tx.id = (
        SELECT tx2.id
        FROM payment_transactions tx2
        WHERE tx2.payment_record_id = pr.id
        ORDER BY tx2.created_at DESC, tx2.id DESC
        LIMIT 1
      )
    WHERE pr.id = ?
    LIMIT 1`,
    [paymentId]
  );

  return mapPaymentRow(rows[0] || null);
}

async function fetchPaymentTransactions(connection, paymentId) {
  const [rows] = await connection.query(
    `SELECT
      id,
      payment_record_id,
      payment_method,
      amount_paid,
      cash_received,
      change_amount,
      proof_name,
      proof_data,
      created_at
    FROM payment_transactions
    WHERE payment_record_id = ?
    ORDER BY created_at DESC, id DESC`,
    [paymentId]
  );

  return rows.map(mapTransactionRow);
}

router.get("/", async (req, res) => {
  const { startDate, endDate, search } = req.query;
  const { start, end } = toDateRange(startDate, endDate);
  const keyword = sanitizeText(search, 120);

  try {
    const actorScope = await getActorTenantScope(req);
    const supportsQueueClinic = await hasQueueClinicColumn();
    const supportsQueueBranch = await hasQueueBranchColumn();
    const supportsAppointmentClinic = await hasAppointmentClinicColumn();
    const supportsAppointmentBranch = await hasAppointmentBranchColumn();
    const supportsUsersClinic = await hasUsersClinicColumn();
    const supportsUsersBranch = await hasUsersBranchColumn();

    const tenantJoinConfig = buildPaymentTenantJoinConfig({
      actorScope,
      supportsQueueClinic,
      supportsQueueBranch,
      supportsAppointmentClinic,
      supportsAppointmentBranch,
      supportsUsersClinic,
      supportsUsersBranch,
    });

    const params = [start, end];
    const whereClauses = [
      `(
        DATE(COALESCE(latest_tx.created_at, pr.updated_at, pr.created_at)) BETWEEN ? AND ?
        OR pr.balance_due > 0
      )`,
    ];

    if (keyword) {
      const term = `%${keyword}%`;
      params.push(term, term, term);
      whereClauses.push(`(
        COALESCE(p.full_name, pr.patient_name) LIKE ?
        OR COALESCE(d.name, pr.dentist_name) LIKE ?
        OR COALESCE(pr.services_text, '') LIKE ?
      )`);
    }

    appendTenantWhereClauses({
      whereClauses,
      params,
      scope: actorScope,
      clinicExpression: tenantJoinConfig.clinicExpression,
      branchExpression: tenantJoinConfig.branchExpression,
    });

    const whereSql = `WHERE ${whereClauses.join(" AND ")}`;

    const [rows] = await db.query(
      `SELECT
        pr.*,
        COALESCE(p.full_name, pr.patient_name) AS patient_name,
        COALESCE(d.name, pr.dentist_name) AS dentist_name,
        latest_tx.payment_method AS latest_payment_method,
        latest_tx.created_at AS latest_payment_at,
        CASE WHEN COALESCE(latest_tx.proof_data, '') = '' THEN 0 ELSE 1 END AS has_proof,
        (SELECT COUNT(*) FROM payment_transactions tx WHERE tx.payment_record_id = pr.id) AS transaction_count
      FROM payment_records pr
      ${tenantJoinConfig.joinSql}
      LEFT JOIN patients p ON p.id = pr.patient_id
      LEFT JOIN dentists d ON d.id = pr.dentist_id
      LEFT JOIN payment_transactions latest_tx
        ON latest_tx.id = (
          SELECT tx2.id
          FROM payment_transactions tx2
          WHERE tx2.payment_record_id = pr.id
          ORDER BY tx2.created_at DESC, tx2.id DESC
          LIMIT 1
        )
      ${whereSql}
      ORDER BY (pr.balance_due > 0) DESC, COALESCE(latest_tx.created_at, pr.updated_at, pr.created_at) DESC, pr.id DESC`,
      params
    );

    res.json(rows.map(mapPaymentRow));
  } catch (error) {
    console.error("Error fetching payment records:", error);
    res.status(500).json({ message: "Failed to load payment records." });
  }
});

router.get("/by-queue/:queueId", async (req, res) => {
  const queueId = toOptionalInt(req.params.queueId);
  if (!queueId) {
    return res.status(400).json({ message: "Invalid queue id." });
  }

  const connection = await db.getConnection();
  try {
    const actorScope = await getActorTenantScope(req);

    const [rows] = await connection.query(
      `SELECT id, queue_id, appointment_id, dentist_id
       FROM payment_records
       WHERE queue_id = ?
       ORDER BY updated_at DESC, id DESC
       LIMIT 1`,
      [queueId]
    );

    if (!rows.length) {
      return res.json(null);
    }

    const scopeViolation = await ensurePaymentRecordScope(connection, rows[0], actorScope);
    if (scopeViolation) {
      return res.status(403).json({ message: scopeViolation });
    }

    const record = await fetchPaymentRecord(connection, rows[0].id);
    const transactions = await fetchPaymentTransactions(connection, rows[0].id);
    return res.json({ ...record, transactions });
  } catch (error) {
    console.error("Error fetching payment by queue:", error);
    res.status(500).json({ message: "Failed to load payment record." });
  } finally {
    connection.release();
  }
});

router.post("/unpaid-matches", async (req, res) => {
  const patientId = toOptionalInt(req.body.patient_id);
  const incomingServices = normalizeServices(req.body.services || req.body.services_text);

  if (!patientId) {
    return res.status(400).json({ message: "patient_id is required." });
  }

  if (incomingServices.length === 0) {
    return res.json({ matches: [] });
  }

  try {
    const actorScope = await getActorTenantScope(req);
    const supportsQueueClinic = await hasQueueClinicColumn();
    const supportsQueueBranch = await hasQueueBranchColumn();
    const supportsAppointmentClinic = await hasAppointmentClinicColumn();
    const supportsAppointmentBranch = await hasAppointmentBranchColumn();
    const supportsUsersClinic = await hasUsersClinicColumn();
    const supportsUsersBranch = await hasUsersBranchColumn();

    const tenantJoinConfig = buildPaymentTenantJoinConfig({
      actorScope,
      supportsQueueClinic,
      supportsQueueBranch,
      supportsAppointmentClinic,
      supportsAppointmentBranch,
      supportsUsersClinic,
      supportsUsersBranch,
    });

    const whereClauses = [
      'pr.patient_id = ?',
      'pr.balance_due > 0',
    ];
    const params = [patientId];

    appendTenantWhereClauses({
      whereClauses,
      params,
      scope: actorScope,
      clinicExpression: tenantJoinConfig.clinicExpression,
      branchExpression: tenantJoinConfig.branchExpression,
    });

    const [rows] = await db.query(
      `SELECT
        pr.*,
        COALESCE(p.full_name, pr.patient_name) AS patient_name,
        COALESCE(d.name, pr.dentist_name) AS dentist_name,
        latest_tx.payment_method AS latest_payment_method,
        CASE WHEN COALESCE(latest_tx.proof_data, '') = '' THEN 0 ELSE 1 END AS has_proof,
        (SELECT COUNT(*) FROM payment_transactions tx WHERE tx.payment_record_id = pr.id) AS transaction_count
      FROM payment_records pr
      ${tenantJoinConfig.joinSql}
      LEFT JOIN patients p ON p.id = pr.patient_id
      LEFT JOIN dentists d ON d.id = pr.dentist_id
      LEFT JOIN payment_transactions latest_tx
        ON latest_tx.id = (
          SELECT tx2.id
          FROM payment_transactions tx2
          WHERE tx2.payment_record_id = pr.id
          ORDER BY tx2.created_at DESC, tx2.id DESC
          LIMIT 1
        )
      WHERE ${whereClauses.join(' AND ')}
      ORDER BY COALESCE(pr.updated_at, pr.created_at) DESC, pr.id DESC`,
      params
    );

    const matches = rows
      .map(mapPaymentRow)
      .map((row) => {
        const split = splitIncomingServicesByExisting(row.services_text, incomingServices);
        return {
          ...row,
          matched_services: split.matched_services,
          remaining_services: split.remaining_services,
          overlap_count: split.overlap_count,
          incoming_count: split.incoming_count,
          can_split: split.remaining_services.length > 0,
        };
      })
      .filter((row) => row.overlap_count > 0)
      .sort((a, b) => {
        if (b.overlap_count !== a.overlap_count) {
          return b.overlap_count - a.overlap_count;
        }

        if (a.remaining_services.length !== b.remaining_services.length) {
          return a.remaining_services.length - b.remaining_services.length;
        }

        return Number(b.id || 0) - Number(a.id || 0);
      });

    return res.json({
      incoming_services: toUniqueServiceEntries(incomingServices).map((entry) => entry.raw),
      matches,
    });
  } catch (error) {
    console.error("Error fetching unpaid payment matches:", error);
    return res.status(500).json({ message: "Failed to fetch unpaid payment matches." });
  }
});

router.get("/:id", async (req, res) => {
  const paymentId = toOptionalInt(req.params.id);
  if (!paymentId) {
    return res.status(400).json({ message: "Invalid payment record id." });
  }

  const connection = await db.getConnection();
  try {
    const actorScope = await getActorTenantScope(req);

    const [scopeRows] = await connection.query(
      `SELECT id, queue_id, appointment_id, dentist_id
       FROM payment_records
       WHERE id = ?
       LIMIT 1`,
      [paymentId]
    );

    if (!scopeRows.length) {
      return res.status(404).json({ message: "Payment record not found." });
    }

    const scopeViolation = await ensurePaymentRecordScope(connection, scopeRows[0], actorScope);
    if (scopeViolation) {
      return res.status(403).json({ message: scopeViolation });
    }

    const record = await fetchPaymentRecord(connection, paymentId);
    if (!record) {
      return res.status(404).json({ message: "Payment record not found." });
    }

    const transactions = await fetchPaymentTransactions(connection, paymentId);
    return res.json({ ...record, transactions });
  } catch (error) {
    console.error("Error fetching payment record:", error);
    res.status(500).json({ message: "Failed to load payment record." });
  } finally {
    connection.release();
  }
});

router.post("/", async (req, res) => {
  const paymentMutationGuard = canMutatePayments(req);
  if (!paymentMutationGuard.allowed) {
    return res.status(403).json({ message: paymentMutationGuard.message });
  }

  const patientId = toOptionalInt(req.body.patient_id);
  const dentistId = toOptionalInt(req.body.dentist_id);
  const appointmentId = toOptionalInt(req.body.appointment_id);
  const queueId = toOptionalInt(req.body.queue_id);
  const patientName = sanitizeText(req.body.patient_name);
  const dentistName = sanitizeText(req.body.dentist_name);
  const visitDateTime = sanitizeText(req.body.visit_datetime, 255);
  const servicesText = formatServicesText(req.body.services || req.body.services_text);
  const notes = sanitizeText(req.body.notes, 2000);

  const totalDue = toMoney(req.body.total_due, { allowZero: false });
  const amountPaidNow = toMoney(req.body.amount_paid_now ?? req.body.amount_paid, { allowZero: false });
  const isDeposit = normalizeBoolean(req.body.is_deposit, false);
  const allowSplitRecord = normalizeBoolean(req.body.allow_split_record, false);
  const paymentMethod = normalizeMethod(req.body.payment_method);

  if (!patientId) {
    return res.status(400).json({ message: "patient_id is required." });
  }

  if (totalDue === null) {
    return res.status(400).json({ message: "A valid total_due amount is required." });
  }

  if (amountPaidNow === null) {
    return res.status(400).json({ message: "A valid amount_paid_now is required." });
  }

  if (!paymentMethod) {
    return res.status(400).json({ message: "payment_method must be either cash or cashless." });
  }

  const cashReceived = paymentMethod === "cash"
    ? toMoney(req.body.cash_received, { allowZero: true })
    : null;

  if (paymentMethod === "cash") {
    if (cashReceived === null || cashReceived < amountPaidNow) {
      return res.status(400).json({ message: "Cash received must be greater than or equal to the amount paid." });
    }
  }

  const proofName = sanitizeText(req.body.proof_name);
  const proofData = String(req.body.proof_data || "").trim();
  if (isOnlineMethod(paymentMethod) && (!proofName || !proofData)) {
    return res.status(400).json({ message: "Proof of payment is required for cashless transactions." });
  }

  if (!isDeposit && amountPaidNow < totalDue) {
    return res.status(400).json({ message: "Non-deposit payments must be paid in full." });
  }

  const changeAmount = paymentMethod === "cash" ? roundMoney(cashReceived - amountPaidNow) : null;
  const balanceDue = roundMoney(Math.max(totalDue - amountPaidNow, 0));
  const paymentStatus = getPaymentStatus(balanceDue);
  const actorScope = await getActorTenantScope(req);
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const resolvedTenant = await resolvePaymentTenant(connection, {
      queueId,
      appointmentId,
      dentistId,
      actorScope,
    });

    if (resolvedTenant.scopeViolation) {
      await connection.rollback();
      return res.status(403).json({ message: resolvedTenant.scopeViolation });
    }

    if (queueId && !allowSplitRecord) {
      const [queueExisting] = await connection.query(
        `SELECT id FROM payment_records WHERE queue_id = ? LIMIT 1`,
        [queueId]
      );
      if (queueExisting.length > 0) {
        await connection.rollback();
        return res.status(409).json({
          message: "A payment record already exists for this queue item.",
          payment_record_id: queueExisting[0].id,
        });
      }
    }

    if (appointmentId && !allowSplitRecord) {
      const [appointmentExisting] = await connection.query(
        `SELECT id FROM payment_records WHERE appointment_id = ? LIMIT 1`,
        [appointmentId]
      );
      if (appointmentExisting.length > 0) {
        await connection.rollback();
        return res.status(409).json({
          message: "A payment record already exists for this appointment.",
          payment_record_id: appointmentExisting[0].id,
        });
      }
    }

    const [insertRecordResult] = await connection.query(
      `INSERT INTO payment_records (
        patient_id,
        dentist_id,
        appointment_id,
        queue_id,
        patient_name,
        dentist_name,
        visit_datetime,
        services_text,
        total_due,
        amount_paid,
        balance_due,
        is_deposit,
        payment_status,
        notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        patientId,
        dentistId,
        appointmentId,
        queueId,
        patientName || null,
        dentistName || null,
        visitDateTime || null,
        servicesText || null,
        totalDue,
        amountPaidNow,
        balanceDue,
        isDeposit ? 1 : 0,
        paymentStatus,
        notes || null,
      ]
    );

    const paymentRecordId = insertRecordResult.insertId;

    await connection.query(
      `INSERT INTO payment_transactions (
        payment_record_id,
        payment_method,
        amount_paid,
        cash_received,
        change_amount,
        proof_name,
        proof_data
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        paymentRecordId,
        paymentMethod,
        amountPaidNow,
        cashReceived,
        changeAmount,
        proofName || null,
        proofData || null,
      ]
    );

    const linkedStatus = await resolveLinkedWorkflowStatus(connection, {
      queueId,
      appointmentId,
      fallbackBalanceDue: balanceDue,
      fallbackIsDeposit: isDeposit,
    });

    await syncQueueAndAppointmentStatus(connection, {
      queueId,
      appointmentId,
      status: linkedStatus,
    });

    await connection.commit();

    const record = await fetchPaymentRecord(connection, paymentRecordId);
    const transactions = await fetchPaymentTransactions(connection, paymentRecordId);
    return res.status(201).json({ ...record, transactions });
  } catch (error) {
    await connection.rollback();
    console.error("Error creating payment record:", error);

    if (error && error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        message: "A payment record already exists for this visit. If split billing is intended, apply the split-payment index migration first.",
      });
    }

    return res.status(500).json({ message: "Failed to create payment record." });
  } finally {
    connection.release();
  }
});

router.put("/:id", async (req, res) => {
  const paymentMutationGuard = canMutatePayments(req);
  if (!paymentMutationGuard.allowed) {
    return res.status(403).json({ message: paymentMutationGuard.message });
  }

  const paymentId = toOptionalInt(req.params.id);
  if (!paymentId) {
    return res.status(400).json({ message: "Invalid payment record id." });
  }

  const hasTotalDue = Object.prototype.hasOwnProperty.call(req.body, "total_due");
  const hasIsDeposit = Object.prototype.hasOwnProperty.call(req.body, "is_deposit");
  const hasVisitDateTime = Object.prototype.hasOwnProperty.call(req.body, "visit_datetime");
  const hasServices = Object.prototype.hasOwnProperty.call(req.body, "services") || Object.prototype.hasOwnProperty.call(req.body, "services_text");
  const hasNotes = Object.prototype.hasOwnProperty.call(req.body, "notes");

  if (!hasTotalDue && !hasIsDeposit && !hasVisitDateTime && !hasServices && !hasNotes) {
    return res.status(400).json({ message: "No editable payment fields were provided." });
  }

  const connection = await db.getConnection();
  try {
    const actorScope = await getActorTenantScope(req);
    await connection.beginTransaction();

    const [rows] = await connection.query(
      `SELECT * FROM payment_records WHERE id = ? LIMIT 1 FOR UPDATE`,
      [paymentId]
    );

    if (!rows.length) {
      await connection.rollback();
      return res.status(404).json({ message: "Payment record not found." });
    }

    const current = rows[0];
    const scopeViolation = await ensurePaymentRecordScope(connection, current, actorScope);
    if (scopeViolation) {
      await connection.rollback();
      return res.status(403).json({ message: scopeViolation });
    }

    const currentAmountPaid = roundMoney(current.amount_paid);
    const currentIsDeposit = Boolean(Number(current.is_deposit || 0));

    if (String(current.payment_status || "").toLowerCase() === "paid" || roundMoney(current.balance_due) <= 0) {
      await connection.rollback();
      return res.status(400).json({ message: "Paid records can no longer be edited." });
    }

    let nextTotalDue = roundMoney(current.total_due);
    if (hasTotalDue) {
      const parsedTotalDue = toMoney(req.body.total_due, { allowZero: false });
      if (parsedTotalDue === null) {
        await connection.rollback();
        return res.status(400).json({ message: "total_due must be a valid amount greater than zero." });
      }
      if (parsedTotalDue < currentAmountPaid) {
        await connection.rollback();
        return res.status(400).json({ message: "total_due cannot be lower than the amount already paid." });
      }
      nextTotalDue = parsedTotalDue;
    }

    const nextIsDeposit = hasIsDeposit
      ? normalizeBoolean(req.body.is_deposit, currentIsDeposit)
      : currentIsDeposit;

    const nextBalanceDue = roundMoney(Math.max(nextTotalDue - currentAmountPaid, 0));
    if (!nextIsDeposit && nextBalanceDue > 0) {
      await connection.rollback();
      return res.status(400).json({ message: "Non-deposit payment records must remain fully paid." });
    }

    const nextPaymentStatus = getPaymentStatus(nextBalanceDue);

    const setClauses = [
      "total_due = ?",
      "is_deposit = ?",
      "balance_due = ?",
      "payment_status = ?",
    ];
    const values = [
      nextTotalDue,
      nextIsDeposit ? 1 : 0,
      nextBalanceDue,
      nextPaymentStatus,
    ];

    if (hasVisitDateTime) {
      setClauses.push("visit_datetime = ?");
      values.push(sanitizeText(req.body.visit_datetime, 255) || null);
    }

    if (hasServices) {
      setClauses.push("services_text = ?");
      values.push(formatServicesText(req.body.services || req.body.services_text) || null);
    }

    if (hasNotes) {
      setClauses.push("notes = ?");
      values.push(sanitizeText(req.body.notes, 2000) || null);
    }

    values.push(paymentId);
    await connection.query(
      `UPDATE payment_records SET ${setClauses.join(", ")} WHERE id = ?`,
      values
    );

    const nextLinkedStatus = await resolveLinkedWorkflowStatus(connection, {
      queueId: current.queue_id,
      appointmentId: current.appointment_id,
      fallbackBalanceDue: nextBalanceDue,
      fallbackIsDeposit: nextIsDeposit,
    });

    await syncQueueAndAppointmentStatus(connection, {
      queueId: current.queue_id,
      appointmentId: current.appointment_id,
      status: nextLinkedStatus,
    });

    await connection.commit();

    const record = await fetchPaymentRecord(connection, paymentId);
    const transactions = await fetchPaymentTransactions(connection, paymentId);
    return res.json({ ...record, transactions });
  } catch (error) {
    await connection.rollback();
    console.error("Error updating payment record:", error);
    return res.status(500).json({ message: "Failed to update payment record." });
  } finally {
    connection.release();
  }
});

router.post("/:id/installments", async (req, res) => {
  const paymentMutationGuard = canMutatePayments(req);
  if (!paymentMutationGuard.allowed) {
    return res.status(403).json({ message: paymentMutationGuard.message });
  }

  const paymentId = toOptionalInt(req.params.id);
  if (!paymentId) {
    return res.status(400).json({ message: "Invalid payment record id." });
  }

  const amountPaidNow = toMoney(req.body.amount_paid_now ?? req.body.amount_paid, { allowZero: false });
  const paymentMethod = normalizeMethod(req.body.payment_method);

  if (amountPaidNow === null) {
    return res.status(400).json({ message: "A valid amount_paid_now is required." });
  }

  if (!paymentMethod) {
    return res.status(400).json({ message: "payment_method must be either cash or cashless." });
  }

  const cashReceived = paymentMethod === "cash"
    ? toMoney(req.body.cash_received, { allowZero: true })
    : null;

  if (paymentMethod === "cash") {
    if (cashReceived === null || cashReceived < amountPaidNow) {
      return res.status(400).json({ message: "Cash received must be greater than or equal to the amount paid." });
    }
  }

  const proofName = sanitizeText(req.body.proof_name);
  const proofData = String(req.body.proof_data || "").trim();
  if (isOnlineMethod(paymentMethod) && (!proofName || !proofData)) {
    return res.status(400).json({ message: "Proof of payment is required for cashless transactions." });
  }

  const hasTotalDue = Object.prototype.hasOwnProperty.call(req.body, "total_due");
  const hasIsDeposit = Object.prototype.hasOwnProperty.call(req.body, "is_deposit");
  const hasVisitDateTime = Object.prototype.hasOwnProperty.call(req.body, "visit_datetime");
  const hasServices = Object.prototype.hasOwnProperty.call(req.body, "services") || Object.prototype.hasOwnProperty.call(req.body, "services_text");
  const hasNotes = Object.prototype.hasOwnProperty.call(req.body, "notes");

  const connection = await db.getConnection();
  try {
    const actorScope = await getActorTenantScope(req);
    await connection.beginTransaction();

    const [rows] = await connection.query(
      `SELECT * FROM payment_records WHERE id = ? LIMIT 1 FOR UPDATE`,
      [paymentId]
    );

    if (!rows.length) {
      await connection.rollback();
      return res.status(404).json({ message: "Payment record not found." });
    }

    const current = rows[0];
    const scopeViolation = await ensurePaymentRecordScope(connection, current, actorScope);
    if (scopeViolation) {
      await connection.rollback();
      return res.status(403).json({ message: scopeViolation });
    }

    const currentAmountPaid = roundMoney(current.amount_paid);
    const currentTotalDue = roundMoney(current.total_due);
    const currentIsDeposit = Boolean(Number(current.is_deposit || 0));

    if (String(current.payment_status || "").toLowerCase() === "paid" || roundMoney(current.balance_due) <= 0) {
      await connection.rollback();
      return res.status(400).json({ message: "This payment record is already fully paid." });
    }

    let nextTotalDue = currentTotalDue;
    if (hasTotalDue) {
      const parsedTotalDue = toMoney(req.body.total_due, { allowZero: false });
      if (parsedTotalDue === null) {
        await connection.rollback();
        return res.status(400).json({ message: "total_due must be a valid amount greater than zero." });
      }
      if (parsedTotalDue < currentAmountPaid) {
        await connection.rollback();
        return res.status(400).json({ message: "total_due cannot be lower than amount already paid." });
      }
      nextTotalDue = parsedTotalDue;
    }

    const nextIsDeposit = hasIsDeposit
      ? normalizeBoolean(req.body.is_deposit, currentIsDeposit)
      : currentIsDeposit;

    const nextAmountPaid = roundMoney(currentAmountPaid + amountPaidNow);
    const nextBalanceDue = roundMoney(Math.max(nextTotalDue - nextAmountPaid, 0));

    if (!nextIsDeposit && nextBalanceDue > 0) {
      await connection.rollback();
      return res.status(400).json({ message: "Non-deposit payment records must be paid in full." });
    }

    const nextPaymentStatus = getPaymentStatus(nextBalanceDue);
    const changeAmount = paymentMethod === "cash" ? roundMoney(cashReceived - amountPaidNow) : null;

    await connection.query(
      `INSERT INTO payment_transactions (
        payment_record_id,
        payment_method,
        amount_paid,
        cash_received,
        change_amount,
        proof_name,
        proof_data
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        paymentId,
        paymentMethod,
        amountPaidNow,
        cashReceived,
        changeAmount,
        proofName || null,
        proofData || null,
      ]
    );

    const setClauses = [
      "total_due = ?",
      "is_deposit = ?",
      "amount_paid = ?",
      "balance_due = ?",
      "payment_status = ?",
    ];
    const values = [
      nextTotalDue,
      nextIsDeposit ? 1 : 0,
      nextAmountPaid,
      nextBalanceDue,
      nextPaymentStatus,
    ];

    if (hasVisitDateTime) {
      setClauses.push("visit_datetime = ?");
      values.push(sanitizeText(req.body.visit_datetime, 255) || null);
    }

    if (hasServices) {
      setClauses.push("services_text = ?");
      values.push(formatServicesText(req.body.services || req.body.services_text) || null);
    }

    if (hasNotes) {
      setClauses.push("notes = ?");
      values.push(sanitizeText(req.body.notes, 2000) || null);
    }

    values.push(paymentId);
    await connection.query(
      `UPDATE payment_records SET ${setClauses.join(", ")} WHERE id = ?`,
      values
    );

    const nextLinkedStatus = await resolveLinkedWorkflowStatus(connection, {
      queueId: current.queue_id,
      appointmentId: current.appointment_id,
      fallbackBalanceDue: nextBalanceDue,
      fallbackIsDeposit: nextIsDeposit,
    });

    await syncQueueAndAppointmentStatus(connection, {
      queueId: current.queue_id,
      appointmentId: current.appointment_id,
      status: nextLinkedStatus,
    });

    await connection.commit();

    const record = await fetchPaymentRecord(connection, paymentId);
    const transactions = await fetchPaymentTransactions(connection, paymentId);
    return res.json({ ...record, transactions });
  } catch (error) {
    await connection.rollback();
    console.error("Error adding payment installment:", error);
    return res.status(500).json({ message: "Failed to save payment installment." });
  } finally {
    connection.release();
  }
});

module.exports = router;
