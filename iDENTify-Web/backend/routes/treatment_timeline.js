const express = require("express");
const router = express.Router();
const db = require("../db");
const { getActorTenantScope, appendTenantWhereClauses, hasColumn, toPositiveInt } = require("../utils/accessControl");

function parseTimelineStartTime(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;

  const candidates = [
    raw,
    raw.replace(",", ""),
    raw.replace(/\s+at\s+/i, " "),
    raw.replace(/\s+/g, " "),
  ];

  for (const candidate of candidates) {
    const parsed = new Date(candidate);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return null;
}

function pickClosestAppointment(rows, targetDate) {
  if (!rows || rows.length === 0) return null;
  if (!targetDate) return rows[0];

  let selected = null;
  let bestDiff = Number.POSITIVE_INFINITY;

  rows.forEach((row) => {
    const parsed = new Date(String(row.appointment_datetime || "").replace(" ", "T"));
    if (Number.isNaN(parsed.getTime())) return;

    const diff = Math.abs(parsed.getTime() - targetDate.getTime());
    if (diff < bestDiff) {
      bestDiff = diff;
      selected = row;
    }
  });

  return selected || rows[0];
}

async function resolveDentistInfo(record) {
  const appointmentId = Number.parseInt(String(record?.appointment_id || ""), 10);

  if (Number.isFinite(appointmentId) && appointmentId > 0) {
    const [linkedRows] = await db.query(
      `SELECT a.id, a.appointment_datetime, d.name AS dentist_name
       FROM appointments a
       LEFT JOIN dentists d ON d.id = a.dentist_id
       WHERE a.id = ?
       LIMIT 1`,
      [appointmentId]
    );

    if (linkedRows.length > 0) {
      return {
        dentist_name: linkedRows[0].dentist_name || null,
        matched_appointment_id: linkedRows[0].id || appointmentId,
      };
    }
  }

  const patientId = Number.parseInt(String(record?.patient_id || ""), 10);
  if (!Number.isFinite(patientId) || patientId <= 0) {
    return { dentist_name: null, matched_appointment_id: null };
  }

  const [candidateRows] = await db.query(
    `SELECT a.id, a.appointment_datetime, d.name AS dentist_name
     FROM appointments a
     LEFT JOIN dentists d ON d.id = a.dentist_id
     WHERE a.patient_id = ?
       AND a.status NOT IN ('Cancelled', 'Declined', 'No-Show', 'Missed')
     ORDER BY a.appointment_datetime DESC
     LIMIT 40`,
    [patientId]
  );

  const picked = pickClosestAppointment(candidateRows, parseTimelineStartTime(record?.start_time));
  if (!picked) {
    return { dentist_name: null, matched_appointment_id: null };
  }

  return {
    dentist_name: picked.dentist_name || null,
    matched_appointment_id: picked.id || null,
  };
}

// Single record fetch endpoint
router.get("/record/:id", async (req, res) => {
  try {
    const actorScope = await getActorTenantScope(req);
    const supportsClinic = await hasColumn('treatment_timeline', 'clinic_id');
    const supportsBranch = await hasColumn('treatment_timeline', 'branch_id');

    const whereClauses = ["t.id = ?"];
    const params = [req.params.id];

    appendTenantWhereClauses({
      whereClauses,
      params,
      scope: actorScope,
      clinicExpression: supportsClinic ? "t.clinic_id" : null,
      branchExpression: supportsBranch ? "t.branch_id" : null,
    });

    const query = `
      SELECT t.*, c.name AS clinic_name, cb.name AS branch_name
      FROM treatment_timeline t
      LEFT JOIN clinics c ON c.id = t.clinic_id
      LEFT JOIN clinic_branches cb ON cb.id = t.branch_id
      WHERE ${whereClauses.join(" AND ")}
      LIMIT 1
    `;

    const [rows] = await db.query(query, params);
    
    if (rows.length === 0) {
      return res.status(404).json({ message: "Record not found or access denied." });
    }
    
    const record = rows[0];
    const dentistInfo = await resolveDentistInfo(record);

    res.json({
      ...record,
      dentist_name: dentistInfo.dentist_name,
      appointment_id: record.appointment_id || dentistInfo.matched_appointment_id || null,
    });
  } catch (error) {
    console.error("Error fetching single record:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Fetch all records for a patient
router.get("/:patientId", async (req, res) => {
  const { patientId } = req.params;
  const year = req.query.year || req.query.record_year;

  try {
    const actorScope = await getActorTenantScope(req);
    const supportsClinic = await hasColumn('treatment_timeline', 'clinic_id');
    const supportsBranch = await hasColumn('treatment_timeline', 'branch_id');

    let query = `
      SELECT t.*, c.name AS clinic_name, cb.name AS branch_name
      FROM treatment_timeline t
      LEFT JOIN clinics c ON c.id = t.clinic_id
      LEFT JOIN clinic_branches cb ON cb.id = t.branch_id
      WHERE t.patient_id = ?
    `;
    let params = [patientId];

    if (year) {
        query += " AND t.record_year = ?";
        params.push(year);
    }

    const whereClauses = [];
    appendTenantWhereClauses({
      whereClauses,
      params,
      scope: actorScope,
      clinicExpression: supportsClinic ? "t.clinic_id" : null,
      branchExpression: supportsBranch ? "t.branch_id" : null,
    });

    if (whereClauses.length > 0) {
      query += ` AND ${whereClauses.join(" AND ")}`;
    }
    
    query += " ORDER BY t.id DESC";

    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error("Error fetching timeline:", error);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/", async (req, res) => {
  const { patient_id, start_time, end_time, provider, procedure_text, notes, image_url, price, record_year, clinic_id, branch_id } = req.body;
  
  try {
    const actorScope = await getActorTenantScope(req);
    const supportsClinic = await hasColumn('treatment_timeline', 'clinic_id');
    const supportsBranch = await hasColumn('treatment_timeline', 'branch_id');

    let finalClinicId = toPositiveInt(clinic_id) || actorScope.clinicId;
    let finalBranchId = toPositiveInt(branch_id) || actorScope.branchId;

    const columns = ["patient_id", "start_time", "end_time", "provider", "procedure_text", "notes", "image_url", "price", "record_year"];
    const values = [patient_id, start_time, end_time, provider, procedure_text, notes, image_url, price || 0.00, record_year || 1];

    if (supportsClinic) {
      columns.push("clinic_id");
      values.push(finalClinicId);
    }
    if (supportsBranch) {
      columns.push("branch_id");
      values.push(finalBranchId);
    }

    const [result] = await db.query(
      `INSERT INTO treatment_timeline (${columns.join(", ")}) VALUES (${columns.map(() => "?").join(", ")})`,
      values
    );
    const [rows] = await db.query("SELECT * FROM treatment_timeline WHERE id = ?", [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error("Error adding timeline entry:", error);
    res.status(500).json({ message: "Server error" });
  }
});

router.delete("/:id", async (req, res) => {
  res.status(403).json({
    message: "Treatment timeline entries are history records and cannot be deleted.",
  });
});

module.exports = router;
