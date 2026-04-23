const express = require("express");
const router = express.Router();
const db = require("../db");
const { getActorTenantScope, appendTenantWhereClauses, hasColumn } = require("../utils/accessControl");

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

  const supportsUsersClinic = await hasColumn('users', 'clinic_id');
  const supportsUsersBranch = await hasColumn('users', 'branch_id');
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

async function resolveTenantFromQueue(connection, queueId) {
  const parsedQueueId = toOptionalInt(queueId);
  if (!parsedQueueId) {
    return { clinicId: null, branchId: null, dentistId: null };
  }

  const supportsQueueClinic = await hasColumn('walk_in_queue', 'clinic_id');
  const supportsQueueBranch = await hasColumn('walk_in_queue', 'branch_id');

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

  const supportsAppointmentClinic = await hasColumn('appointments', 'clinic_id');
  const supportsAppointmentBranch = await hasColumn('appointments', 'branch_id');

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

  if (!resolvedClinicId && actorScope?.scoped && actorScope.clinicId) {
    resolvedClinicId = actorScope.clinicId;
  }
  if (!resolvedBranchId && actorScope?.scoped && actorScope.branchId) {
    resolvedBranchId = actorScope.branchId;
  }

  const hasViolation = actorScope?.scoped && (
    (actorScope.clinicId && resolvedClinicId && Number(actorScope.clinicId) !== Number(resolvedClinicId)) ||
    (actorScope.branchId && resolvedBranchId && Number(actorScope.branchId) !== Number(resolvedBranchId))
  );

  return {
    clinicId: resolvedClinicId,
    branchId: resolvedBranchId,
    hasViolation,
  };
}

function canMutatePayments(req) {
  const { role } = req.headers['x-user-role'] ? { role: String(req.headers['x-user-role']).trim().toLowerCase() } : { role: null };

  if (!role) return { allowed: true };

  if (role === 'dentist') {
    return {
      allowed: false,
      message: 'Dentists have read-only access to payments. Only dental aides can edit payment records.',
    };
  }

  if (role !== 'aide' && role !== 'superadmin' && role !== 'super_admin') {
    return {
      allowed: false,
      message: 'Only dental aides or clinic admins can create or update payment records.',
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
    additional_charges: safeJsonParse(row.additional_charges, []),
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
    const supportsClinic = await hasColumn('payment_records', 'clinic_id');
    const supportsBranch = await hasColumn('payment_records', 'branch_id');

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
      clinicExpression: supportsClinic ? "pr.clinic_id" : null,
      branchExpression: supportsBranch ? "pr.branch_id" : null,
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
      LEFT JOIN walk_in_queue q ON q.id = pr.queue_id
      LEFT JOIN appointments a ON a.id = pr.appointment_id
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
  if (!queueId) return res.status(400).json({ message: "Invalid queue id." });

  const connection = await db.getConnection();
  try {
    const actorScope = await getActorTenantScope(req);
    const supportsClinic = await hasColumn('payment_records', 'clinic_id');
    const supportsBranch = await hasColumn('payment_records', 'branch_id');

    const whereClauses = ["queue_id = ?"];
    const params = [queueId];

    appendTenantWhereClauses({
      whereClauses,
      params,
      scope: actorScope,
      clinicExpression: supportsClinic ? "clinic_id" : null,
      branchExpression: supportsBranch ? "branch_id" : null,
    });

    const [rows] = await connection.query(
      `SELECT id FROM payment_records WHERE ${whereClauses.join(" AND ")} ORDER BY updated_at DESC LIMIT 1`,
      params
    );

    if (!rows.length) return res.json(null);

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

router.post("/", async (req, res) => {
  const paymentMutationGuard = canMutatePayments(req);
  if (!paymentMutationGuard.allowed) {
    return res.status(403).json({ message: paymentMutationGuard.message });
  }

  const { 
    patient_id, dentist_id, appointment_id, queue_id, 
    patient_name, dentist_name, visit_datetime, services, services_text, 
    notes, total_due, amount_paid_now, amount_paid, is_deposit, 
    allow_split_record, payment_method, cash_received, proof_name, proof_data,
    additional_charges, clinic_id, branch_id
  } = req.body;

  const patientId = toOptionalInt(patient_id);
  const dentistId = toOptionalInt(dentist_id);
  const appointmentId = toOptionalInt(appointment_id);
  const queueId = toOptionalInt(queue_id);

  const tDue = toMoney(total_due, { allowZero: false });
  const paidNow = toMoney(amount_paid_now ?? amount_paid, { allowZero: false });
  const method = normalizeMethod(payment_method);

  if (!patientId || tDue === null || paidNow === null || !method) {
    return res.status(400).json({ message: "Missing required payment details." });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const actorScope = await getActorTenantScope(req);
    const resolvedTenant = await resolvePaymentTenant(connection, { queueId, appointmentId, dentistId, actorScope });

    if (resolvedTenant.hasViolation) {
      await connection.rollback();
      return res.status(403).json({ message: "Access denied to this clinic's data." });
    }

    const supportsClinic = await hasColumn('payment_records', 'clinic_id');
    const supportsBranch = await hasColumn('payment_records', 'branch_id');
    const supportsAddCharges = await hasColumn('payment_records', 'additional_charges');

    const columns = [
      "patient_id", "dentist_id", "appointment_id", "queue_id",
      "patient_name", "dentist_name", "visit_datetime", "services_text",
      "total_due", "amount_paid", "balance_due", "is_deposit",
      "payment_status", "notes"
    ];
    const balanceDue = roundMoney(Math.max(tDue - paidNow, 0));
    const values = [
      patientId, dentistId, appointmentId, queueId,
      patient_name || null, dentist_name || null, visit_datetime || null, formatServicesText(services || services_text),
      tDue, paidNow, balanceDue, normalizeBoolean(is_deposit) ? 1 : 0,
      getPaymentStatus(balanceDue), notes || null
    ];

    if (supportsClinic) { columns.push("clinic_id"); values.push(resolvedTenant.clinicId); }
    if (supportsBranch) { columns.push("branch_id"); values.push(resolvedTenant.branchId); }
    if (supportsAddCharges) { columns.push("additional_charges"); values.push(JSON.stringify(additional_charges || [])); }

    const [result] = await connection.query(
      `INSERT INTO payment_records (${columns.join(", ")}) VALUES (${columns.map(() => "?").join(", ")})`,
      values
    );

    const paymentRecordId = result.insertId;

    const cReceived = method === "cash" ? toMoney(cash_received, { allowZero: true }) : null;
    const change = method === "cash" ? roundMoney((cReceived || 0) - paidNow) : null;

    await connection.query(
      `INSERT INTO payment_transactions (payment_record_id, payment_method, amount_paid, cash_received, change_amount, proof_name, proof_data)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [paymentRecordId, method, paidNow, cReceived, change, proof_name || null, proof_data || null]
    );

    await syncQueueAndAppointmentStatus(connection, { queueId, appointmentId, status: "Done" });

    await connection.commit();
    const record = await fetchPaymentRecord(connection, paymentRecordId);
    res.status(201).json(record);
  } catch (error) {
    await connection.rollback();
    console.error("Error creating payment:", error);
    res.status(500).json({ message: "Failed to create payment record." });
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
  const fields = req.body;

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const actorScope = await getActorTenantScope(req);
    const [rows] = await connection.query("SELECT * FROM payment_records WHERE id = ? FOR UPDATE", [paymentId]);
    if (!rows.length) {
      await connection.rollback();
      return res.status(404).json({ message: "Payment record not found." });
    }
    const current = rows[0];

    const resolvedTenant = await resolvePaymentTenant(connection, { queueId: current.queue_id, appointmentId: current.appointment_id, dentistId: current.dentist_id, actorScope });
    if (resolvedTenant.hasViolation) {
        await connection.rollback();
        return res.status(403).json({ message: "Access denied." });
    }

    const setClauses = [];
    const values = [];

    if (Object.prototype.hasOwnProperty.call(fields, "total_due")) {
      setClauses.push("total_due = ?");
      values.push(toMoney(fields.total_due));
    }
    if (Object.prototype.hasOwnProperty.call(fields, "services_text") || Object.prototype.hasOwnProperty.call(fields, "services")) {
      setClauses.push("services_text = ?");
      values.push(formatServicesText(fields.services || fields.services_text));
    }
    if (Object.prototype.hasOwnProperty.call(fields, "additional_charges")) {
      if (await hasColumn('payment_records', 'additional_charges')) {
        setClauses.push("additional_charges = ?");
        values.push(JSON.stringify(fields.additional_charges || []));
      }
    }

    if (setClauses.length > 0) {
      values.push(paymentId);
      await connection.query(`UPDATE payment_records SET ${setClauses.join(", ")} WHERE id = ?`, values);
    }

    await connection.commit();
    const record = await fetchPaymentRecord(connection, paymentId);
    res.json(record);
  } catch (error) {
    await connection.rollback();
    console.error("Update error:", error);
    res.status(500).json({ message: "Update failed." });
  } finally {
    connection.release();
  }
});

module.exports = router;
