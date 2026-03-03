const express = require("express");
const router = express.Router();
const db = require("../db");

// Get all patients
router.get("/", async (req, res) => {
  try {
    const { email, search } = req.query;
    let query = "SELECT * FROM patients";
    let params = [];

    if (email) {
      query += " WHERE email = ?";
      params.push(email);
    } else if (search) {
      // Search by First, Last, or Full Name
      query += " WHERE full_name LIKE ? OR first_name LIKE ? OR last_name LIKE ?";
      const likeTerm = `%${search}%`;
      params.push(likeTerm, likeTerm, likeTerm);
    } else {
      query += " ORDER BY id DESC";
    }

    const [rows] = await db.query(query, params);
    
    // Note: This list view only returns basic patient info from the patients table.
    // Vitals and history are in patient_annual_records, usually loaded in detail view.
    const results = rows.map(p => ({
      ...p,
      medical_alerts: p.medical_alerts ? p.medical_alerts.split(',') : [],
      // Default empty values since these are in a different table now
      dental_history: "", 
      vitals: {},
      xrays: [] 
    }));
    
    res.json(results);
  } catch (error) {
    console.error("Error fetching patients:", error);
    res.status(500).json({ message: "Server error fetching patients" });
  }
});

// Get Family Members
router.get("/:id/family", async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await db.query("SELECT * FROM patients WHERE parent_id = ?", [id]);
    
    // Map results to be safe, though family usually loads basic info
    const results = rows.map(p => ({
      ...p,
      medical_alerts: p.medical_alerts ? p.medical_alerts.split(',') : [],
      vitals: {} // Vitals are in annual records
    }));
    res.json(results);
  } catch (error) {
    console.error("Error fetching family:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get Single Patient (Merged with latest Annual Record)
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    // 1. Fetch Basic Patient Info
    const [patientRows] = await db.query("SELECT * FROM patients WHERE id = ?", [id]);
    if (patientRows.length === 0) return res.status(404).json({ message: "Patient not found" });

    const patient = patientRows[0];
    patient.medical_alerts = patient.medical_alerts ? patient.medical_alerts.split(',') : [];

    // 2. Fetch Latest Annual Record (for vitals, history, xrays)
    const [recordRows] = await db.query(
      "SELECT * FROM patient_annual_records WHERE patient_id = ? ORDER BY record_year DESC LIMIT 1", 
      [id]
    );

    if (recordRows.length > 0) {
      const record = recordRows[0];
      patient.dental_history = record.dental_history || "";
      patient.vitals = typeof record.vitals === 'string' ? JSON.parse(record.vitals) : (record.vitals || {});
      patient.xrays = typeof record.xrays === 'string' ? JSON.parse(record.xrays) : (record.xrays || []);
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

// Create patient (And initial record)
router.post("/", async (req, res) => {
  const { 
    full_name, first_name, last_name, middle_name,
    birthdate, gender, sex, address, 
    contact_number, contact, email, 
    medicalAlerts, dental_history, 
    vitals, age, dentist_id,
    parent_id, xrays 
  } = req.body;
  
  // 1. Prepare Patient Data
  let dbFullName = full_name;
  if (!dbFullName && (first_name || last_name)) {
      dbFullName = `${first_name || ''} ${middle_name ? middle_name + ' ' : ''}${last_name || ''}`.trim();
  }

  const dbGender = gender || sex;
  const dbContact = contact_number || contact;
  const dbMedicalAlerts = Array.isArray(medicalAlerts) ? medicalAlerts.join(',') : (medicalAlerts || null);
  
  // Prepare Vitals Data (for the separate table)
  let dbVitals = vitals || {};
  if (age && !dbVitals.age) dbVitals.age = age;
  if (dentist_id) dbVitals.dentist_id = dentist_id;
  const dbVitalsString = JSON.stringify(dbVitals);
  const dbXraysString = JSON.stringify(xrays || []);
  
  try {
    // 2. Insert into PATIENTS table (Only valid columns)
    const [result] = await db.query(
      `INSERT INTO patients (full_name, first_name, last_name, middle_name, birthdate, gender, address, contact_number, email, medical_alerts, parent_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [dbFullName, first_name, last_name, middle_name, birthdate || null, dbGender, address, dbContact, email, dbMedicalAlerts, parent_id || null]
    );

    const newPatientId = result.insertId;

    // 3. Insert into PATIENT_ANNUAL_RECORDS (Medical data goes here)
    // We default to record_year = 1 for the initial record
    await db.query(
      `INSERT INTO patient_annual_records (patient_id, record_year, dental_history, vitals, xrays, status)
       VALUES (?, 1, ?, ?, ?, 'Active')`,
      [newPatientId, dental_history || null, dbVitalsString, dbXraysString]
    );

    // Return the combined object
    const [rows] = await db.query("SELECT * FROM patients WHERE id = ?", [newPatientId]);
    const response = rows[0];
    response.vitals = dbVitals; // Attach back for frontend
    response.dental_history = dental_history;

    res.status(201).json(response);
  } catch (error) {
    console.error("Error creating patient:", error);
    res.status(500).json({ message: "Database error while creating patient: " + error.message });
  }
});

// Update patient
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { 
    full_name, name, first_name, last_name, middle_name,
    birthdate, gender, sex, address, 
    contact_number, contact, email, 
    medicalAlerts, dental_history,
    vitals, age, dentist_id, xrays 
  } = req.body;
  
  // 1. Prepare Patient Update
  let dbName = full_name || name;
  if (!dbName && (first_name || last_name)) {
      dbName = `${first_name || ''} ${middle_name ? middle_name + ' ' : ''}${last_name || ''}`.trim();
  }

  const dbGender = gender || sex;
  const dbContact = contact_number || contact;
  const dbMedicalAlerts = Array.isArray(medicalAlerts) ? medicalAlerts.join(',') : (medicalAlerts || null);
  
  // 2. Prepare Record Update
  let dbVitals = vitals || {};
  if (age) dbVitals.age = age;
  if (dentist_id) dbVitals.dentist_id = dentist_id;
  const dbVitalsString = JSON.stringify(dbVitals);
  
  try {
    // Update PATIENTS table
    await db.query(
        `UPDATE patients 
         SET full_name=?, first_name=?, last_name=?, middle_name=?, birthdate=?, gender=?, address=?, contact_number=?, email=?, medical_alerts=?
         WHERE id=?`,
        [dbName, first_name, last_name, middle_name, birthdate || null, dbGender, address, dbContact, email, dbMedicalAlerts, id]
    );

    // Update Latest PATIENT_ANNUAL_RECORD (if data is provided)
    // This finds the most recent year record and updates it
    if (dental_history !== undefined || vitals !== undefined || xrays !== undefined) {
      
      // Check if a record exists
      const [records] = await db.query("SELECT id FROM patient_annual_records WHERE patient_id = ? ORDER BY record_year DESC LIMIT 1", [id]);
      
      let xraysSql = "";
      let params = [];
      let dbXraysString = null;
      
      if (xrays !== undefined) {
         dbXraysString = JSON.stringify(xrays);
         xraysSql = ", xrays=?";
      }

      if (records.length > 0) {
        // Update existing
        const updateQuery = `UPDATE patient_annual_records SET vitals=?, dental_history=? ${xraysSql} WHERE id=?`;
        let updateParams = [dbVitalsString, dental_history || null];
        if (dbXraysString !== null) updateParams.push(dbXraysString);
        updateParams.push(records[0].id);

        await db.query(updateQuery, updateParams);
      } else {
        // Create new if missing (fallback)
        await db.query(
          `INSERT INTO patient_annual_records (patient_id, record_year, vitals, dental_history, xrays, status)
           VALUES (?, 1, ?, ?, ?, 'Active')`,
          [id, dbVitalsString, dental_history || null, dbXraysString || '[]']
        );
      }
    }

    const [rows] = await db.query("SELECT * FROM patients WHERE id = ?", [id]);
    res.json(rows[0]);
  } catch (error) {
    console.error("Error updating patient:", error);
    res.status(500).json({ message: "Database error while updating patient" });
  }
});

module.exports = router;