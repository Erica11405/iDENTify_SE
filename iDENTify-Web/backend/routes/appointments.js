const express = require("express");
const router = express.Router();
const db = require("../db");

const DEFAULT_DURATION_MINUTES = 30;
const CANCELLATION_LOCK_MINUTES = 30;
const SQL_PH_NOW = "DATE_ADD(UTC_TIMESTAMP(), INTERVAL 8 HOUR)";

let hasAppointmentClinicColumnCache = null;
let hasAppointmentBranchColumnCache = null;
let hasQueueClinicColumnCache = null;
let hasQueueBranchColumnCache = null;
let hasUsersClinicColumnCache = null;
let hasUsersBranchColumnCache = null;

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
      "a.status != 'Cancelled'",
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
    res.json(rows[0]);
  } catch (err) {
    console.error("Error fetching single appointment:", err);
    res.status(500).json({ message: "Fetch failed" });
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
    notes,
    status,
    estimated_duration_minutes,
    clinic_id,
    branch_id,
  } = req.body;

  const patientId = toPositiveInt(patient_id);
  const dentistId = toPositiveInt(dentist_id);
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

    connection = await db.getConnection();
    await connection.beginTransaction();

    const finalReason = buildReasonText(services, procedure);
    const durationMinutes = await resolveDurationMinutes({
      services,
      procedure: finalReason,
      durationHint: estimated_duration_minutes,
    });
    const endDateTime = addMinutes(appointment_datetime, durationMinutes);

    if (!endDateTime) {
      return res.status(400).json({ message: "Invalid computed end time." });
    }

    const [existingConflict] = await connection.query(
      `SELECT id FROM appointments 
       WHERE dentist_id = ? 
       AND status NOT IN ('Cancelled', 'Declined')
       AND appointment_datetime < ?
       AND COALESCE(end_datetime, DATE_ADD(appointment_datetime, INTERVAL 30 MINUTE)) > ?`,
      [dentistId, endDateTime, appointment_datetime]
    );

    if (existingConflict.length > 0) {
      await connection.rollback();
      return res.status(409).json({ message: "This time slot is already booked for this dentist. Please select another time." });
    }

    const appointmentColumns = [
      "patient_id",
      "dentist_id",
      "appointment_datetime",
      "end_datetime",
      "reason",
      "notes",
      "status",
    ];
    const appointmentValues = [
      patientId,
      dentistId,
      appointment_datetime,
      endDateTime,
      finalReason,
      notes || "",
      status || "Scheduled",
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
        dentistId,
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

    await connection.commit();
    res.status(201).json(rows[0]);
  } catch (err) {
    if (connection) {
      await connection.rollback();
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
      `SELECT id, dentist_id, appointment_datetime, reason, end_datetime${supportsAppointmentClinic ? ", clinic_id" : ""}${supportsAppointmentBranch ? ", branch_id" : ""}
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

    const nextEnd = addMinutes(nextStart, durationMinutes);
    if (!nextEnd) {
      return res.status(400).json({ message: "Invalid computed end time." });
    }

    if (fields.timeStart || fields.dentist_id || fields.procedure || fields.services) {
      const [existingConflict] = await db.query(
        `SELECT id FROM appointments 
         WHERE dentist_id = ? 
         AND status NOT IN ('Cancelled', 'Declined')
         AND appointment_datetime < ?
         AND COALESCE(end_datetime, DATE_ADD(appointment_datetime, INTERVAL 30 MINUTE)) > ?
         AND id != ?`,
        [nextDentistId, nextEnd, nextStart, id]
      );

      if (existingConflict.length > 0) {
        return res.status(409).json({ message: "This time slot is already booked for this dentist. Please select another time." });
      }
    }

    if (fields.timeStart) {
      setClauses.push("appointment_datetime = ?");
      values.push(nextStart);
    }
    if (requestedDentistId) {
      setClauses.push("dentist_id = ?");
      values.push(requestedDentistId);
    }
    if (fields.procedure || fields.services) {
      setClauses.push("reason = ?"); 
      values.push(nextReason);
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
    res.json(rows[0]);
  } catch (err) {
    console.error("Update error:", err);
    res.status(500).json({ message: "Update failed" });
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

    await db.query("DELETE FROM appointments WHERE id = ?", [req.params.id]);
    res.json({ message: "Appointment deleted" });
  } catch (err) {
    res.status(500).json({ message: "Delete failed" });
  }
});

module.exports = router;