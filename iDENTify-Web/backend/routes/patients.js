const express = require("express");
const router = express.Router();
const db = require("../db");
const { getActorTenantScope, appendTenantWhereClauses, hasColumn, toPositiveInt } = require("../utils/accessControl");

// Helper: Safely parse JSON from the database
const safeJsonParse = (data, fallback) => {
  if (!data) return fallback;
  if (typeof data === "object") return data;
  try { return JSON.parse(data); } catch (e) { return fallback; }
};

// Helper: Convert undefined to null for MySQL
const safeVal = (val) => val === undefined ? null : val;

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

async function resolvePatientTenant({ clinicId, branchId, actorScope }) {
  let resolvedClinicId = toPositiveInt(clinicId);
  let resolvedBranchId = toPositiveInt(branchId);

  if (actorScope?.scoped) {
    if (!resolvedClinicId && actorScope.clinicId) resolvedClinicId = actorScope.clinicId;
    if (!resolvedBranchId && actorScope.branchId) resolvedBranchId = actorScope.branchId;
  }

  if (!resolvedClinicId && resolvedBranchId) {
    resolvedClinicId = await resolveClinicIdFromBranch(resolvedBranchId);
  }

  const hasViolation = actorScope?.scoped && (
    (actorScope.clinicId && resolvedClinicId && Number(actorScope.clinicId) !== Number(resolvedClinicId)) ||
    (actorScope.branchId && resolvedBranchId && Number(actorScope.branchId) !== Number(resolvedBranchId))
  );

  return { clinicId: resolvedClinicId, branchId: resolvedBranchId, hasViolation };
}

// Keep age as a birthdate-derived display value rather than persisted vitals metadata.
const sanitizeVitalsPayload = (vitals) => {
  if (!vitals || typeof vitals !== "object" || Array.isArray(vitals)) {
    return {};
  }

  const normalized = { ...vitals };
  if (Object.prototype.hasOwnProperty.call(normalized, "age")) {
    delete normalized.age;
  }

  return normalized;
};

// GET ALL PATIENTS
router.get("/", async (req, res) => {
  try {
    const { search, email } = req.query;
    const actorScope = await getActorTenantScope(req);
    const supportsClinic = await hasColumn('patients', 'clinic_id');
    const supportsBranch = await hasColumn('patients', 'branch_id');

    let query = "SELECT * FROM patients";
    let params = [];
    const whereClauses = [];

    if (email) {
      whereClauses.push("email = ?");
      params.push(email);
    } else if (search) {
      whereClauses.push("(full_name LIKE ? OR contact_number LIKE ?)");
      const term = `%${search}%`;
      params.push(term, term);
    }

    appendTenantWhereClauses({
      whereClauses,
      params,
      scope: actorScope,
      clinicExpression: supportsClinic ? "clinic_id" : null,
      branchExpression: supportsBranch ? "branch_id" : null,
    });

    if (whereClauses.length > 0) {
      query += ` WHERE ${whereClauses.join(" AND ")}`;
    }

    query += " ORDER BY id DESC";

    const [rows] = await db.query(query, params);
    
    const results = rows.map(p => ({
      ...p,
      medical_alerts: p.medical_alerts ? p.medical_alerts.split(',') : []
    }));
    
    res.json(results);
  } catch (error) {
    console.error("Error fetching patients:", error);
    res.status(500).json({ message: "Error fetching patients" });
  }
});

// GET FAMILY MEMBERS
router.get("/:id/family", async (req, res) => {
  const { id } = req.params;
  try {
    const actorScope = await getActorTenantScope(req);
    const supportsClinic = await hasColumn('patients', 'clinic_id');
    const supportsBranch = await hasColumn('patients', 'branch_id');

    const whereClauses = ["parent_id = ?"];
    const params = [id];

    appendTenantWhereClauses({
      whereClauses,
      params,
      scope: actorScope,
      clinicExpression: supportsClinic ? "clinic_id" : null,
      branchExpression: supportsBranch ? "branch_id" : null,
    });

    const [rows] = await db.query(
      `SELECT * FROM patients WHERE ${whereClauses.join(" AND ")}`,
      params
    );
    
    const results = rows.map(p => ({
      ...p,
      medical_alerts: p.medical_alerts ? p.medical_alerts.split(',') : []
    }));
    
    res.json(results);
  } catch (error) {
    console.error("Error fetching family members:", error);
    res.status(500).json({ message: "Error fetching family members" });
  }
});

// GET SINGLE PATIENT
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const actorScope = await getActorTenantScope(req);
    const supportsClinic = await hasColumn('patients', 'clinic_id');
    const supportsBranch = await hasColumn('patients', 'branch_id');

    const whereClauses = ["id = ?"];
    const params = [id];

    appendTenantWhereClauses({
      whereClauses,
      params,
      scope: actorScope,
      clinicExpression: supportsClinic ? "clinic_id" : null,
      branchExpression: supportsBranch ? "branch_id" : null,
    });

    const [patientRows] = await db.query(
      `SELECT * FROM patients WHERE ${whereClauses.join(" AND ")} LIMIT 1`,
      params
    );
    if (patientRows.length === 0) return res.status(404).json({ message: "Patient not found" });

    const patient = patientRows[0];
    patient.medical_alerts = patient.medical_alerts ? patient.medical_alerts.split(',') : [];

    const [recordRows] = await db.query(
      "SELECT * FROM patient_annual_records WHERE patient_id = ? ORDER BY record_year DESC LIMIT 1", 
      [id]
    );

    if (recordRows.length > 0) {
      const record = recordRows[0];
      patient.dental_history = record.dental_history || "";
      patient.vitals = safeJsonParse(record.vitals, {});
      patient.xrays = safeJsonParse(record.xrays, []);
    } else {
      patient.dental_history = "";
      patient.vitals = {};
      patient.xrays = [];
    }
    
    res.json(patient);
  } catch (error) {
    console.error("Error fetching patient:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// CREATE PATIENT
router.post("/", async (req, res) => {
  const { 
    first_name, last_name, middle_name, birthdate, gender, 
    address, street, barangay, city, province,
    contact_number, email, medical_alerts, medicalAlerts,
    dental_history, vitals, xrays, parent_id,
    clinic_id, branch_id
  } = req.body;
  
  const fName = safeVal(first_name);
  const lName = safeVal(last_name);
  const mName = safeVal(middle_name);
  const full_name = `${fName || ''} ${mName ? mName + ' ' : ''}${lName || ''}`.trim() || 'Unknown';
  
  const incomingAlerts = medicalAlerts !== undefined ? medicalAlerts : medical_alerts;
  const dbMedicalAlerts = Array.isArray(incomingAlerts) ? incomingAlerts.join(',') : safeVal(incomingAlerts);

  let parsedBirthdate = safeVal(birthdate);
  if (parsedBirthdate === "") parsedBirthdate = null;
  if (parsedBirthdate && parsedBirthdate.includes('T')) parsedBirthdate = parsedBirthdate.split('T')[0];

  try {
    const actorScope = await getActorTenantScope(req);
    const resolved = await resolvePatientTenant({ clinicId: clinic_id, branchId: branch_id, actorScope });
    
    if (resolved.hasViolation) {
      return res.status(403).json({ message: "You can only create patients for your assigned clinic." });
    }

    const supportsClinic = await hasColumn('patients', 'clinic_id');
    const supportsBranch = await hasColumn('patients', 'branch_id');

    const columns = [
      "full_name", "first_name", "last_name", "middle_name", 
      "birthdate", "gender", "address", "contact_number", 
      "email", "medical_alerts", "parent_id"
    ];
    const values = [
      full_name, fName, lName, mName, 
      parsedBirthdate, safeVal(gender), safeVal(address), safeVal(contact_number), 
      safeVal(email), dbMedicalAlerts, safeVal(parent_id)
    ];

    if (supportsClinic) {
      columns.push("clinic_id");
      values.push(resolved.clinicId);
    }
    if (supportsBranch) {
      columns.push("branch_id");
      values.push(resolved.branchId);
    }

    // Segmented address
    if (await hasColumn('patients', 'street')) {
      columns.push("street", "barangay", "city", "province");
      values.push(safeVal(street), safeVal(barangay), safeVal(city), safeVal(province));
    }

    const [result] = await db.query(
      `INSERT INTO patients (${columns.join(", ")}) VALUES (${columns.map(() => "?").join(", ")})`,
      values
    );

    const newId = result.insertId;

    const recordColumns = ["patient_id", "record_year", "dental_history", "vitals", "xrays", "status"];
    const recordValues = [newId, 1, safeVal(dental_history) || "", JSON.stringify(sanitizeVitalsPayload(vitals)), JSON.stringify(xrays || []), 'Active'];

    if (await hasColumn('patient_annual_records', 'clinic_id')) {
      recordColumns.push("clinic_id", "branch_id");
      recordValues.push(resolved.clinicId, resolved.branchId);
    }

    await db.query(
      `INSERT INTO patient_annual_records (${recordColumns.join(", ")}) VALUES (${recordColumns.map(() => "?").join(", ")})`,
      recordValues
    );

    res.status(201).json({ id: newId, message: "Patient and initial record created" });
  } catch (error) {
    console.error("Create error:", error);
    res.status(500).json({ message: "Failed to create patient" });
  }
});

// UPDATE PATIENT
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { 
    first_name, last_name, middle_name, birthdate, gender, 
    address, street, barangay, city, province,
    contact_number, email, medical_alerts, medicalAlerts,
    dental_history, vitals, xrays,
    clinic_id, branch_id
  } = req.body;
  
  try {
    const actorScope = await getActorTenantScope(req);
    const supportsClinic = await hasColumn('patients', 'clinic_id');
    const supportsBranch = await hasColumn('patients', 'branch_id');

    const checkWhereClauses = ["id = ?"];
    const checkParams = [id];
    appendTenantWhereClauses({
      whereClauses: checkWhereClauses,
      params: checkParams,
      scope: actorScope,
      clinicExpression: supportsClinic ? "clinic_id" : null,
      branchExpression: supportsBranch ? "branch_id" : null,
    });

    const [existing] = await db.query(`SELECT * FROM patients WHERE ${checkWhereClauses.join(" AND ")} LIMIT 1`, checkParams);
    if (!existing.length) return res.status(404).json({ message: "Patient not found or access denied." });

    const fName = safeVal(first_name);
    const lName = safeVal(last_name);
    const mName = safeVal(middle_name);
    const full_name = `${fName || ''} ${mName ? mName + ' ' : ''}${lName || ''}`.trim() || 'Unknown';
    
    const incomingAlerts = medicalAlerts !== undefined ? medicalAlerts : medical_alerts;
    const dbMedicalAlerts = Array.isArray(incomingAlerts) ? incomingAlerts.join(',') : safeVal(incomingAlerts);

    let parsedBirthdate = safeVal(birthdate);
    if (parsedBirthdate === "") parsedBirthdate = null;
    if (parsedBirthdate && parsedBirthdate.includes('T')) parsedBirthdate = parsedBirthdate.split('T')[0];

    const updateFields = [
      "full_name=?", "first_name=?", "last_name=?", "middle_name=?", 
      "birthdate=?", "gender=?", "address=?", "contact_number=?", 
      "email=?", "medical_alerts=?"
    ];
    const updateValues = [
      full_name, fName, lName, mName, 
      parsedBirthdate, safeVal(gender), safeVal(address), safeVal(contact_number), 
      safeVal(email), dbMedicalAlerts
    ];

    if (await hasColumn('patients', 'street')) {
      updateFields.push("street=?", "barangay=?", "city=?", "province=?");
      updateValues.push(safeVal(street), safeVal(barangay), safeVal(city), safeVal(province));
    }

    if (supportsClinic && clinic_id) {
       updateFields.push("clinic_id=?");
       updateValues.push(toPositiveInt(clinic_id));
    }
    if (supportsBranch && branch_id) {
       updateFields.push("branch_id=?");
       updateValues.push(toPositiveInt(branch_id));
    }

    updateValues.push(id);
    await db.query(
        `UPDATE patients SET ${updateFields.join(", ")} WHERE id=?`,
        updateValues
    );

    if (vitals !== undefined || dental_history !== undefined || xrays !== undefined) {
      const [records] = await db.query("SELECT id FROM patient_annual_records WHERE patient_id = ? ORDER BY record_year DESC LIMIT 1", [id]);

      if (records.length > 0) {
        let parFields = [];
        let parValues = [];

        if (vitals !== undefined) {
          parFields.push("vitals=?");
          parValues.push(JSON.stringify(sanitizeVitalsPayload(vitals)));
        }
        if (dental_history !== undefined) {
          parFields.push("dental_history=?");
          parValues.push(dental_history || "");
        }
        if (xrays !== undefined) {
          parFields.push("xrays=?");
          parValues.push(JSON.stringify(xrays || []));
        }

        if (parFields.length > 0) {
          parValues.push(records[0].id);
          await db.query(`UPDATE patient_annual_records SET ${parFields.join(", ")} WHERE id=?`, parValues);
        }
      }
    }

    res.json({ message: "Patient updated successfully" });
  } catch (error) {
    console.error("Update failed:", error);
    res.status(500).json({ message: "Update failed", error: error.message });
  }
});


// DELETE PATIENT (Family Member)
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const actorScope = await getActorTenantScope(req);
    const supportsClinic = await hasColumn('patients', 'clinic_id');
    const supportsBranch = await hasColumn('patients', 'branch_id');

    const whereClauses = ["id = ?"];
    const params = [id];
    appendTenantWhereClauses({
      whereClauses,
      params,
      scope: actorScope,
      clinicExpression: supportsClinic ? "clinic_id" : null,
      branchExpression: supportsBranch ? "branch_id" : null,
    });

    const [result] = await db.query(`DELETE FROM patients WHERE ${whereClauses.join(" AND ")}`, params);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Patient not found or access denied." });
    }

    res.json({ message: "Family member deleted successfully" });
  } catch (error) {
    console.error("Delete failed:", error);
    res.status(500).json({ message: "Delete failed", error: error.message });
  }
});
module.exports = router;
