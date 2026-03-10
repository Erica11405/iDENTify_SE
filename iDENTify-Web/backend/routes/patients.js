// const express = require("express");
// const router = express.Router();
// const db = require("../db");

// // Get all patients
// router.get("/", async (req, res) => {
//   try {
//     const { email, search } = req.query;
//     let query = "SELECT * FROM patients";
//     let params = [];

//     if (email) {
//       query += " WHERE email = ?";
//       params.push(email);
//     } else if (search) {
//       // Search by First, Last, or Full Name
//       query += " WHERE full_name LIKE ? OR first_name LIKE ? OR last_name LIKE ?";
//       const likeTerm = `%${search}%`;
//       params.push(likeTerm, likeTerm, likeTerm);
//     } else {
//       query += " ORDER BY id DESC";
//     }

//     const [rows] = await db.query(query, params);
    
//     // Note: This list view only returns basic patient info from the patients table.
//     // Vitals and history are in patient_annual_records, usually loaded in detail view.
//     const results = rows.map(p => ({
//       ...p,
//       medical_alerts: p.medical_alerts ? p.medical_alerts.split(',') : [],
//       // Default empty values since these are in a different table now
//       dental_history: "", 
//       vitals: {},
//       xrays: [] 
//     }));
    
//     res.json(results);
//   } catch (error) {
//     console.error("Error fetching patients:", error);
//     res.status(500).json({ message: "Server error fetching patients" });
//   }
// });

// // Get Family Members
// router.get("/:id/family", async (req, res) => {
//   const { id } = req.params;
//   try {
//     const [rows] = await db.query("SELECT * FROM patients WHERE parent_id = ?", [id]);
    
//     // Map results to be safe, though family usually loads basic info
//     const results = rows.map(p => ({
//       ...p,
//       medical_alerts: p.medical_alerts ? p.medical_alerts.split(',') : [],
//       vitals: {} // Vitals are in annual records
//     }));
//     res.json(results);
//   } catch (error) {
//     console.error("Error fetching family:", error);
//     res.status(500).json({ message: "Server error" });
//   }
// });

// // Get Single Patient (Merged with latest Annual Record)
// router.get("/:id", async (req, res) => {
//   const { id } = req.params;
//   try {
//     // 1. Fetch Basic Patient Info
//     const [patientRows] = await db.query("SELECT * FROM patients WHERE id = ?", [id]);
//     if (patientRows.length === 0) return res.status(404).json({ message: "Patient not found" });

//     const patient = patientRows[0];
//     patient.medical_alerts = patient.medical_alerts ? patient.medical_alerts.split(',') : [];

//     // 2. Fetch Latest Annual Record (for vitals, history, xrays)
//     const [recordRows] = await db.query(
//       "SELECT * FROM patient_annual_records WHERE patient_id = ? ORDER BY record_year DESC LIMIT 1", 
//       [id]
//     );

//     if (recordRows.length > 0) {
//       const record = recordRows[0];
//       patient.dental_history = record.dental_history || "";
//       patient.vitals = typeof record.vitals === 'string' ? JSON.parse(record.vitals) : (record.vitals || {});
//       patient.xrays = typeof record.xrays === 'string' ? JSON.parse(record.xrays) : (record.xrays || []);
//     } else {
//       patient.dental_history = "";
//       patient.vitals = {};
//       patient.xrays = [];
//     }
    
//     res.json(patient);
//   } catch (error) {
//     console.error("Error fetching patient:", error);
//     res.status(500).json({ message: "Server error" });
//   }
// });

// // Create patient (And initial record)
// router.post("/", async (req, res) => {
//   const { 
//     full_name, first_name, last_name, middle_name,
//     birthdate, gender, sex, address, 
//     contact_number, contact, email, 
//     medicalAlerts, dental_history, 
//     vitals, age, dentist_id,
//     parent_id, xrays 
//   } = req.body;
  
//   // 1. Prepare Patient Data
//   let dbFullName = full_name;
//   if (!dbFullName && (first_name || last_name)) {
//       dbFullName = `${first_name || ''} ${middle_name ? middle_name + ' ' : ''}${last_name || ''}`.trim();
//   }

//   const dbGender = gender || sex;
//   const dbContact = contact_number || contact;
//   const dbMedicalAlerts = Array.isArray(medicalAlerts) ? medicalAlerts.join(',') : (medicalAlerts || null);
  
//   // Prepare Vitals Data (for the separate table)
//   let dbVitals = vitals || {};
//   if (age && !dbVitals.age) dbVitals.age = age;
//   if (dentist_id) dbVitals.dentist_id = dentist_id;
//   const dbVitalsString = JSON.stringify(dbVitals);
//   const dbXraysString = JSON.stringify(xrays || []);
  
//   try {
//     // 2. Insert into PATIENTS table (Only valid columns)
//     const [result] = await db.query(
//       `INSERT INTO patients (full_name, first_name, last_name, middle_name, birthdate, gender, address, contact_number, email, medical_alerts, parent_id)
//        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
//       [dbFullName, first_name, last_name, middle_name, birthdate || null, dbGender, address, dbContact, email, dbMedicalAlerts, parent_id || null]
//     );

//     const newPatientId = result.insertId;

//     // 3. Insert into PATIENT_ANNUAL_RECORDS (Medical data goes here)
//     // We default to record_year = 1 for the initial record
//     await db.query(
//       `INSERT INTO patient_annual_records (patient_id, record_year, dental_history, vitals, xrays, status)
//        VALUES (?, 1, ?, ?, ?, 'Active')`,
//       [newPatientId, dental_history || null, dbVitalsString, dbXraysString]
//     );

//     // Return the combined object
//     const [rows] = await db.query("SELECT * FROM patients WHERE id = ?", [newPatientId]);
//     const response = rows[0];
//     response.vitals = dbVitals; // Attach back for frontend
//     response.dental_history = dental_history;

//     res.status(201).json(response);
//   } catch (error) {
//     console.error("Error creating patient:", error);
//     res.status(500).json({ message: "Database error while creating patient: " + error.message });
//   }
// });

// // Update patient
// router.put("/:id", async (req, res) => {
//   const { id } = req.params;
//   const { 
//     full_name, name, first_name, last_name, middle_name,
//     birthdate, gender, sex, address, 
//     contact_number, contact, email, 
//     medicalAlerts, dental_history,
//     vitals, age, dentist_id, xrays 
//   } = req.body;
  
//   // 1. Prepare Patient Update
//   let dbName = full_name || name;
//   if (!dbName && (first_name || last_name)) {
//       dbName = `${first_name || ''} ${middle_name ? middle_name + ' ' : ''}${last_name || ''}`.trim();
//   }

//   const dbGender = gender || sex;
//   const dbContact = contact_number || contact;
//   const dbMedicalAlerts = Array.isArray(medicalAlerts) ? medicalAlerts.join(',') : (medicalAlerts || null);
  
//   // 2. Prepare Record Update
//   let dbVitals = vitals || {};
//   if (age) dbVitals.age = age;
//   if (dentist_id) dbVitals.dentist_id = dentist_id;
//   const dbVitalsString = JSON.stringify(dbVitals);
  
//   try {
//     // Update PATIENTS table
//     await db.query(
//         `UPDATE patients 
//          SET full_name=?, first_name=?, last_name=?, middle_name=?, birthdate=?, gender=?, address=?, contact_number=?, email=?, medical_alerts=?
//          WHERE id=?`,
//         [dbName, first_name, last_name, middle_name, birthdate || null, dbGender, address, dbContact, email, dbMedicalAlerts, id]
//     );

//     // Update Latest PATIENT_ANNUAL_RECORD (if data is provided)
//     // This finds the most recent year record and updates it
//     if (dental_history !== undefined || vitals !== undefined || xrays !== undefined) {
      
//       // Check if a record exists
//       const [records] = await db.query("SELECT id FROM patient_annual_records WHERE patient_id = ? ORDER BY record_year DESC LIMIT 1", [id]);
      
//       let xraysSql = "";
//       let params = [];
//       let dbXraysString = null;
      
//       if (xrays !== undefined) {
//          dbXraysString = JSON.stringify(xrays);
//          xraysSql = ", xrays=?";
//       }

//       if (records.length > 0) {
//         // Update existing
//         const updateQuery = `UPDATE patient_annual_records SET vitals=?, dental_history=? ${xraysSql} WHERE id=?`;
//         let updateParams = [dbVitalsString, dental_history || null];
//         if (dbXraysString !== null) updateParams.push(dbXraysString);
//         updateParams.push(records[0].id);

//         await db.query(updateQuery, updateParams);
//       } else {
//         // Create new if missing (fallback)
//         await db.query(
//           `INSERT INTO patient_annual_records (patient_id, record_year, vitals, dental_history, xrays, status)
//            VALUES (?, 1, ?, ?, ?, 'Active')`,
//           [id, dbVitalsString, dental_history || null, dbXraysString || '[]']
//         );
//       }
//     }

//     const [rows] = await db.query("SELECT * FROM patients WHERE id = ?", [id]);
//     res.json(rows[0]);
//   } catch (error) {
//     console.error("Error updating patient:", error);
//     res.status(500).json({ message: "Database error while updating patient" });
//   }
// });

// module.exports = router;


// const express = require("express");
// const router = express.Router();
// const db = require("../db");

// // Helper function to safely parse JSON without crashing the server
// const safeJsonParse = (data, fallback) => {
//   if (!data) return fallback;
//   if (typeof data === "object") return data; // Already an object/array
//   try {
//     return JSON.parse(data);
//   } catch (e) {
//     console.warn("JSON Parse error on data:", data);
//     return fallback;
//   }
// };

// // Get all patients (UPDATED: Added Search Logic and Safe Parsing)
// router.get("/", async (req, res) => {
//   try {
//     const { email, search } = req.query; // Extract 'search' param
//     let query = "SELECT * FROM patients";
//     let params = [];

//     if (email) {
//       query += " WHERE email = ?";
//       params.push(email);
//     } else if (search) {
//       // Search by First, Last, or Full Name
//       query += " WHERE full_name LIKE ? OR first_name LIKE ? OR last_name LIKE ?";
//       const likeTerm = `%${search}%`;
//       params.push(likeTerm, likeTerm, likeTerm);
//     } else {
//       query += " ORDER BY id DESC";
//     }

//     const [rows] = await db.query(query, params);
    
//     const results = rows.map(p => ({
//       ...p,
//       medical_alerts: p.medical_alerts ? String(p.medical_alerts).split(',') : [],
//       dental_history: p.dental_history || "", 
//       vitals: safeJsonParse(p.vitals, {}),
//       xrays: safeJsonParse(p.xrays, []) 
//     }));
    
//     res.json(results);
//   } catch (error) {
//     console.error("Error fetching patients:", error);
//     res.status(500).json({ message: "Server error fetching patients" });
//   }
// });

// // Get Family Members
// router.get("/:id/family", async (req, res) => {
//   const { id } = req.params;
//   try {
//     const [rows] = await db.query("SELECT * FROM patients WHERE parent_id = ?", [id]);
//     const results = rows.map(p => ({
//       ...p,
//       vitals: safeJsonParse(p.vitals, {}),
//       xrays: safeJsonParse(p.xrays, []) 
//     }));
//     res.json(results);
//   } catch (error) {
//     console.error("Error fetching family:", error);
//     res.status(500).json({ message: "Server error" });
//   }
// });

// // Get Single Patient
// router.get("/:id", async (req, res) => {
//   const { id } = req.params;
//   try {
//     const [rows] = await db.query("SELECT * FROM patients WHERE id = ?", [id]);
//     if (rows.length === 0) return res.status(404).json({ message: "Patient not found" });

//     const patient = rows[0];
//     patient.medical_alerts = patient.medical_alerts ? String(patient.medical_alerts).split(',') : [];
//     patient.vitals = safeJsonParse(patient.vitals, {});
//     patient.xrays = safeJsonParse(patient.xrays, []);
    
//     res.json(patient);
//   } catch (error) {
//     console.error("Error fetching patient:", error);
//     res.status(500).json({ message: "Server error" });
//   }
// });

// // Create patient
// router.post("/", async (req, res) => {
//   const { 
//     full_name, first_name, last_name, middle_name,
//     birthdate, gender, sex, address, 
//     contact_number, contact, email, 
//     medicalAlerts, dental_history, 
//     vitals, age, dentist_id,
//     parent_id, xrays 
//   } = req.body;
  
//   let dbFullName = full_name;
//   if (!dbFullName && (first_name || last_name)) {
//       dbFullName = `${first_name || ''} ${middle_name ? middle_name + ' ' : ''}${last_name || ''}`.trim();
//   }

//   const dbGender = gender || sex;
//   const dbContact = contact_number || contact;
//   const dbMedicalAlerts = Array.isArray(medicalAlerts) ? medicalAlerts.join(',') : (medicalAlerts || null);
  
//   // Safely parse incoming vitals in case frontend sent it as a string
//   let dbVitals = safeJsonParse(vitals, {});
//   if (age && !dbVitals.age) dbVitals.age = age;
//   if (dentist_id) dbVitals.dentist_id = dentist_id;
  
//   const dbVitalsString = JSON.stringify(dbVitals);
//   const dbXraysString = JSON.stringify(safeJsonParse(xrays, []));
  
//   try {
//     const [result] = await db.query(
//       `INSERT INTO patients (full_name, first_name, last_name, middle_name, birthdate, gender, address, contact_number, email, medical_alerts, dental_history, vitals, xrays, parent_id)
//        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
//       [dbFullName, first_name, last_name, middle_name, birthdate || null, dbGender, address, dbContact, email, dbMedicalAlerts, dental_history || null, dbVitalsString, dbXraysString, parent_id || null]
//     );

//     const [rows] = await db.query("SELECT * FROM patients WHERE id = ?", [result.insertId]);
    
//     // Format the response immediately after creation so the frontend gets the right structure
//     const newPatient = rows[0];
//     newPatient.medical_alerts = newPatient.medical_alerts ? String(newPatient.medical_alerts).split(',') : [];
//     newPatient.vitals = safeJsonParse(newPatient.vitals, {});
//     newPatient.xrays = safeJsonParse(newPatient.xrays, []);

//     res.status(201).json(newPatient);
//   } catch (error) {
//     console.error("Error creating patient:", error);
//     res.status(500).json({ message: "Database error while creating patient" });
//   }
// });

// // Update patient (UPDATED: Merges new data with existing data to prevent wiping)
// router.put("/:id", async (req, res) => {
//   const { id } = req.params;
//   const { 
//     full_name, name, first_name, last_name, middle_name,
//     birthdate, gender, sex, address, 
//     contact_number, contact, email, 
//     medicalAlerts, medical_alerts, dental_history,
//     vitals, age, dentist_id, xrays, parent_id
//   } = req.body;
  
//   try {
//     // 1. Fetch the existing patient first to prevent data wiping
//     const [existingRows] = await db.query("SELECT * FROM patients WHERE id = ?", [id]);
//     if (existingRows.length === 0) return res.status(404).json({ message: "Patient not found" });
//     const existingPatient = existingRows[0];

//     // 2. Handle Name
//     let dbName = full_name || name;
//     if (!dbName && (first_name || last_name)) {
//         dbName = `${first_name || ''} ${middle_name ? middle_name + ' ' : ''}${last_name || ''}`.trim();
//     }
//     dbName = dbName || existingPatient.full_name;

//     const dbGender = gender || sex || existingPatient.gender;
//     const dbContact = contact_number || contact || existingPatient.contact_number;
    
//     // 3. Handle Medical Alerts
//     const incomingAlerts = medicalAlerts || medical_alerts;
//     let dbMedicalAlerts = existingPatient.medical_alerts;
//     if (incomingAlerts !== undefined) {
//         dbMedicalAlerts = Array.isArray(incomingAlerts) ? incomingAlerts.join(',') : incomingAlerts;
//     }
    
//     // 4. Merge Vitals (Keep old vitals if not provided in the update request)
//     let existingVitals = safeJsonParse(existingPatient.vitals, {});
//     let incomingVitals = vitals !== undefined ? safeJsonParse(vitals, {}) : existingVitals;
    
//     if (age) incomingVitals.age = age;
//     if (dentist_id) incomingVitals.dentist_id = dentist_id;
//     const dbVitalsString = JSON.stringify(incomingVitals);
    
//     // 5. Merge X-Rays (Keep old x-rays if not provided in the update request)
//     let dbXraysString = existingPatient.xrays; 
//     if (xrays !== undefined) {
//         dbXraysString = JSON.stringify(safeJsonParse(xrays, []));
//     }

//     // 6. Handle Parent ID
//     let dbParentId = parent_id !== undefined ? parent_id : existingPatient.parent_id;

//     // Execute Update
//     await db.query(
//         `UPDATE patients 
//          SET full_name=?, first_name=?, last_name=?, middle_name=?, birthdate=?, gender=?, address=?, contact_number=?, email=?, medical_alerts=?, dental_history=?, vitals=?, xrays=?, parent_id=?
//          WHERE id=?`,
//         [
//           dbName, 
//           first_name !== undefined ? first_name : existingPatient.first_name, 
//           last_name !== undefined ? last_name : existingPatient.last_name, 
//           middle_name !== undefined ? middle_name : existingPatient.middle_name, 
//           birthdate !== undefined ? birthdate : existingPatient.birthdate, 
//           dbGender, 
//           address !== undefined ? address : existingPatient.address, 
//           dbContact, 
//           email !== undefined ? email : existingPatient.email, 
//           dbMedicalAlerts, 
//           dental_history !== undefined ? dental_history : existingPatient.dental_history, 
//           dbVitalsString, 
//           dbXraysString, 
//           dbParentId,
//           id
//         ]
//     );

//     // Return the updated row
//     const [updatedRows] = await db.query("SELECT * FROM patients WHERE id = ?", [id]);
    
//     // Format response identically to GET requests so the frontend doesn't crash
//     const formattedPatient = updatedRows[0];
//     formattedPatient.medical_alerts = formattedPatient.medical_alerts ? String(formattedPatient.medical_alerts).split(',') : [];
//     formattedPatient.vitals = safeJsonParse(formattedPatient.vitals, {});
//     formattedPatient.xrays = safeJsonParse(formattedPatient.xrays, []);

//     res.json(formattedPatient);
//   } catch (error) {
//     console.error("Error updating patient:", error);
//     res.status(500).json({ message: "Database error while updating patient" });
//   }
// });

// module.exports = router;

// // POST route to create a new patient
// router.post('/', async (req, res) => {
//     const { 
//         full_name, 
//         first_name, 
//         last_name, 
//         middle_name, 
//         birthdate, 
//         gender, 
//         address, 
//         contact_number, 
//         email, 
//         medical_alerts, 
//         dental_history, 
//         parent_id 
//     } = req.body;

//     try {
//         // Updated query: Removed 'vitals' and 'xrays' from the column list and values
//         const query = `
//             INSERT INTO patients (
//                 full_name, 
//                 first_name, 
//                 last_name, 
//                 middle_name, 
//                 birthdate, 
//                 gender, 
//                 address, 
//                 contact_number, 
//                 email, 
//                 medical_alerts, 
//                 dental_history, 
//                 parent_id
//             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

//         const values = [
//             full_name, 
//             first_name, 
//             last_name, 
//             middle_name, 
//             birthdate || null, 
//             gender || 'Unspecified', 
//             address || 'Update your profile', 
//             contact_number || null, 
//             email, 
//             // Join array to string if needed, otherwise null
//             Array.isArray(medical_alerts) ? medical_alerts.join(', ') : (medical_alerts || null),
//             dental_history || null,
//             parent_id || null
//         ];

//         const [result] = await db.query(query, values);
        
//         res.status(201).json({ 
//             message: 'Patient created successfully', 
//             patientId: result.insertId 
//         });

//     } catch (error) {
//         console.error('Error creating patient:', error);
//         res.status(500).json({ error: 'Failed to create patient in DB' });
//     }
// });


const express = require("express");
const router = express.Router();
const db = require("../db");

// Helper: Safely parse JSON from the database
const safeJsonParse = (data, fallback) => {
  if (!data) return fallback;
  if (typeof data === "object") return data;
  try {
    return JSON.parse(data);
  } catch (e) {
    return fallback;
  }
};

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
    
    // Format medical_alerts for the frontend
    const results = rows.map(p => ({
      ...p,
      medical_alerts: p.medical_alerts ? p.medical_alerts.split(',') : []
    }));
    
    res.json(results);
  } catch (error) {
    res.status(500).json({ message: "Error fetching patients" });
  }
});

// GET SINGLE PATIENT (Merged with latest Annual Record)
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const [patientRows] = await db.query("SELECT * FROM patients WHERE id = ?", [id]);
    if (patientRows.length === 0) return res.status(404).json({ message: "Patient not found" });

    const patient = patientRows[0];
    patient.medical_alerts = patient.medical_alerts ? patient.medical_alerts.split(',') : [];

    // Fetch medical data from the Annual Records table
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

// CREATE PATIENT (Split into two tables)
router.post("/", async (req, res) => {
  const { 
    first_name, last_name, middle_name, birthdate, gender, 
    address, contact_number, email, medical_alerts, 
    dental_history, vitals, xrays, parent_id 
  } = req.body;
  
  const full_name = `${first_name} ${middle_name ? middle_name + ' ' : ''}${last_name}`.trim();
  const dbMedicalAlerts = Array.isArray(medical_alerts) ? medical_alerts.join(',') : medical_alerts;

  try {
    // 1. Insert Static Info
    const [result] = await db.query(
      `INSERT INTO patients (full_name, first_name, last_name, middle_name, birthdate, gender, address, contact_number, email, medical_alerts, parent_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [full_name, first_name, last_name, middle_name, birthdate || null, gender, address, contact_number, email, dbMedicalAlerts, parent_id || null]
    );

    const newId = result.insertId;

    // 2. Insert Medical Info into Records Table
    await db.query(
      `INSERT INTO patient_annual_records (patient_id, record_year, dental_history, vitals, xrays, status)
       VALUES (?, 1, ?, ?, ?, 'Active')`,
      [newId, dental_history || "", JSON.stringify(vitals || {}), JSON.stringify(xrays || [])]
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
    address, contact_number, email, medical_alerts, 
    dental_history, vitals, xrays 
  } = req.body;
  
  const full_name = `${first_name} ${middle_name ? middle_name + ' ' : ''}${last_name}`.trim();
  const dbMedicalAlerts = Array.isArray(medical_alerts) ? medical_alerts.join(',') : medical_alerts;

  try {
    // Update main table
    await db.query(
        `UPDATE patients SET full_name=?, first_name=?, last_name=?, middle_name=?, birthdate=?, gender=?, address=?, contact_number=?, email=?, medical_alerts=? WHERE id=?`,
        [full_name, first_name, last_name, middle_name, birthdate || null, gender, address, contact_number, email, dbMedicalAlerts, id]
    );

    // Update or Create the medical record
    const [records] = await db.query("SELECT id FROM patient_annual_records WHERE patient_id = ? ORDER BY record_year DESC LIMIT 1", [id]);

    if (records.length > 0) {
      await db.query(
        `UPDATE patient_annual_records SET vitals=?, dental_history=?, xrays=? WHERE id=?`,
        [JSON.stringify(vitals || {}), dental_history || "", JSON.stringify(xrays || []), records[0].id]
      );
    }

    res.json({ message: "Patient updated successfully" });
  } catch (error) {
    res.status(500).json({ message: "Update failed" });
  }
});

module.exports = router;