// const express = require("express");
// const router = express.Router();
// const db = require("../db");

// // Helper: Safely parse JSON from the database
// const safeJsonParse = (data, fallback) => {
//   if (!data) return fallback;
//   if (typeof data === "object") return data;
//   try {
//     return JSON.parse(data);
//   } catch (e) {
//     return fallback;
//   }
// };

// // GET ALL PATIENTS
// router.get("/", async (req, res) => {
//   try {
//     const { search } = req.query;
//     let query = "SELECT * FROM patients";
//     let params = [];

//     if (search) {
//       query += " WHERE full_name LIKE ? OR contact_number LIKE ?";
//       const term = `%${search}%`;
//       params.push(term, term);
//     } else {
//       query += " ORDER BY id DESC";
//     }

//     const [rows] = await db.query(query, params);
    
//     // Format medical_alerts for the frontend
//     const results = rows.map(p => ({
//       ...p,
//       medical_alerts: p.medical_alerts ? p.medical_alerts.split(',') : []
//     }));
    
//     res.json(results);
//   } catch (error) {
//     res.status(500).json({ message: "Error fetching patients" });
//   }
// });

// // GET SINGLE PATIENT (Merged with latest Annual Record)
// router.get("/:id", async (req, res) => {
//   const { id } = req.params;
//   try {
//     const [patientRows] = await db.query("SELECT * FROM patients WHERE id = ?", [id]);
//     if (patientRows.length === 0) return res.status(404).json({ message: "Patient not found" });

//     const patient = patientRows[0];
//     patient.medical_alerts = patient.medical_alerts ? patient.medical_alerts.split(',') : [];

//     // Fetch medical data from the Annual Records table
//     const [recordRows] = await db.query(
//       "SELECT * FROM patient_annual_records WHERE patient_id = ? ORDER BY record_year DESC LIMIT 1", 
//       [id]
//     );

//     if (recordRows.length > 0) {
//       const record = recordRows[0];
//       patient.dental_history = record.dental_history || "";
//       patient.vitals = safeJsonParse(record.vitals, {});
//       patient.xrays = safeJsonParse(record.xrays, []);
//     } else {
//       patient.dental_history = "";
//       patient.vitals = {};
//       patient.xrays = [];
//     }
    
//     res.json(patient);
//   } catch (error) {
//     res.status(500).json({ message: "Server error" });
//   }
// });

// // CREATE PATIENT (Split into two tables)
// router.post("/", async (req, res) => {
//   const { 
//     first_name, last_name, middle_name, birthdate, gender, 
//     address, contact_number, email, medical_alerts, 
//     dental_history, vitals, xrays, parent_id 
//   } = req.body;
  
//   const full_name = `${first_name} ${middle_name ? middle_name + ' ' : ''}${last_name}`.trim();
//   const dbMedicalAlerts = Array.isArray(medical_alerts) ? medical_alerts.join(',') : medical_alerts;

//   try {
//     // 1. Insert Static Info
//     const [result] = await db.query(
//       `INSERT INTO patients (full_name, first_name, last_name, middle_name, birthdate, gender, address, contact_number, email, medical_alerts, parent_id)
//        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
//       [full_name, first_name, last_name, middle_name, birthdate || null, gender, address, contact_number, email, dbMedicalAlerts, parent_id || null]
//     );

//     const newId = result.insertId;

//     // 2. Insert Medical Info into Records Table
//     await db.query(
//       `INSERT INTO patient_annual_records (patient_id, record_year, dental_history, vitals, xrays, status)
//        VALUES (?, 1, ?, ?, ?, 'Active')`,
//       [newId, dental_history || "", JSON.stringify(vitals || {}), JSON.stringify(xrays || [])]
//     );

//     res.status(201).json({ id: newId, message: "Patient and initial record created" });
//   } catch (error) {
//     console.error("Create error:", error);
//     res.status(500).json({ message: "Failed to create patient" });
//   }
// });

// // UPDATE PATIENT
// router.put("/:id", async (req, res) => {
//   const { id } = req.params;
//   const { 
//     first_name, last_name, middle_name, birthdate, gender, 
//     address, contact_number, email, medical_alerts, 
//     dental_history, vitals, xrays 
//   } = req.body;
  
//   const full_name = `${first_name} ${middle_name ? middle_name + ' ' : ''}${last_name}`.trim();
//   const dbMedicalAlerts = Array.isArray(medical_alerts) ? medical_alerts.join(',') : medical_alerts;

//   try {
//     // Update main table
//     await db.query(
//         `UPDATE patients SET full_name=?, first_name=?, last_name=?, middle_name=?, birthdate=?, gender=?, address=?, contact_number=?, email=?, medical_alerts=? WHERE id=?`,
//         [full_name, first_name, last_name, middle_name, birthdate || null, gender, address, contact_number, email, dbMedicalAlerts, id]
//     );

//     // Update or Create the medical record
//     const [records] = await db.query("SELECT id FROM patient_annual_records WHERE patient_id = ? ORDER BY record_year DESC LIMIT 1", [id]);

//     if (records.length > 0) {
//       await db.query(
//         `UPDATE patient_annual_records SET vitals=?, dental_history=?, xrays=? WHERE id=?`,
//         [JSON.stringify(vitals || {}), dental_history || "", JSON.stringify(xrays || []), records[0].id]
//       );
//     }

//     res.json({ message: "Patient updated successfully" });
//   } catch (error) {
//     res.status(500).json({ message: "Update failed" });
//   }
// });

// module.exports = router;


const express = require("express");
const router = express.Router();
const db = require("../db");

// Helper: Safely parse JSON from the database
const safeJsonParse = (data, fallback) => {
  if (!data) return fallback;
  if (typeof data === "object") return data;
  try { return JSON.parse(data); } catch (e) { return fallback; }
};

// Helper: Convert undefined to null for MySQL
const safeVal = (val) => val === undefined ? null : val;

// GET ALL PATIENTS
router.get("/", async (req, res) => {
  try {
    const { search } = req.query;
    let query = "SELECT * FROM patients";
    let params = [];

    if (search) {
      query += " WHERE full_name LIKE ? OR contact_number LIKE ?";
      const term = `%${search}%`;
      params.push(term, term);
    } else {
      query += " ORDER BY id DESC";
    }

    const [rows] = await db.query(query, params);
    
    const results = rows.map(p => ({
      ...p,
      medical_alerts: p.medical_alerts ? p.medical_alerts.split(',') : []
    }));
    
    res.json(results);
  } catch (error) {
    res.status(500).json({ message: "Error fetching patients" });
  }
});

// GET SINGLE PATIENT
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const [patientRows] = await db.query("SELECT * FROM patients WHERE id = ?", [id]);
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
    res.status(500).json({ message: "Server error" });
  }
});

// CREATE PATIENT
router.post("/", async (req, res) => {
  const { 
    first_name, last_name, middle_name, birthdate, gender, 
    address, contact_number, email, medical_alerts, medicalAlerts,
    dental_history, vitals, xrays, parent_id 
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
    const [result] = await db.query(
      `INSERT INTO patients (full_name, first_name, last_name, middle_name, birthdate, gender, address, contact_number, email, medical_alerts, parent_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [full_name, fName, lName, mName, parsedBirthdate, safeVal(gender), safeVal(address), safeVal(contact_number), safeVal(email), dbMedicalAlerts, safeVal(parent_id)]
    );

    const newId = result.insertId;

    await db.query(
      `INSERT INTO patient_annual_records (patient_id, record_year, dental_history, vitals, xrays, status)
       VALUES (?, 1, ?, ?, ?, 'Active')`,
      [newId, safeVal(dental_history) || "", JSON.stringify(vitals || {}), JSON.stringify(xrays || [])]
    );

    res.status(201).json({ id: newId, message: "Patient and initial record created" });
  } catch (error) {
    console.error("Create error:", error);
    res.status(500).json({ message: "Failed to create patient" });
  }
});

// UPDATE PATIENT (The Fix for the Complete Year 1 Button)
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { 
    first_name, last_name, middle_name, birthdate, gender, 
    address, contact_number, email, medical_alerts, medicalAlerts,
    dental_history, vitals, xrays 
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
    await db.query(
        `UPDATE patients SET full_name=?, first_name=?, last_name=?, middle_name=?, birthdate=?, gender=?, address=?, contact_number=?, email=?, medical_alerts=? WHERE id=?`,
        [full_name, fName, lName, mName, parsedBirthdate, safeVal(gender), safeVal(address), safeVal(contact_number), safeVal(email), dbMedicalAlerts, id]
    );

    if (vitals !== undefined || dental_history !== undefined || xrays !== undefined) {
      const [records] = await db.query("SELECT id FROM patient_annual_records WHERE patient_id = ? ORDER BY record_year DESC LIMIT 1", [id]);

      if (records.length > 0) {
        let updateQuery = "UPDATE patient_annual_records SET ";
        let updateParams = [];

        if (vitals !== undefined) { updateQuery += "vitals=?, "; updateParams.push(JSON.stringify(vitals || {})); }
        if (dental_history !== undefined) { updateQuery += "dental_history=?, "; updateParams.push(dental_history || ""); }
        if (xrays !== undefined) { updateQuery += "xrays=?, "; updateParams.push(JSON.stringify(xrays || [])); }

        updateQuery = updateQuery.slice(0, -2) + " WHERE id=?";
        updateParams.push(records[0].id);

        await db.query(updateQuery, updateParams);
      }
    }

    res.json({ message: "Patient updated successfully" });
  } catch (error) {
    console.error("Update failed:", error);
    res.status(500).json({ message: "Update failed", error: error.message });
  }
});

module.exports = router;