const express = require("express");
const router = express.Router();
const db = require("../db");
const CANCELLATION_LOCK_MINUTES = 30;
const SQL_PH_NOW = "DATE_ADD(UTC_TIMESTAMP(), INTERVAL 8 HOUR)";

let hasQueueClinicColumnCache = null;
let hasQueueBranchColumnCache = null;
let hasUsersClinicColumnCache = null;
let hasUsersBranchColumnCache = null;

// --- TIMEZONE HELPERS FOR PHILIPPINES (Asia/Manila) ---
function getPhDateOnly() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
}

function getPhDateTime() {
  const phTimeStr = new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" });
  const d = new Date(phTimeStr);
  const pad = (n) => (n < 10 ? "0" + n : n);
  return d.getFullYear() + "-" +
         pad(d.getMonth() + 1) + "-" +
         pad(d.getDate()) + " " +
         pad(d.getHours()) + ":" +
         pad(d.getMinutes()) + ":" +
         pad(d.getSeconds());
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
    return "You can only manage queue items within your assigned clinic.";
  }

  if (scope.branchId && branchId && Number(scope.branchId) !== Number(branchId)) {
    return "You can only manage queue items within your assigned branch.";
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

function normalizeQueueStatus(value, fallback = null) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return fallback;
  return QUEUE_STATUS_MAP[normalized] || fallback;
}

function formatSqlDateTime(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function normalizeQueueDateTime(value) {
  const text = String(value || "").trim();
  if (!text) return null;

  const withoutMillis = text.replace(/\.\d+/, "");
  const normalized = withoutMillis.replace("T", " ").replace(/Z$/i, "").trim();
  const sqlMatch = normalized.match(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})(?::(\d{2}))?$/);
  if (sqlMatch) {
    const [, datePart, hhmm, ss] = sqlMatch;
    return `${datePart} ${hhmm}:${ss || "00"}`;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return `${normalized} 00:00:00`;
  }

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return null;
  return formatSqlDateTime(parsed);
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

async function resolveQueueTenant({ clinicId, branchId, dentistId, actorScope }) {
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

const QUEUE_STATUS_MAP = {
  waiting: "Waiting",
  "checked in": "Checked-In",
  "checked-in": "Checked-In",
  checkedin: "Checked-In",
  "on chair": "On Chair",
  "on-chair": "On Chair",
  treatment: "Treatment",
  serving: "Treatment",
  "payment / billing": "Payment / Billing",
  "payment/billing": "Payment / Billing",
  payment: "Payment / Billing",
  billing: "Payment / Billing",
  scheduled: "Scheduled",
  done: "Done",
  cancelled: "Cancelled",
  "no-show": "No-Show",
  "no show": "No-Show",
  noshow: "No-Show",
  missed: "No-Show",
};

router.get("/status", async (req, res) => {
  const { patient_id } = req.query;

  if (!patient_id) {
    return res.status(400).json({ message: "patient_id is required" });
  }

  try {
    const actorScope = await getActorTenantScope(req);
    const supportsQueueClinic = await hasQueueClinicColumn();
    const supportsQueueBranch = await hasQueueBranchColumn();
    const supportsUsersClinic = await hasUsersClinicColumn();
    const supportsUsersBranch = await hasUsersBranchColumn();

    const needsOwnerJoin = actorScope.scoped && (
      (actorScope.clinicId && !supportsQueueClinic && supportsUsersClinic) ||
      (actorScope.branchId && !supportsQueueBranch && supportsUsersBranch)
    );

    const phToday = getPhDateOnly();
    let sql = `SELECT q.*, p.full_name, d.name as dentist_name
       FROM walk_in_queue q
       LEFT JOIN patients p ON q.patient_id = p.id
       LEFT JOIN dentists d ON q.dentist_id = d.id`;

    if (needsOwnerJoin) {
      sql += `
       LEFT JOIN (
         SELECT dentist_id, MAX(clinic_id) AS clinic_id, MAX(branch_id) AS branch_id
         FROM users
         GROUP BY dentist_id
       ) owner ON owner.dentist_id = q.dentist_id`;
    }

    const whereClauses = [
      "q.status NOT IN ('Done', 'Cancelled', 'No-Show', 'Scheduled')",
      "DATE(q.time_added) = ?",
    ];
    const params = [phToday];

    appendTenantWhereClauses({
      whereClauses,
      params,
      scope: actorScope,
      clinicExpression: supportsQueueClinic ? "q.clinic_id" : (needsOwnerJoin ? "owner.clinic_id" : null),
      branchExpression: supportsQueueBranch ? "q.branch_id" : (needsOwnerJoin ? "owner.branch_id" : null),
    });

    sql += ` WHERE ${whereClauses.join(" AND ")} ORDER BY q.time_added ASC`;

    const [allRows] = await db.query(sql, params);

    const myIndex = allRows.findIndex((row) => String(row.patient_id) === String(patient_id));
    const myStatusRow = myIndex !== -1 ? allRows[myIndex] : null;
    const myNumber = myIndex !== -1 ? myIndex + 1 : null;

    let servingRow = allRows.find((row) => ["On Chair", "Serving", "Treatment"].includes(row.status));

    if (!servingRow) {
      servingRow = allRows.find((row) => row.status !== "Done");
    }

    let servingNumber = null;
    if (servingRow) {
      const servingIndex = allRows.findIndex((row) => row.id === servingRow.id);
      servingNumber = servingIndex + 1;
    }

    res.json({
      myStatus: myStatusRow,
      myNumber,
      nowServing: servingRow,
      servingNumber,
      estimatedWaitTime: "10-20 mins",
    });
  } catch (error) {
    console.error("Error fetching queue status:", error);
    res.status(500).json({ message: "Database error fetching queue status" });
  }
});

router.get("/", async (req, res) => {
  const { history } = req.query;
  try {
    const actorScope = await getActorTenantScope(req);
    const supportsQueueClinic = await hasQueueClinicColumn();
    const supportsQueueBranch = await hasQueueBranchColumn();
    const supportsUsersClinic = await hasUsersClinicColumn();
    const supportsUsersBranch = await hasUsersBranchColumn();

    const needsOwnerJoin = actorScope.scoped && (
      (actorScope.clinicId && !supportsQueueClinic && supportsUsersClinic) ||
      (actorScope.branchId && !supportsQueueBranch && supportsUsersBranch)
    );

    let sql = `
       SELECT q.*, p.full_name, d.name as dentist_name
       FROM walk_in_queue q
       LEFT JOIN patients p ON q.patient_id = p.id
       LEFT JOIN dentists d ON q.dentist_id = d.id
    `;

    if (needsOwnerJoin) {
      sql += `
        LEFT JOIN (
          SELECT dentist_id, MAX(clinic_id) AS clinic_id, MAX(branch_id) AS branch_id
          FROM users
          GROUP BY dentist_id
        ) owner ON owner.dentist_id = q.dentist_id
      `;
    }

    const params = [];
    const whereClauses = [];

    if (history !== "true") {
      const phToday = getPhDateOnly();
      whereClauses.push("DATE(q.time_added) = ?");
      whereClauses.push("q.status NOT IN ('Done', 'Cancelled', 'No-Show', 'Scheduled')");
      params.push(phToday);
    }

    appendTenantWhereClauses({
      whereClauses,
      params,
      scope: actorScope,
      clinicExpression: supportsQueueClinic ? "q.clinic_id" : (needsOwnerJoin ? "owner.clinic_id" : null),
      branchExpression: supportsQueueBranch ? "q.branch_id" : (needsOwnerJoin ? "owner.branch_id" : null),
    });

    if (whereClauses.length > 0) {
      sql += ` WHERE ${whereClauses.join(" AND ")} `;
    }

    sql += ` ORDER BY FIELD(q.status, 'On Chair', 'Treatment', 'Checked-In', 'Waiting', 'Scheduled', 'Payment / Billing', 'Done', 'Cancelled'), time_added ASC`;

    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error("Error fetching dashboard queue:", err);
    res.status(500).json({ message: "Database error" });
  }
});

router.post("/", async (req, res) => {
  const {
    patient_id,
    dentist_id,
    appointment_id,
    source,
    status,
    notes,
    checkedInTime,
    time_added,
    clinic_id,
    branch_id,
  } = req.body;

  const patientId = toPositiveInt(patient_id);
  const dentistId = toPositiveInt(dentist_id);
  const appointmentId = toPositiveInt(appointment_id);
  const normalizedStatus = normalizeQueueStatus(status, "Checked-In");

  if (!patientId) {
    return res.status(400).json({ message: "patient_id is required." });
  }

  const insertTime = normalizeQueueDateTime(time_added || checkedInTime) || getPhDateTime();
  const queueSource = String(source || (appointmentId ? "appointment" : "walk-in")).trim() || null;
  const queueNotes = String(notes || "").trim();

  try {
    const actorScope = await getActorTenantScope(req);
    const supportsQueueClinic = await hasQueueClinicColumn();
    const supportsQueueBranch = await hasQueueBranchColumn();

    const resolvedTenant = await resolveQueueTenant({
      clinicId: clinic_id,
      branchId: branch_id,
      dentistId,
      actorScope,
    });

    if (resolvedTenant.scopeViolation) {
      return res.status(403).json({ message: resolvedTenant.scopeViolation });
    }

    if (appointmentId) {
      const [existingRows] = await db.query(
        `SELECT q.*, p.full_name, d.name as dentist_name
         FROM walk_in_queue q
         LEFT JOIN patients p ON q.patient_id = p.id
         LEFT JOIN dentists d ON q.dentist_id = d.id
         WHERE q.appointment_id = ?
         ORDER BY q.id DESC
         LIMIT 1`,
        [appointmentId]
      );

      if (existingRows.length > 0) {
        return res.status(200).json(existingRows[0]);
      }
    }

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
      appointmentId,
      queueSource,
      normalizedStatus,
      queueNotes,
      insertTime,
    ];

    if (supportsQueueClinic) {
      queueColumns.push("clinic_id");
      queueValues.push(resolvedTenant.clinicId || null);
    }

    if (supportsQueueBranch) {
      queueColumns.push("branch_id");
      queueValues.push(resolvedTenant.branchId || null);
    }

    const [result] = await db.query(
      `INSERT INTO walk_in_queue (${queueColumns.join(", ")})
       VALUES (${queueColumns.map(() => "?").join(", ")})`,
      queueValues
    );

    const [rows] = await db.query(
      `SELECT q.*, p.full_name, d.name as dentist_name
       FROM walk_in_queue q
       LEFT JOIN patients p ON q.patient_id = p.id
       LEFT JOIN dentists d ON q.dentist_id = d.id
       WHERE q.id = ?`,
      [result.insertId]
    );

    res.status(201).json(rows[0]);
  } catch (error) {
    console.error("Error adding to queue:", error);
    res.status(500).json({ message: "Database error adding to queue" });
  }
});

router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const queueId = toPositiveInt(id);
  const normalizedStatus = normalizeQueueStatus(status, null);

  if (!queueId) {
    return res.status(400).json({ message: "Invalid queue id." });
  }

  if (!normalizedStatus) {
    return res.status(400).json({ message: "Invalid queue status." });
  }

  try {
    const actorScope = await getActorTenantScope(req);
    const supportsQueueClinic = await hasQueueClinicColumn();
    const supportsQueueBranch = await hasQueueBranchColumn();

    const [qItemRows] = await db.query(
      `SELECT appointment_id, dentist_id${supportsQueueClinic ? ", clinic_id" : ""}${supportsQueueBranch ? ", branch_id" : ""}
       FROM walk_in_queue
       WHERE id = ?
       LIMIT 1`,
      [queueId]
    );

    if (!qItemRows.length) {
      return res.status(404).json({ message: "Queue item not found." });
    }

    const row = qItemRows[0];
    let scopedClinicId = supportsQueueClinic ? toPositiveInt(row.clinic_id) : null;
    let scopedBranchId = supportsQueueBranch ? toPositiveInt(row.branch_id) : null;

    if (!supportsQueueClinic || !supportsQueueBranch) {
      const inferredTenant = await inferTenantFromDentist(row.dentist_id);
      if (!scopedClinicId) scopedClinicId = inferredTenant.clinicId;
      if (!scopedBranchId) scopedBranchId = inferredTenant.branchId;
    }

    const scopeViolation = hasTenantScopeViolation(actorScope, scopedClinicId, scopedBranchId);
    if (scopeViolation) {
      return res.status(403).json({ message: scopeViolation });
    }

    const linkedAppointmentId = toPositiveInt(row.appointment_id);
    if (normalizedStatus === "Cancelled" && linkedAppointmentId) {
      const minutesUntil = await getMinutesUntilAppointment(linkedAppointmentId);

      if (minutesUntil === null) {
        return res.status(400).json({ message: "Unable to evaluate cancellation window." });
      }

      if (minutesUntil <= CANCELLATION_LOCK_MINUTES) {
        return res.status(400).json({
          message: "Appointments can only be cancelled at least 30 minutes before the appointment time.",
        });
      }
    }

    await db.query(
      `UPDATE walk_in_queue SET status = ? WHERE id = ?`,
      [normalizedStatus, queueId]
    );

    if (linkedAppointmentId) {
      await db.query(
        `UPDATE appointments SET status = ? WHERE id = ?`,
        [normalizedStatus, linkedAppointmentId]
      );
      console.log(`[Sync] Updated Linked Appointment ${linkedAppointmentId} to status: ${normalizedStatus}`);
    }

    res.json({ message: "Queue item updated and synchronized", id: queueId, status: normalizedStatus });
  } catch (err) {
    console.error("Error updating queue:", err);
    res.status(500).json({ message: "Failed to update queue" });
  }
});

router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  const queueId = toPositiveInt(id);

  if (!queueId) {
    return res.status(400).json({ message: "Invalid queue id." });
  }

  try {
    const actorScope = await getActorTenantScope(req);
    const supportsQueueClinic = await hasQueueClinicColumn();
    const supportsQueueBranch = await hasQueueBranchColumn();

    const [rows] = await db.query(
      `SELECT dentist_id${supportsQueueClinic ? ", clinic_id" : ""}${supportsQueueBranch ? ", branch_id" : ""}
       FROM walk_in_queue
       WHERE id = ?
       LIMIT 1`,
      [queueId]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Queue item not found" });
    }

    const row = rows[0];
    let scopedClinicId = supportsQueueClinic ? toPositiveInt(row.clinic_id) : null;
    let scopedBranchId = supportsQueueBranch ? toPositiveInt(row.branch_id) : null;

    if (!supportsQueueClinic || !supportsQueueBranch) {
      const inferredTenant = await inferTenantFromDentist(row.dentist_id);
      if (!scopedClinicId) scopedClinicId = inferredTenant.clinicId;
      if (!scopedBranchId) scopedBranchId = inferredTenant.branchId;
    }

    const scopeViolation = hasTenantScopeViolation(actorScope, scopedClinicId, scopedBranchId);
    if (scopeViolation) {
      return res.status(403).json({ message: scopeViolation });
    }

    await db.query("DELETE FROM walk_in_queue WHERE id = ?", [queueId]);
    res.json({ message: "Queue item deleted" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete queue item" });
  }
});

module.exports = router;