const express = require("express");
const router = express.Router();
const db = require("../db");

function isDateOnly(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
}

function getTodayDateOnly() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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

function hasServiceOverlap(existingServices, incomingServices) {
  const existing = normalizeServices(existingServices)
    .map(normalizeServiceLabel)
    .filter(Boolean);

  const incoming = normalizeServices(incomingServices)
    .map(normalizeServiceLabel)
    .filter(Boolean);

  if (existing.length === 0 || incoming.length === 0) return false;

  return existing.some((existingLabel) => (
    incoming.some((incomingLabel) => (
      existingLabel === incomingLabel
      || existingLabel.includes(incomingLabel)
      || incomingLabel.includes(existingLabel)
    ))
  ));
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

async function syncQueueAndAppointmentStatus(connection, { queueId, appointmentId, status }) {
  let linkedAppointmentId = toOptionalInt(appointmentId);
  const linkedQueueId = toOptionalInt(queueId);

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
    const params = [start, end];
    let whereSql = `WHERE DATE(COALESCE(latest_tx.created_at, pr.updated_at, pr.created_at)) BETWEEN ? AND ?`;

    if (keyword) {
      const term = `%${keyword}%`;
      params.push(term, term, term);
      whereSql += `
        AND (
          COALESCE(p.full_name, pr.patient_name) LIKE ?
          OR COALESCE(d.name, pr.dentist_name) LIKE ?
          OR COALESCE(pr.services_text, '') LIKE ?
        )`;
    }

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
      ORDER BY COALESCE(latest_tx.created_at, pr.updated_at, pr.created_at) DESC, pr.id DESC`,
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

  try {
    const [rows] = await db.query(
      `SELECT id FROM payment_records WHERE queue_id = ? LIMIT 1`,
      [queueId]
    );

    if (!rows.length) {
      return res.json(null);
    }

    const connection = await db.getConnection();
    try {
      const record = await fetchPaymentRecord(connection, rows[0].id);
      const transactions = await fetchPaymentTransactions(connection, rows[0].id);
      return res.json({ ...record, transactions });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Error fetching payment by queue:", error);
    res.status(500).json({ message: "Failed to load payment record." });
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
    const [rows] = await db.query(
      `SELECT
        pr.*,
        COALESCE(p.full_name, pr.patient_name) AS patient_name,
        COALESCE(d.name, pr.dentist_name) AS dentist_name,
        latest_tx.payment_method AS latest_payment_method,
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
      WHERE pr.patient_id = ?
        AND pr.balance_due > 0
      ORDER BY COALESCE(pr.updated_at, pr.created_at) DESC, pr.id DESC`,
      [patientId]
    );

    const matches = rows
      .map(mapPaymentRow)
      .filter((row) => hasServiceOverlap(row.services_text, incomingServices));

    return res.json({ matches });
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
  const linkedStatus = balanceDue > 0 ? "Payment / Billing" : "Done";

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    if (queueId) {
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

    if (appointmentId) {
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
      return res.status(409).json({ message: "A payment record already exists for this visit." });
    }

    return res.status(500).json({ message: "Failed to create payment record." });
  } finally {
    connection.release();
  }
});

router.put("/:id", async (req, res) => {
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
    const nextLinkedStatus = nextBalanceDue > 0 ? "Payment / Billing" : "Done";

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
    const nextLinkedStatus = nextBalanceDue > 0 ? "Payment / Billing" : "Done";
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
