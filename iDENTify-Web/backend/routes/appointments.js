const express = require("express");
const router = express.Router();
const db = require("../db");
const { getTenantLifecycleStatus, getLifecycleBlockMessage } = require("../utils/accessControl");
const { createNotification } = require("../utils/notifications");

const DEFAULT_DURATION_MINUTES = 30;
const CANCELLATION_LOCK_MINUTES = 30;
const SQL_PH_NOW = "DATE_ADD(UTC_TIMESTAMP(), INTERVAL 8 HOUR)";

let hasAppointmentClinicColumnCache = null;
let hasAppointmentBranchColumnCache = null;
let hasQueueClinicColumnCache = null;
let hasQueueBranchColumnCache = null;
let hasUsersClinicColumnCache = null;
let hasUsersBranchColumnCache = null;
let hasAppointmentServiceItemsTableCache = null;
let appointmentDecisionColumnSupportCache = null;

function parseTime(dateTimeStr) {
  if (!dateTimeStr) return null;
  let parts = dateTimeStr.match(/(\d{4})-(\d{2})-(\d{2}) (\d{1,2}):(\d{2}) (AM|PM)/);
  if (parts) {
    let [, year, month, day, hour, minute, meridiem] = parts;
    let hourInt = parseInt(hour, 10);
    if (meridiem === 'PM' && hourInt < 12) hourInt += 12;
    if (meridiem === 'AM' && hourInt === 12) hourInt = 0;
    return `${year}-${month}-${day} ${hourInt.toString().padStart(2, '0')}:${minute}:00`;
  }
  return dateTimeStr; 
}

function toPositiveInt(value) {
  const parsed = Number.parseInt(String(value || ""), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

function normalizeActorRole(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "super_admin") return "superadmin";
  if (normalized === "global_admin") return "globaladmin";
  return normalized;
}

function actorUserId(req) {
  return toPositiveInt(req.headers["x-user-id"]);
}

function actorRole(req) {
  return normalizeActorRole(req.headers["x-user-role"]);
}

async function hasAppointmentServiceItemsTable() {
  if (hasAppointmentServiceItemsTableCache !== null) {
    return hasAppointmentServiceItemsTableCache;
  }

  try {
    const [rows] = await db.query("SHOW TABLES LIKE 'appointment_service_items'");
    hasAppointmentServiceItemsTableCache = rows.length > 0;
  } catch (_err) {
    hasAppointmentServiceItemsTableCache = false;
  }

  return hasAppointmentServiceItemsTableCache;
}

async function getAppointmentDecisionColumnSupport() {
  if (appointmentDecisionColumnSupportCache !== null) {
    return appointmentDecisionColumnSupportCache;
  }

  const columnNames = ["decision_status", "decided_at", "decided_by_user_id", "decline_reason"];
  try {
    const checks = await Promise.all(
      columnNames.map(async (columnName) => {
        const [rows] = await db.query(`SHOW COLUMNS FROM appointments LIKE '${columnName}'`);
        return [columnName, rows.length > 0];
      })
    );

    appointmentDecisionColumnSupportCache = Object.fromEntries(checks);
  } catch (_err) {
    appointmentDecisionColumnSupportCache = {
      decision_status: false,
      decided_at: false,
      decided_by_user_id: false,
      decline_reason: false,
    };
  }

  return appointmentDecisionColumnSupportCache;
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
      };
    }

    const scopedRoles = new Set(["superadmin", "dentist", "aide"]);
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
    return "You can only manage appointments within your assigned clinic.";
  }

  if (scope.branchId && branchId && Number(scope.branchId) !== Number(branchId)) {
    return "You can only manage appointments within your assigned branch.";
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

async function resolveAppointmentTenant({ clinicId, branchId, dentistId, actorScope }) {
  let resolvedClinicId = toPositiveInt(clinicId);
  let resolvedBranchId = toPositiveInt(branchId);

  if (actorScope?.scoped) {
    if (!resolvedClinicId && actorScope.clinicId) {
      resolvedClinicId = actorScope.clinicId;
    }
    if (!resolvedBranchId && actorScope.branchId) {
      resolvedBranchId = actorScope.branchId;
    }
  }

  if (!resolvedClinicId && resolvedBranchId) {
    resolvedClinicId = await resolveClinicIdFromBranch(resolvedBranchId);
  }

  if ((!resolvedClinicId || !resolvedBranchId) && dentistId) {
    const inferredTenant = await inferTenantFromDentist(dentistId);
    if (!resolvedClinicId) {
      resolvedClinicId = inferredTenant.clinicId;
    }
    if (!resolvedBranchId) {
      resolvedBranchId = inferredTenant.branchId;
    }
  }

  const scopeViolation = hasTenantScopeViolation(actorScope, resolvedClinicId, resolvedBranchId);

  return {
    clinicId: resolvedClinicId,
    branchId: resolvedBranchId,
    scopeViolation,
  };
}

async function getLifecycleBlockPayload({ clinicId, branchId, action = "booking" }) {
  const lifecycle = await getTenantLifecycleStatus({ clinicId, branchId });
  const lifecycleBlockMessage = getLifecycleBlockMessage(lifecycle, { action });

  if (!lifecycleBlockMessage) return null;

  return {
    message: lifecycleBlockMessage,
    code: "TENANT_LIFECYCLE_BLOCKED",
    lifecycle,
  };
}

function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const normalized = String(value).replace(" ", "T");
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatSqlDateTime(value) {
  const date = toDate(value);
  if (!date) return null;

  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function addMinutes(sqlDateTime, minutes) {
  const date = toDate(sqlDateTime);
  if (!date) return null;

  const ms = Number(minutes || 0) * 60 * 1000;
  const next = new Date(date.getTime() + ms);
  return formatSqlDateTime(next);
}

function splitServiceNames(value) {
  return String(value || "")
    .split(",")
    .map((item) => String(item || "").trim())
    .filter(Boolean);
}

function normalizeServiceItemsInput(serviceItems) {
  if (!Array.isArray(serviceItems)) return [];

  return serviceItems
    .map((item, index) => {
      const source = item && typeof item === "object" ? item : {};
      return {
        sequence_order: toPositiveInt(source.sequence_order || source.sequenceOrder) || (index + 1),
        service_id: toPositiveInt(source.service_id || source.serviceId),
        service_name_snapshot: String(
          source.service_name_snapshot
          || source.service_name
          || source.serviceName
          || source.name
          || source.service
          || ""
        ).trim(),
        dentist_id: toPositiveInt(source.dentist_id || source.dentistId),
        duration_minutes: toPositiveInt(source.duration_minutes || source.durationMinutes),
        notes: String(source.notes || "").trim(),
      };
    })
    .sort((a, b) => a.sequence_order - b.sequence_order)
    .map((item, index) => ({ ...item, sequence_order: index + 1 }));
}

function pickFirstDentistFromServiceItems(serviceItems) {
  const normalized = normalizeServiceItemsInput(serviceItems);
  const match = normalized.find((item) => item.dentist_id);
  return match ? match.dentist_id : null;
}

async function lookupClinicServiceDetails({ serviceIds = [], serviceNames = [] }) {
  const ids = [...new Set(serviceIds.map((value) => toPositiveInt(value)).filter(Boolean))];
  const names = [...new Set(serviceNames.map((value) => String(value || "").trim().toLowerCase()).filter(Boolean))];

  const byId = new Map();
  const byName = new Map();

  if (!ids.length && !names.length) {
    return { byId, byName };
  }

  try {
    const clauses = [];
    const params = [];

    if (ids.length) {
      clauses.push(`id IN (${ids.map(() => "?").join(",")})`);
      params.push(...ids);
    }

    if (names.length) {
      clauses.push(`LOWER(TRIM(name)) IN (${names.map(() => "?").join(",")})`);
      params.push(...names);
    }

    const [rows] = await db.query(
      `SELECT id, name, estimated_duration FROM clinic_services WHERE ${clauses.join(" OR ")}`,
      params
    );

    rows.forEach((row) => {
      const normalizedName = String(row.name || "").trim();
      const normalizedKey = normalizedName.toLowerCase();
      const detail = {
        id: toPositiveInt(row.id),
        name: normalizedName,
        duration_minutes: toPositiveInt(row.estimated_duration) || DEFAULT_DURATION_MINUTES,
      };

      if (detail.id) byId.set(detail.id, detail);
      if (normalizedKey) byName.set(normalizedKey, detail);
    });
  } catch (_err) {
    return { byId, byName };
  }

  return { byId, byName };
}

async function buildAppointmentServiceItems({
  serviceItemsInput,
  services,
  procedure,
  defaultDentistId,
  fallbackDurationMinutes,
  appointmentStart,
}) {
  const normalizedProvidedItems = normalizeServiceItemsInput(serviceItemsInput);
  const normalizedServices = normalizeServiceList(services, procedure);

  const baseItems = normalizedProvidedItems.length > 0
    ? normalizedProvidedItems
    : (normalizedServices.length > 0
      ? normalizedServices.map((serviceName, index) => ({
          sequence_order: index + 1,
          service_id: null,
          service_name_snapshot: serviceName,
          dentist_id: null,
          duration_minutes: null,
          notes: "",
        }))
      : [{
          sequence_order: 1,
          service_id: null,
          service_name_snapshot: String(procedure || "General Consultation").trim() || "General Consultation",
          dentist_id: null,
          duration_minutes: toPositiveInt(fallbackDurationMinutes) || DEFAULT_DURATION_MINUTES,
          notes: "",
        }]);

  const lookup = await lookupClinicServiceDetails({
    serviceIds: baseItems.map((item) => item.service_id),
    serviceNames: baseItems.map((item) => item.service_name_snapshot),
  });

  let cursor = appointmentStart;
  const builtItems = [];

  for (const item of baseItems) {
    const serviceById = item.service_id ? lookup.byId.get(item.service_id) : null;
    const serviceByName = item.service_name_snapshot
      ? lookup.byName.get(String(item.service_name_snapshot).trim().toLowerCase())
      : null;

    const resolvedDentistId = item.dentist_id || defaultDentistId;
    if (!resolvedDentistId) {
      const error = new Error("Each selected service must have an assigned dentist.");
      error.statusCode = 400;
      throw error;
    }

    const resolvedServiceId = item.service_id || serviceById?.id || serviceByName?.id || null;
    const resolvedServiceName = item.service_name_snapshot
      || serviceById?.name
      || serviceByName?.name
      || "General Consultation";

    const resolvedDuration = item.duration_minutes
      || serviceById?.duration_minutes
      || serviceByName?.duration_minutes
      || DEFAULT_DURATION_MINUTES;

    const segmentEnd = addMinutes(cursor, resolvedDuration);
    if (!segmentEnd) {
      const error = new Error("Invalid computed end time.");
      error.statusCode = 400;
      throw error;
    }

    builtItems.push({
      sequence_order: item.sequence_order,
      service_id: resolvedServiceId,
      service_name_snapshot: resolvedServiceName,
      dentist_id: resolvedDentistId,
      duration_minutes: resolvedDuration,
      segment_start: cursor,
      segment_end: segmentEnd,
      notes: item.notes || "",
    });

    cursor = segmentEnd;
  }

  return builtItems;
}

async function attachServiceItemsToAppointments(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return rows;

  const supportsServiceItemsTable = await hasAppointmentServiceItemsTable();
  if (!supportsServiceItemsTable) {
    rows.forEach((row) => {
      if (!Object.prototype.hasOwnProperty.call(row, "service_items")) {
        row.service_items = [];
      }
    });
    return rows;
  }

  const appointmentIds = rows
    .map((row) => toPositiveInt(row.id))
    .filter(Boolean);

  if (!appointmentIds.length) {
    rows.forEach((row) => {
      if (!Object.prototype.hasOwnProperty.call(row, "service_items")) {
        row.service_items = [];
      }
    });
    return rows;
  }

  const [serviceRows] = await db.query(
    `SELECT
       appointment_id,
       sequence_order,
       service_id,
       service_name_snapshot,
       dentist_id,
       duration_minutes,
       segment_start,
       segment_end,
       notes
     FROM appointment_service_items
     WHERE appointment_id IN (${appointmentIds.map(() => "?").join(",")})
     ORDER BY appointment_id ASC, sequence_order ASC`,
    appointmentIds
  );

  const groupedItems = new Map();
  serviceRows.forEach((item) => {
    const appointmentId = toPositiveInt(item.appointment_id);
    if (!appointmentId) return;

    if (!groupedItems.has(appointmentId)) {
      groupedItems.set(appointmentId, []);
    }

    groupedItems.get(appointmentId).push(item);
  });

  rows.forEach((row) => {
    const appointmentId = toPositiveInt(row.id);
    row.service_items = appointmentId ? (groupedItems.get(appointmentId) || []) : [];
  });

  return rows;
}

function computeDurationMinutes(startDateTime, endDateTime, fallback = DEFAULT_DURATION_MINUTES) {
  const start = toDate(startDateTime);
  const end = toDate(endDateTime);
  if (!start || !end) return fallback;

  const diffMinutes = Math.round((end.getTime() - start.getTime()) / 60000);
  return diffMinutes > 0 ? diffMinutes : fallback;
}

function buildLegacyServiceItemsFromAppointment(appointmentRow) {
  const startDateTime = formatSqlDateTime(appointmentRow?.appointment_datetime);
  const endDateTime = formatSqlDateTime(appointmentRow?.end_datetime);
  const durationMinutes = computeDurationMinutes(startDateTime, endDateTime, DEFAULT_DURATION_MINUTES);
  const fallbackEnd = endDateTime || addMinutes(startDateTime, durationMinutes);

  return [{
    appointment_id: toPositiveInt(appointmentRow?.id),
    sequence_order: 1,
    service_id: null,
    service_name_snapshot: String(appointmentRow?.reason || "General Consultation").trim() || "General Consultation",
    dentist_id: toPositiveInt(appointmentRow?.dentist_id),
    duration_minutes: durationMinutes,
    segment_start: startDateTime,
    segment_end: fallbackEnd,
    notes: String(appointmentRow?.notes || "").trim() || null,
  }];
}

async function getScopedAppointmentCore({ appointmentId, actorScope, queryConnection = db }) {
  const supportsAppointmentClinic = await hasAppointmentClinicColumn();
  const supportsAppointmentBranch = await hasAppointmentBranchColumn();
  const supportsUsersClinic = await hasUsersClinicColumn();
  const supportsUsersBranch = await hasUsersBranchColumn();

  const needsOwnerJoin = actorScope.scoped && (
    (actorScope.clinicId && !supportsAppointmentClinic && supportsUsersClinic)
    || (actorScope.branchId && !supportsAppointmentBranch && supportsUsersBranch)
  );

  let query = `SELECT
      a.id,
      a.patient_id,
      a.dentist_id,
      a.appointment_datetime,
      a.end_datetime,
      a.reason,
      a.notes,
      a.status${supportsAppointmentClinic ? ", a.clinic_id" : ""}${supportsAppointmentBranch ? ", a.branch_id" : ""}
    FROM appointments a`;

  if (needsOwnerJoin) {
    query += `
      LEFT JOIN (
        SELECT dentist_id, MAX(clinic_id) AS clinic_id, MAX(branch_id) AS branch_id
        FROM users
        GROUP BY dentist_id
      ) owner ON owner.dentist_id = a.dentist_id`;
  }

  const whereClauses = ["a.id = ?"];
  const params = [appointmentId];

  appendTenantWhereClauses({
    whereClauses,
    params,
    scope: actorScope,
    clinicExpression: supportsAppointmentClinic ? "a.clinic_id" : (needsOwnerJoin ? "owner.clinic_id" : null),
    branchExpression: supportsAppointmentBranch ? "a.branch_id" : (needsOwnerJoin ? "owner.branch_id" : null),
  });

  query += ` WHERE ${whereClauses.join(" AND ")} LIMIT 1`;

  const [rows] = await queryConnection.query(query, params);
  return {
    row: rows[0] || null,
    supportsAppointmentClinic,
    supportsAppointmentBranch,
  };
}

async function hasDentistOverlap({ connection, dentistId, startDateTime, endDateTime, excludeAppointmentId = null }) {
  const queryConnection = connection || db;
  const parsedExcludeId = toPositiveInt(excludeAppointmentId);
  const supportsServiceItemsTable = await hasAppointmentServiceItemsTable();

  const legacyParams = [dentistId, endDateTime, startDateTime];
  let legacyExcludeClause = "";
  if (parsedExcludeId) {
    legacyExcludeClause = "AND a.id != ?";
    legacyParams.push(parsedExcludeId);
  }

  const legacyServiceItemsExclusion = supportsServiceItemsTable
    ? `AND NOT EXISTS (
         SELECT 1
         FROM appointment_service_items asi_legacy
         WHERE asi_legacy.appointment_id = a.id
       )`
    : "";

  const [legacyConflictRows] = await queryConnection.query(
    `SELECT a.id
     FROM appointments a
     WHERE a.dentist_id = ?
       AND a.status NOT IN ('Cancelled', 'Declined')
       AND a.appointment_datetime < ?
       AND COALESCE(a.end_datetime, DATE_ADD(a.appointment_datetime, INTERVAL 30 MINUTE)) > ?
       ${legacyExcludeClause}
       ${legacyServiceItemsExclusion}
     LIMIT 1`,
    legacyParams
  );

  if (legacyConflictRows.length > 0) return true;

  if (!supportsServiceItemsTable) return false;

  const lineItemParams = [dentistId, endDateTime, startDateTime];
  let lineItemExcludeClause = "";
  if (parsedExcludeId) {
    lineItemExcludeClause = "AND a.id != ?";
    lineItemParams.push(parsedExcludeId);
  }

  const [lineItemConflictRows] = await queryConnection.query(
    `SELECT asi.id
     FROM appointment_service_items asi
     INNER JOIN appointments a ON a.id = asi.appointment_id
     WHERE asi.dentist_id = ?
       AND a.status NOT IN ('Cancelled', 'Declined')
       AND asi.segment_start < ?
       AND asi.segment_end > ?
       ${lineItemExcludeClause}
     LIMIT 1`,
    lineItemParams
  );

  return lineItemConflictRows.length > 0;
}

function buildReasonText(services, procedure) {
  if (Array.isArray(services) && services.length > 0) {
    return services.map((item) => String(item || "").trim()).filter(Boolean).join(", ");
  }

  if (typeof services === "string" && services.trim()) {
    return services.trim();
  }

  return String(procedure || "").trim();
}

function normalizeServiceList(services, procedure) {
  if (Array.isArray(services) && services.length > 0) {
    return services.map((item) => String(item || "").trim()).filter(Boolean);
  }

  if (typeof services === "string" && services.trim()) {
    return splitServiceNames(services);
  }

  return splitServiceNames(procedure);
}

async function resolveDurationMinutes({ services, procedure, durationHint }) {
  const hintedMinutes = toPositiveInt(durationHint);
  if (hintedMinutes) {
    return hintedMinutes;
  }

  const normalizedServices = normalizeServiceList(services, procedure);
  if (normalizedServices.length === 0) {
    return DEFAULT_DURATION_MINUTES;
  }

  const placeholders = normalizedServices.map(() => "?").join(",");
  const [rows] = await db.query(
    `SELECT name, estimated_duration FROM clinic_services WHERE name IN (${placeholders})`,
    normalizedServices
  );

  const durationMap = new Map(
    rows.map((row) => [String(row.name || "").trim().toLowerCase(), toPositiveInt(row.estimated_duration) || DEFAULT_DURATION_MINUTES])
  );

  return normalizedServices.reduce((total, serviceName) => {
    const key = String(serviceName || "").trim().toLowerCase();
    return total + (durationMap.get(key) || DEFAULT_DURATION_MINUTES);
  }, 0);
}

async function syncOverdueAppointmentsToMissed() {
  await db.query(
    `UPDATE appointments
     SET status = 'Missed'
     WHERE status = 'Scheduled'
       AND appointment_datetime <= ${SQL_PH_NOW}`
  );

  await db.query(
    `UPDATE walk_in_queue q
     JOIN appointments a ON a.id = q.appointment_id
     SET q.status = 'No-Show'
     WHERE a.status = 'Missed'
       AND q.status NOT IN ('Done', 'Cancelled', 'No-Show')`
  );
}

async function getMinutesUntilAppointment(appointmentId) {
  const [rows] = await db.query(
    `SELECT TIMESTAMPDIFF(MINUTE, ${SQL_PH_NOW}, appointment_datetime) AS minutes_until
     FROM appointments
     WHERE id = ?
     LIMIT 1`,
    [appointmentId]
  );

  if (!rows.length) return null;
  const minutesUntil = Number(rows[0]?.minutes_until);
  return Number.isFinite(minutesUntil) ? minutesUntil : null;
}

// --- CHECK DAILY LIMIT ---
router.get("/check-limit", async (req, res) => {
  const { dentist_id, date } = req.query;
  if (!dentist_id || !date) return res.status(400).json({ message: "Missing data" });

  try {
    const actorScope = await getActorTenantScope(req);
    const supportsAppointmentClinic = await hasAppointmentClinicColumn();
    const supportsAppointmentBranch = await hasAppointmentBranchColumn();

    const whereClauses = [
      "a.dentist_id = ?",
      "DATE(a.appointment_datetime) = ?",
      "a.status NOT IN ('Cancelled', 'Declined')",
    ];
    const params = [dentist_id, date];

    appendTenantWhereClauses({
      whereClauses,
      params,
      scope: actorScope,
      clinicExpression: supportsAppointmentClinic ? "a.clinic_id" : null,
      branchExpression: supportsAppointmentBranch ? "a.branch_id" : null,
    });

    const [countResult] = await db.query(
      `SELECT COUNT(*) as count FROM appointments a WHERE ${whereClauses.join(" AND ")}`,
      params
    );

    res.json({ count: countResult[0].count, limit: 5 });
  } catch (err) {
    res.status(500).json({ message: "Error checking limit" });
  }
});

// --- GET ALL APPOINTMENTS ---
router.get("/", async (req, res) => {
  const { date, patient_id } = req.query; 

  try {
    await syncOverdueAppointmentsToMissed();

    const actorScope = await getActorTenantScope(req);
    const supportsAppointmentClinic = await hasAppointmentClinicColumn();
    const supportsAppointmentBranch = await hasAppointmentBranchColumn();
    const supportsUsersClinic = await hasUsersClinicColumn();
    const supportsUsersBranch = await hasUsersBranchColumn();

    const needsOwnerJoin = actorScope.scoped && (
      (actorScope.clinicId && !supportsAppointmentClinic && supportsUsersClinic) ||
      (actorScope.branchId && !supportsAppointmentBranch && supportsUsersBranch)
    );

    let query = `SELECT a.*, a.reason AS \`procedure\`, p.full_name, d.name AS dentist_name 
               FROM appointments a 
               JOIN patients p ON a.patient_id = p.id 
               LEFT JOIN dentists d ON a.dentist_id = d.id`;

    if (needsOwnerJoin) {
      query += `
               LEFT JOIN (
                 SELECT dentist_id, MAX(clinic_id) AS clinic_id, MAX(branch_id) AS branch_id
                 FROM users
                 GROUP BY dentist_id
               ) owner ON owner.dentist_id = a.dentist_id`;
    }

    const params = [];
    const whereClauses = [];

    if (date) {
      whereClauses.push("DATE(a.appointment_datetime) = ?");
      params.push(date);
    }

    if (patient_id) {
      whereClauses.push("a.patient_id = ?");
      params.push(patient_id);
    }

    appendTenantWhereClauses({
      whereClauses,
      params,
      scope: actorScope,
      clinicExpression: supportsAppointmentClinic ? "a.clinic_id" : (needsOwnerJoin ? "owner.clinic_id" : null),
      branchExpression: supportsAppointmentBranch ? "a.branch_id" : (needsOwnerJoin ? "owner.branch_id" : null),
    });

    if (whereClauses.length > 0) {
      query += " WHERE " + whereClauses.join(" AND ");
    }

    query += " ORDER BY a.appointment_datetime ASC";

    const [rows] = await db.query(query, params);
    await attachServiceItemsToAppointments(rows);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Fetch failed" });
  }
});

// --- GET SINGLE APPOINTMENT ---
router.get("/:id", async (req, res) => {
  try {
    await syncOverdueAppointmentsToMissed();

    const actorScope = await getActorTenantScope(req);
    const supportsAppointmentClinic = await hasAppointmentClinicColumn();
    const supportsAppointmentBranch = await hasAppointmentBranchColumn();
    const supportsUsersClinic = await hasUsersClinicColumn();
    const supportsUsersBranch = await hasUsersBranchColumn();

    const needsOwnerJoin = actorScope.scoped && (
      (actorScope.clinicId && !supportsAppointmentClinic && supportsUsersClinic) ||
      (actorScope.branchId && !supportsAppointmentBranch && supportsUsersBranch)
    );

    let query = `SELECT a.*, a.reason AS \`procedure\`, p.full_name, d.name AS dentist_name 
       FROM appointments a 
       JOIN patients p ON a.patient_id = p.id 
       LEFT JOIN dentists d ON a.dentist_id = d.id`;

    if (needsOwnerJoin) {
      query += `
       LEFT JOIN (
         SELECT dentist_id, MAX(clinic_id) AS clinic_id, MAX(branch_id) AS branch_id
         FROM users
         GROUP BY dentist_id
       ) owner ON owner.dentist_id = a.dentist_id`;
    }

    const whereClauses = ["a.id = ?"];
    const params = [req.params.id];

    appendTenantWhereClauses({
      whereClauses,
      params,
      scope: actorScope,
      clinicExpression: supportsAppointmentClinic ? "a.clinic_id" : (needsOwnerJoin ? "owner.clinic_id" : null),
      branchExpression: supportsAppointmentBranch ? "a.branch_id" : (needsOwnerJoin ? "owner.branch_id" : null),
    });

    query += ` WHERE ${whereClauses.join(" AND ")}`;

    const [rows] = await db.query(query, params);
    
    if (rows.length === 0) {
      return res.status(404).json({ message: "Appointment not found" });
    }
    await attachServiceItemsToAppointments(rows);
    res.json(rows[0]);
  } catch (err) {
    console.error("Error fetching single appointment:", err);
    res.status(500).json({ message: "Fetch failed" });
  }
});

// --- GET APPOINTMENT SERVICE ITEMS ---
router.get("/:id/service-items", async (req, res) => {
  const appointmentId = toPositiveInt(req.params.id);
  if (!appointmentId) {
    return res.status(400).json({ message: "Invalid appointment id." });
  }

  try {
    await syncOverdueAppointmentsToMissed();

    const actorScope = await getActorTenantScope(req);
    const scoped = await getScopedAppointmentCore({
      appointmentId,
      actorScope,
      queryConnection: db,
    });

    if (!scoped.row) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    const supportsServiceItemsTable = await hasAppointmentServiceItemsTable();

    let serviceItems = [];
    if (supportsServiceItemsTable) {
      const [rows] = await db.query(
        `SELECT
           appointment_id,
           sequence_order,
           service_id,
           service_name_snapshot,
           dentist_id,
           duration_minutes,
           segment_start,
           segment_end,
           notes
         FROM appointment_service_items
         WHERE appointment_id = ?
         ORDER BY sequence_order ASC`,
        [appointmentId]
      );

      serviceItems = rows;
    }

    if (!serviceItems.length) {
      serviceItems = buildLegacyServiceItemsFromAppointment(scoped.row);
    }

    return res.json({
      appointment_id: appointmentId,
      appointment_datetime: scoped.row.appointment_datetime,
      end_datetime: scoped.row.end_datetime,
      dentist_id: scoped.row.dentist_id,
      procedure: scoped.row.reason || "",
      notes: scoped.row.notes || "",
      service_items: serviceItems,
    });
  } catch (err) {
    console.error("Error loading appointment service items:", err);
    return res.status(500).json({ message: "Failed to load service items." });
  }
});

// --- UPDATE APPOINTMENT SERVICE ITEMS ---
router.put("/:id/service-items", async (req, res) => {
  const appointmentId = toPositiveInt(req.params.id);
  if (!appointmentId) {
    return res.status(400).json({ message: "Invalid appointment id." });
  }

  const serviceItemsInput = req.body?.service_items;
  if (!Array.isArray(serviceItemsInput) || serviceItemsInput.length === 0) {
    return res.status(400).json({ message: "service_items is required and must be a non-empty array." });
  }

  let connection;
  try {
    await syncOverdueAppointmentsToMissed();

    const supportsServiceItemsTable = await hasAppointmentServiceItemsTable();
    if (!supportsServiceItemsTable) {
      return res.status(500).json({
        message: "Appointment service-item workflow is not configured. Run latest migration first.",
        code: "MIGRATION_REQUIRED",
      });
    }

    const actorScope = await getActorTenantScope(req);

    connection = await db.getConnection();
    await connection.beginTransaction();

    const scoped = await getScopedAppointmentCore({
      appointmentId,
      actorScope,
      queryConnection: connection,
    });

    if (!scoped.row) {
      await connection.rollback();
      return res.status(404).json({ message: "Appointment not found" });
    }

    const currentClinicId = scoped.supportsAppointmentClinic ? toPositiveInt(scoped.row.clinic_id) : null;
    const currentBranchId = scoped.supportsAppointmentBranch ? toPositiveInt(scoped.row.branch_id) : null;

    const resolvedTenant = await resolveAppointmentTenant({
      clinicId: currentClinicId,
      branchId: currentBranchId,
      dentistId: scoped.row.dentist_id,
      actorScope,
    });

    if (resolvedTenant.scopeViolation) {
      await connection.rollback();
      return res.status(403).json({ message: resolvedTenant.scopeViolation });
    }

    const lifecycleBlockPayload = await getLifecycleBlockPayload({
      clinicId: resolvedTenant.clinicId,
      branchId: resolvedTenant.branchId,
      action: "booking",
    });
    if (lifecycleBlockPayload) {
      await connection.rollback();
      return res.status(403).json(lifecycleBlockPayload);
    }

    const requestedStart = Object.prototype.hasOwnProperty.call(req.body || {}, "timeStart")
      ? parseTime(req.body.timeStart)
      : formatSqlDateTime(scoped.row.appointment_datetime);

    if (!requestedStart) {
      await connection.rollback();
      return res.status(400).json({ message: "Invalid time format" });
    }

    const reasonSeed = Object.prototype.hasOwnProperty.call(req.body || {}, "procedure")
      ? req.body.procedure
      : scoped.row.reason;

    const fallbackDurationMinutes = await resolveDurationMinutes({
      services: req.body?.services,
      procedure: reasonSeed,
      durationHint: req.body?.estimated_duration_minutes,
    });

    const requestedDentistId = toPositiveInt(req.body?.dentist_id);
    const defaultDentistId = pickFirstDentistFromServiceItems(serviceItemsInput)
      || requestedDentistId
      || toPositiveInt(scoped.row.dentist_id);

    const builtServiceItems = await buildAppointmentServiceItems({
      serviceItemsInput,
      services: req.body?.services,
      procedure: reasonSeed,
      defaultDentistId,
      fallbackDurationMinutes,
      appointmentStart: requestedStart,
    });

    const nextEnd = builtServiceItems[builtServiceItems.length - 1]?.segment_end;
    if (!nextEnd) {
      await connection.rollback();
      return res.status(400).json({ message: "Invalid computed end time." });
    }

    const finalReason = buildReasonText(
      builtServiceItems.map((item) => item.service_name_snapshot),
      reasonSeed
    );
    const primaryDentistId = builtServiceItems[0]?.dentist_id || defaultDentistId || toPositiveInt(scoped.row.dentist_id);

    const uniqueDentistIds = [...new Set(builtServiceItems.map((item) => item.dentist_id).filter(Boolean))];
    for (const itemDentistId of uniqueDentistIds) {
      const hasConflict = await hasDentistOverlap({
        connection,
        dentistId: itemDentistId,
        startDateTime: requestedStart,
        endDateTime: nextEnd,
        excludeAppointmentId: appointmentId,
      });

      if (hasConflict) {
        await connection.rollback();
        return res.status(409).json({
          message: "This time slot is already booked for one or more selected dentists. Please select another time.",
        });
      }
    }

    const setClauses = [
      "dentist_id = ?",
      "appointment_datetime = ?",
      "end_datetime = ?",
      "reason = ?",
    ];
    const setValues = [
      primaryDentistId,
      requestedStart,
      nextEnd,
      finalReason,
    ];

    if (Object.prototype.hasOwnProperty.call(req.body || {}, "notes")) {
      setClauses.push("notes = ?");
      setValues.push(req.body.notes || "");
    }

    if (scoped.supportsAppointmentClinic) {
      setClauses.push("clinic_id = ?");
      setValues.push(resolvedTenant.clinicId || null);
    }

    if (scoped.supportsAppointmentBranch) {
      setClauses.push("branch_id = ?");
      setValues.push(resolvedTenant.branchId || null);
    }

    setValues.push(appointmentId);
    await connection.query(
      `UPDATE appointments SET ${setClauses.join(", ")} WHERE id = ?`,
      setValues
    );

    await connection.query(
      `DELETE FROM appointment_service_items WHERE appointment_id = ?`,
      [appointmentId]
    );

    for (const item of builtServiceItems) {
      await connection.query(
        `INSERT INTO appointment_service_items (
           appointment_id,
           sequence_order,
           service_id,
           service_name_snapshot,
           dentist_id,
           duration_minutes,
           segment_start,
           segment_end,
           notes
         )
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          appointmentId,
          item.sequence_order,
          item.service_id || null,
          item.service_name_snapshot,
          item.dentist_id,
          item.duration_minutes,
          item.segment_start,
          item.segment_end,
          item.notes || null,
        ]
      );
    }

    await connection.query(
      `UPDATE walk_in_queue
       SET dentist_id = ?, notes = ?, time_added = ?
       WHERE appointment_id = ?`,
      [
        primaryDentistId,
        finalReason || req.body?.notes || "",
        requestedStart,
        appointmentId,
      ]
    );

    const [rows] = await connection.query(
      `SELECT a.*, a.reason AS \`procedure\`, p.full_name, d.name AS dentist_name
       FROM appointments a
       JOIN patients p ON a.patient_id = p.id
       LEFT JOIN dentists d ON a.dentist_id = d.id
       WHERE a.id = ?`,
      [appointmentId]
    );

    rows[0].service_items = builtServiceItems.map((item) => ({
      appointment_id: appointmentId,
      sequence_order: item.sequence_order,
      service_id: item.service_id || null,
      service_name_snapshot: item.service_name_snapshot,
      dentist_id: item.dentist_id,
      duration_minutes: item.duration_minutes,
      segment_start: item.segment_start,
      segment_end: item.segment_end,
      notes: item.notes || null,
    }));

    await connection.commit();
    return res.json(rows[0]);
  } catch (err) {
    if (connection) {
      await connection.rollback();
    }

    if (err?.statusCode) {
      return res.status(err.statusCode).json({ message: err.message });
    }

    console.error("Service item update error:", err);
    return res.status(500).json({ message: "Failed to update appointment service items." });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// --- ADD APPOINTMENT ---
router.post("/", async (req, res) => {
  const {
    patient_id,
    dentist_id,
    timeStart,
    procedure,
    services,
    service_items,
    notes,
    status,
    estimated_duration_minutes,
    clinic_id,
    branch_id,
  } = req.body;

  const patientId = toPositiveInt(patient_id);
  const dentistId = toPositiveInt(dentist_id) || pickFirstDentistFromServiceItems(service_items);
  const appointment_datetime = parseTime(timeStart);

  if (!patientId || !dentistId) {
    return res.status(400).json({ message: "patient_id and dentist_id are required." });
  }

  if (!appointment_datetime) return res.status(400).json({ message: "Invalid time format" });

  let connection;
  try {
    const actorScope = await getActorTenantScope(req);
    const supportsAppointmentClinic = await hasAppointmentClinicColumn();
    const supportsAppointmentBranch = await hasAppointmentBranchColumn();
    const supportsQueueClinic = await hasQueueClinicColumn();
    const supportsQueueBranch = await hasQueueBranchColumn();

    const resolvedTenant = await resolveAppointmentTenant({
      clinicId: clinic_id,
      branchId: branch_id,
      dentistId,
      actorScope,
    });

    if (resolvedTenant.scopeViolation) {
      return res.status(403).json({ message: resolvedTenant.scopeViolation });
    }

    const lifecycle = await getTenantLifecycleStatus({
      clinicId: resolvedTenant.clinicId,
      branchId: resolvedTenant.branchId,
    });
    const lifecycleBlockMessage = getLifecycleBlockMessage(lifecycle, { action: "booking" });
    if (lifecycleBlockMessage) {
      return res.status(403).json({
        message: lifecycleBlockMessage,
        code: "TENANT_LIFECYCLE_BLOCKED",
        lifecycle,
      });
    }

    const fallbackDurationMinutes = await resolveDurationMinutes({
      services,
      procedure,
      durationHint: estimated_duration_minutes,
    });

    const builtServiceItems = await buildAppointmentServiceItems({
      serviceItemsInput: service_items,
      services,
      procedure,
      defaultDentistId: dentistId,
      fallbackDurationMinutes,
      appointmentStart: appointment_datetime,
    });

    const finalReason = buildReasonText(
      builtServiceItems.map((item) => item.service_name_snapshot),
      procedure
    );
    const endDateTime = builtServiceItems[builtServiceItems.length - 1]?.segment_end;

    if (!endDateTime) {
      return res.status(400).json({ message: "Invalid computed end time." });
    }

    const uniqueDentistIds = [...new Set(builtServiceItems.map((item) => item.dentist_id).filter(Boolean))];

    connection = await db.getConnection();
    await connection.beginTransaction();

    for (const itemDentistId of uniqueDentistIds) {
      const hasConflict = await hasDentistOverlap({
        connection,
        dentistId: itemDentistId,
        startDateTime: appointment_datetime,
        endDateTime,
      });

      if (hasConflict) {
        const error = new Error("This time slot is already booked for one or more selected dentists. Please select another time.");
        error.statusCode = 409;
        throw error;
      }
    }

    const supportsServiceItemsTable = await hasAppointmentServiceItemsTable();
    const primaryDentistId = builtServiceItems[0]?.dentist_id || dentistId;

    const appointmentColumns = [
      "patient_id",
      "dentist_id",
      "appointment_datetime",
      "end_datetime",
      "reason",
      "notes",
      "status",
      "is_follow_up"
    ];
    const isFollowUp = (String(finalReason || "") + " " + String(notes || "")).toLowerCase().includes("follow-up") ? 1 : 0;
    const appointmentValues = [
      patientId,
      primaryDentistId,
      appointment_datetime,
      endDateTime,
      finalReason,
      notes || "",
      status || "Scheduled",
      isFollowUp
    ];

    if (supportsAppointmentClinic) {
      appointmentColumns.push("clinic_id");
      appointmentValues.push(resolvedTenant.clinicId || null);
    }

    if (supportsAppointmentBranch) {
      appointmentColumns.push("branch_id");
      appointmentValues.push(resolvedTenant.branchId || null);
    }

    const [result] = await connection.query(
      `INSERT INTO appointments (${appointmentColumns.join(", ")})
       VALUES (${appointmentColumns.map(() => "?").join(", ")})`,
      appointmentValues
    );

    if (supportsServiceItemsTable && builtServiceItems.length > 0) {
      for (const item of builtServiceItems) {
        await connection.query(
          `INSERT INTO appointment_service_items (
             appointment_id,
             sequence_order,
             service_id,
             service_name_snapshot,
             dentist_id,
             duration_minutes,
             segment_start,
             segment_end,
             notes
           )
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            result.insertId,
            item.sequence_order,
            item.service_id || null,
            item.service_name_snapshot,
            item.dentist_id,
            item.duration_minutes,
            item.segment_start,
            item.segment_end,
            item.notes || null,
          ]
        );
      }
    }

    const [existingQueueRows] = await connection.query(
      `SELECT id FROM walk_in_queue WHERE appointment_id = ? LIMIT 1`,
      [result.insertId]
    );

    if (existingQueueRows.length === 0) {
      const queueColumns = [
        "patient_id",
        "dentist_id",
        "appointment_id",
        "source",
        "status",
        "notes",
        "time_added",
      ];
      const queueValues = [
        patientId,
        primaryDentistId,
        result.insertId,
        "appointment",
        status || "Scheduled",
        finalReason || notes || "",
        appointment_datetime,
      ];

      if (supportsQueueClinic) {
        queueColumns.push("clinic_id");
        queueValues.push(resolvedTenant.clinicId || null);
      }

      if (supportsQueueBranch) {
        queueColumns.push("branch_id");
        queueValues.push(resolvedTenant.branchId || null);
      }

      await connection.query(
        `INSERT INTO walk_in_queue (${queueColumns.join(", ")})
         VALUES (${queueColumns.map(() => "?").join(", ")})`,
        queueValues
      );
    }
    
    const [rows] = await connection.query(
      `SELECT a.*, a.reason AS \`procedure\`, p.full_name, d.name AS dentist_name  
         FROM appointments a 
         JOIN patients p ON a.patient_id = p.id 
         LEFT JOIN dentists d ON a.dentist_id = d.id
         WHERE a.id = ?`,
        [result.insertId]
    );

    rows[0].service_items = supportsServiceItemsTable
      ? builtServiceItems.map((item) => ({
          appointment_id: result.insertId,
          sequence_order: item.sequence_order,
          service_id: item.service_id || null,
          service_name_snapshot: item.service_name_snapshot,
          dentist_id: item.dentist_id,
          duration_minutes: item.duration_minutes,
          segment_start: item.segment_start,
          segment_end: item.segment_end,
          notes: item.notes || null,
        }))
      : [];

    await connection.commit();
    res.status(201).json(rows[0]);
  } catch (err) {
    if (connection) {
      await connection.rollback();
    }
    if (err?.statusCode) {
      return res.status(err.statusCode).json({ message: err.message });
    }

    console.error("Save error:", err);
    res.status(500).json({ message: "Database save failed" });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// --- UPDATE APPOINTMENT ---
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const fields = req.body;
  const setClauses = [];
  const values = [];

  try {
    await syncOverdueAppointmentsToMissed();

    const actorScope = await getActorTenantScope(req);
    const supportsAppointmentClinic = await hasAppointmentClinicColumn();
    const supportsAppointmentBranch = await hasAppointmentBranchColumn();

    const [currentRows] = await db.query(
      `SELECT id, patient_id, dentist_id, appointment_datetime, reason, end_datetime, status${supportsAppointmentClinic ? ", clinic_id" : ""}${supportsAppointmentBranch ? ", branch_id" : ""}
       FROM appointments
       WHERE id = ?
       LIMIT 1`,
      [id]
    );

    if (!currentRows.length) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    const currentAppt = currentRows[0];
    const currentClinicId = supportsAppointmentClinic ? toPositiveInt(currentAppt.clinic_id) : null;
    const currentBranchId = supportsAppointmentBranch ? toPositiveInt(currentAppt.branch_id) : null;

    if (actorScope.scoped) {
      let scopedClinicId = currentClinicId;
      let scopedBranchId = currentBranchId;

      if (!supportsAppointmentClinic || !supportsAppointmentBranch) {
        const inferredTenant = await inferTenantFromDentist(currentAppt.dentist_id);
        if (!scopedClinicId) scopedClinicId = inferredTenant.clinicId;
        if (!scopedBranchId) scopedBranchId = inferredTenant.branchId;
      }

      const currentScopeViolation = hasTenantScopeViolation(actorScope, scopedClinicId, scopedBranchId);
      if (currentScopeViolation) {
        return res.status(403).json({ message: currentScopeViolation });
      }
    }

    const requestedStatus = String(fields.status || "").trim().toLowerCase();
    const isCancelling = requestedStatus === "cancelled";

    if (isCancelling && String(currentAppt.status || "").trim().toLowerCase() !== "cancelled") {
      const minutesUntil = await getMinutesUntilAppointment(id);

      if (minutesUntil === null) {
        return res.status(400).json({ message: "Unable to evaluate cancellation window." });
      }

      if (minutesUntil <= CANCELLATION_LOCK_MINUTES) {
        return res.status(400).json({
          message: "Appointments can only be cancelled at least 30 minutes before the appointment time.",
        });
      }
    }

    const requestedDentistId = Object.prototype.hasOwnProperty.call(fields, "dentist_id")
      ? toPositiveInt(fields.dentist_id)
      : null;

    if (Object.prototype.hasOwnProperty.call(fields, "dentist_id") && !requestedDentistId) {
      return res.status(400).json({ message: "Invalid dentist_id." });
    }

    const nextDentistId = requestedDentistId || currentAppt.dentist_id;

    const parsedStart = fields.timeStart ? parseTime(fields.timeStart) : null;
    if (fields.timeStart && !parsedStart) {
      return res.status(400).json({ message: "Invalid time format" });
    }

    const nextStart = parsedStart || formatSqlDateTime(currentAppt.appointment_datetime);

    // Trigger notification if rescheduled (time/date changed)
    const isRescheduled = fields.timeStart && formatSqlDateTime(currentAppt.appointment_datetime) !== nextStart;
    if (isRescheduled) {
        const readableDate = new Date(nextStart).toLocaleString('en-US', { 
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', 
            hour: 'numeric', minute: '2-digit', hour12: true 
        });
        await createNotification(
            currentAppt.patient_id, 
            'Appointment Rescheduled', 
            `Your appointment has been rescheduled to ${readableDate}.`,
            'rescheduled'
        );
    }

    const reasonSeed = Object.prototype.hasOwnProperty.call(fields, "procedure")
      ? fields.procedure
      : currentAppt.reason;
    const nextReason = buildReasonText(fields.services, reasonSeed);

    const durationMinutes = await resolveDurationMinutes({
      services: fields.services,
      procedure: nextReason,
      durationHint: fields.estimated_duration_minutes,
    });

    const resolvedTenant = await resolveAppointmentTenant({
      clinicId: Object.prototype.hasOwnProperty.call(fields, "clinic_id") ? fields.clinic_id : currentClinicId,
      branchId: Object.prototype.hasOwnProperty.call(fields, "branch_id") ? fields.branch_id : currentBranchId,
      dentistId: nextDentistId,
      actorScope,
    });

    if (resolvedTenant.scopeViolation) {
      return res.status(403).json({ message: resolvedTenant.scopeViolation });
    }

    const lifecycleBlockPayload = await getLifecycleBlockPayload({
      clinicId: resolvedTenant.clinicId,
      branchId: resolvedTenant.branchId,
      action: "booking",
    });
    if (lifecycleBlockPayload) {
      return res.status(403).json(lifecycleBlockPayload);
    }

    const nextEnd = addMinutes(nextStart, durationMinutes);
    if (!nextEnd) {
      return res.status(400).json({ message: "Invalid computed end time." });
    }

    if (fields.timeStart || fields.dentist_id || fields.procedure || fields.services) {
      const hasConflict = await hasDentistOverlap({
        dentistId: nextDentistId,
        startDateTime: nextStart,
        endDateTime: nextEnd,
        excludeAppointmentId: id,
      });

      if (hasConflict) {
        return res.status(409).json({ message: "This time slot is already booked for this dentist. Please select another time." });
      }
    }

    if (fields.timeStart) {
      const isActuallyChanged = formatSqlDateTime(currentAppt.appointment_datetime) !== nextStart;
      if (isActuallyChanged) {
          setClauses.push("appointment_datetime = ?");
          values.push(nextStart);
          setClauses.push("rescheduled_count = rescheduled_count + 1");
          if (!currentAppt.original_datetime) {
              setClauses.push("original_datetime = ?");
              values.push(formatSqlDateTime(currentAppt.appointment_datetime));
          }
      }
    }
    if (requestedDentistId) {
      setClauses.push("dentist_id = ?");
      values.push(requestedDentistId);
    }
    if (fields.procedure || fields.services) {
      setClauses.push("reason = ?"); 
      values.push(nextReason);
      const isFollowUp = nextReason.toLowerCase().includes("follow-up") ? 1 : 0;
      setClauses.push("is_follow_up = ?");
      values.push(isFollowUp);
    }
    if (fields.timeStart || fields.procedure || fields.services) {
      setClauses.push("end_datetime = ?");
      values.push(nextEnd);
    }
    if (Object.prototype.hasOwnProperty.call(fields, "notes")) {
      setClauses.push("notes = ?");
      values.push(fields.notes || "");
    }
    if (Object.prototype.hasOwnProperty.call(fields, "status")) {
      setClauses.push("status = ?");
      values.push(fields.status);
    }

    if (supportsAppointmentClinic && resolvedTenant.clinicId !== currentClinicId) {
      setClauses.push("clinic_id = ?");
      values.push(resolvedTenant.clinicId || null);
    }

    if (supportsAppointmentBranch && resolvedTenant.branchId !== currentBranchId) {
      setClauses.push("branch_id = ?");
      values.push(resolvedTenant.branchId || null);
    }

    if (setClauses.length === 0) return res.status(400).json({ message: "No valid updates provided." });

    values.push(id);
    await db.query(`UPDATE appointments SET ${setClauses.join(", ")} WHERE id = ?`, values);
    
    // ADDED: LEFT JOIN to return the updated dentist name instantly
    const [rows] = await db.query(
      `SELECT a.*, a.reason AS \`procedure\`, p.full_name, d.name AS dentist_name 
       FROM appointments a 
       JOIN patients p ON a.patient_id = p.id 
       LEFT JOIN dentists d ON a.dentist_id = d.id
       WHERE a.id = ?`, 
      [id]
    );
    await attachServiceItemsToAppointments(rows);
    res.json(rows[0]);
  } catch (err) {
    console.error("Update error:", err);
    res.status(500).json({ message: "Update failed" });
  }
});

// --- APPROVE APPOINTMENT (Dentist/Aide) ---
router.patch("/:id/approve", async (req, res) => {
  const appointmentId = toPositiveInt(req.params.id);
  const role = actorRole(req);
  const decisionActorUserId = actorUserId(req);

  if (!appointmentId) {
    return res.status(400).json({ message: "Invalid appointment id." });
  }

  if (!decisionActorUserId || (role !== "dentist" && role !== "aide")) {
    return res.status(403).json({ message: "Only dentist and aide accounts can approve appointments." });
  }

  try {
    const actorScope = await getActorTenantScope(req);
    const supportsAppointmentClinic = await hasAppointmentClinicColumn();
    const supportsAppointmentBranch = await hasAppointmentBranchColumn();
    const decisionColumns = await getAppointmentDecisionColumnSupport();

    const [rows] = await db.query(
      `SELECT id, status, dentist_id${supportsAppointmentClinic ? ", clinic_id" : ""}${supportsAppointmentBranch ? ", branch_id" : ""}
       FROM appointments
       WHERE id = ?
       LIMIT 1`,
      [appointmentId]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    const row = rows[0];
    let scopedClinicId = supportsAppointmentClinic ? toPositiveInt(row.clinic_id) : null;
    let scopedBranchId = supportsAppointmentBranch ? toPositiveInt(row.branch_id) : null;

    if (!supportsAppointmentClinic || !supportsAppointmentBranch) {
      const inferredTenant = await inferTenantFromDentist(row.dentist_id);
      if (!scopedClinicId) scopedClinicId = inferredTenant.clinicId;
      if (!scopedBranchId) scopedBranchId = inferredTenant.branchId;
    }

    const scopeViolation = hasTenantScopeViolation(actorScope, scopedClinicId, scopedBranchId);
    if (scopeViolation) {
      return res.status(403).json({ message: scopeViolation });
    }

    const lifecycleBlockPayload = await getLifecycleBlockPayload({
      clinicId: scopedClinicId,
      branchId: scopedBranchId,
      action: "booking",
    });
    if (lifecycleBlockPayload) {
      return res.status(403).json(lifecycleBlockPayload);
    }

    if (String(row.status || "").trim().toLowerCase() === "cancelled") {
      return res.status(400).json({ message: "Cancelled appointments cannot be approved." });
    }

    const updateClauses = ["status = 'Scheduled'"];
    const updateValues = [];

    if (decisionColumns.decision_status) {
      updateClauses.push("decision_status = 'approved'");
    }
    if (decisionColumns.decided_at) {
      updateClauses.push("decided_at = NOW()");
    }
    if (decisionColumns.decided_by_user_id) {
      updateClauses.push("decided_by_user_id = ?");
      updateValues.push(decisionActorUserId);
    }
    if (decisionColumns.decline_reason) {
      updateClauses.push("decline_reason = NULL");
    }

    updateValues.push(appointmentId);

    await db.query(
      `UPDATE appointments
       SET ${updateClauses.join(", ")}
       WHERE id = ?`,
      updateValues
    );

    // Trigger notification for approval
    await createNotification(
        row.patient_id,
        'Appointment Approved',
        `Your appointment on ${new Date(row.appointment_datetime).toLocaleDateString()} has been approved.`,
        'general'
    );

    await db.query(
      `UPDATE walk_in_queue
       SET status = 'Scheduled'
       WHERE appointment_id = ?
         AND status IN ('Cancelled', 'Declined')`,
      [appointmentId]
    );

    const [updatedRows] = await db.query(
      `SELECT a.*, a.reason AS \`procedure\`, p.full_name, d.name AS dentist_name
       FROM appointments a
       JOIN patients p ON a.patient_id = p.id
       LEFT JOIN dentists d ON a.dentist_id = d.id
       WHERE a.id = ?`,
      [appointmentId]
    );

    await attachServiceItemsToAppointments(updatedRows);
    return res.json(updatedRows[0]);
  } catch (error) {
    console.error("Approve appointment error:", error);
    return res.status(500).json({ message: "Failed to approve appointment." });
  }
});

// --- DECLINE APPOINTMENT (Dentist/Aide) ---
router.patch("/:id/decline", async (req, res) => {
  const appointmentId = toPositiveInt(req.params.id);
  const role = actorRole(req);
  const decisionActorUserId = actorUserId(req);
  const declineReason = String(req.body?.reason || req.body?.decline_reason || "").trim();

  if (!appointmentId) {
    return res.status(400).json({ message: "Invalid appointment id." });
  }

  if (!decisionActorUserId || (role !== "dentist" && role !== "aide")) {
    return res.status(403).json({ message: "Only dentist and aide accounts can decline appointments." });
  }

  if (!declineReason) {
    return res.status(400).json({ message: "A decline reason is required." });
  }

  try {
    const actorScope = await getActorTenantScope(req);
    const supportsAppointmentClinic = await hasAppointmentClinicColumn();
    const supportsAppointmentBranch = await hasAppointmentBranchColumn();
    const decisionColumns = await getAppointmentDecisionColumnSupport();

    const [rows] = await db.query(
      `SELECT id, status, dentist_id${supportsAppointmentClinic ? ", clinic_id" : ""}${supportsAppointmentBranch ? ", branch_id" : ""}
       FROM appointments
       WHERE id = ?
       LIMIT 1`,
      [appointmentId]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    const row = rows[0];
    let scopedClinicId = supportsAppointmentClinic ? toPositiveInt(row.clinic_id) : null;
    let scopedBranchId = supportsAppointmentBranch ? toPositiveInt(row.branch_id) : null;

    if (!supportsAppointmentClinic || !supportsAppointmentBranch) {
      const inferredTenant = await inferTenantFromDentist(row.dentist_id);
      if (!scopedClinicId) scopedClinicId = inferredTenant.clinicId;
      if (!scopedBranchId) scopedBranchId = inferredTenant.branchId;
    }

    const scopeViolation = hasTenantScopeViolation(actorScope, scopedClinicId, scopedBranchId);
    if (scopeViolation) {
      return res.status(403).json({ message: scopeViolation });
    }

    const lifecycleBlockPayload = await getLifecycleBlockPayload({
      clinicId: scopedClinicId,
      branchId: scopedBranchId,
      action: "booking",
    });
    if (lifecycleBlockPayload) {
      return res.status(403).json(lifecycleBlockPayload);
    }

    const updateClauses = ["status = 'Declined'"];
    const updateValues = [];

    if (decisionColumns.decision_status) {
      updateClauses.push("decision_status = 'declined'");
    }
    if (decisionColumns.decided_at) {
      updateClauses.push("decided_at = NOW()");
    }
    if (decisionColumns.decided_by_user_id) {
      updateClauses.push("decided_by_user_id = ?");
      updateValues.push(decisionActorUserId);
    }
    if (decisionColumns.decline_reason) {
      updateClauses.push("decline_reason = ?");
      updateValues.push(declineReason);
    }

    updateValues.push(appointmentId);

    await db.query(
      `UPDATE appointments
       SET ${updateClauses.join(", ")}
       WHERE id = ?`,
      updateValues
    );

    // Trigger notification for decline
    await createNotification(
        row.patient_id,
        'Appointment Declined',
        `Your appointment on ${new Date(row.appointment_datetime).toLocaleDateString()} has been declined. Reason: ${declineReason}`,
        'declined'
    );

    await db.query(
      `UPDATE walk_in_queue
       SET status = 'Cancelled'
       WHERE appointment_id = ?
         AND status NOT IN ('Done', 'Cancelled', 'No-Show')`,
      [appointmentId]
    );

    const [updatedRows] = await db.query(
      `SELECT a.*, a.reason AS \`procedure\`, p.full_name, d.name AS dentist_name
       FROM appointments a
       JOIN patients p ON a.patient_id = p.id
       LEFT JOIN dentists d ON a.dentist_id = d.id
       WHERE a.id = ?`,
      [appointmentId]
    );

    await attachServiceItemsToAppointments(updatedRows);
    return res.json(updatedRows[0]);
  } catch (error) {
    console.error("Decline appointment error:", error);
    return res.status(500).json({ message: "Failed to decline appointment." });
  }
});

// --- DELETE APPOINTMENT ---
router.delete("/:id", async (req, res) => {
  try {
    const actorScope = await getActorTenantScope(req);
    const supportsAppointmentClinic = await hasAppointmentClinicColumn();
    const supportsAppointmentBranch = await hasAppointmentBranchColumn();

    const [rows] = await db.query(
      `SELECT dentist_id${supportsAppointmentClinic ? ", clinic_id" : ""}${supportsAppointmentBranch ? ", branch_id" : ""}
       FROM appointments
       WHERE id = ?
       LIMIT 1`,
      [req.params.id]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    const row = rows[0];
    let scopedClinicId = supportsAppointmentClinic ? toPositiveInt(row.clinic_id) : null;
    let scopedBranchId = supportsAppointmentBranch ? toPositiveInt(row.branch_id) : null;

    if (!supportsAppointmentClinic || !supportsAppointmentBranch) {
      const inferredTenant = await inferTenantFromDentist(row.dentist_id);
      if (!scopedClinicId) scopedClinicId = inferredTenant.clinicId;
      if (!scopedBranchId) scopedBranchId = inferredTenant.branchId;
    }

    const scopeViolation = hasTenantScopeViolation(actorScope, scopedClinicId, scopedBranchId);
    if (scopeViolation) {
      return res.status(403).json({ message: scopeViolation });
    }

    const lifecycleBlockPayload = await getLifecycleBlockPayload({
      clinicId: scopedClinicId,
      branchId: scopedBranchId,
      action: "booking",
    });
    if (lifecycleBlockPayload) {
      return res.status(403).json(lifecycleBlockPayload);
    }

    await db.query("DELETE FROM appointments WHERE id = ?", [req.params.id]);
    res.json({ message: "Appointment deleted" });
  } catch (err) {
    res.status(500).json({ message: "Delete failed" });
  }
});

module.exports = router;