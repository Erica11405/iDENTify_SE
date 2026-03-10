// const express = require("express");
// const router = express.Router();
// const db = require("../db");

// /**
//  * Helper to parse Date Strings into MySQL "YYYY-MM-DD HH:MM:SS"
//  * Handles 12-hour (Web) and 24-hour (Mobile) formats.
//  */
// function parseTime(dateTimeStr) {
//   if (!dateTimeStr) return null;

//   // 1. Try 12-Hour Format: "YYYY-MM-DD HH:MM AM/PM"
//   let parts = dateTimeStr.match(/(\d{4})-(\d{2})-(\d{2}) (\d{1,2}):(\d{2}) (AM|PM)/);
//   if (parts) {
//     let [, year, month, day, hour, minute, meridiem] = parts;
//     let hourInt = parseInt(hour, 10);
//     if (meridiem === 'PM' && hourInt < 12) hourInt += 12;
//     if (meridiem === 'AM' && hourInt === 12) hourInt = 0;
//     return `${year}-${month}-${day} ${hourInt.toString().padStart(2, '0')}:${minute}:00`;
//   }

//   // 2. Try 24-Hour Format: "YYYY-MM-DD HH:MM:SS"
//   parts = dateTimeStr.match(/(\d{4})-(\d{2})-(\d{2}) (\d{1,2}):(\d{2})(?::(\d{2}))?/);
//   if (parts) {
//     let [, year, month, day, hour, minute, second] = parts;
//     return `${year}-${month}-${day} ${hour}:${minute}:${second || '00'}`;
//   }

//   return dateTimeStr; 
// }

// // --- ENDPOINT: Check Daily Limit ---
// // Fixes 404 errors when the frontend checks if a dentist is full.
// router.get("/check-limit", async (req, res) => {
//   const { dentist_id, date } = req.query;
//   if (!dentist_id || !date) {
//     return res.status(400).json({ message: "Missing dentist_id or date" });
//   }

//   try {
//     const [countResult] = await db.query(
//       `SELECT COUNT(*) as count 
//        FROM appointments 
//        WHERE dentist_id = ? 
//          AND DATE(appointment_datetime) = ? 
//          AND status != 'Cancelled'`,
//       [dentist_id, date]
//     );

//     const count = countResult[0].count;
//     res.json({
//       count,
//       limit: 5,
//       isFull: count >= 5,
//       remaining: Math.max(0, 5 - count)
//     });
//   } catch (err) {
//     console.error("Error checking limit:", err);
//     res.status(500).json({ message: "Server error checking limit" });
//   }
// });

// // --- ENDPOINT: Get All Appointments ---
// // Fetches appointments and joins with patients to get names.
// router.get("/", async (req, res) => {
//   const { patient_id, date } = req.query;
//   let query = `
//     SELECT a.*, a.reason AS \`procedure\`, p.full_name 
//     FROM appointments a
//     JOIN patients p ON a.patient_id = p.id
//   `;
//   const params = [];

//   if (patient_id) {
//     query += " WHERE a.patient_id = ?";
//     params.push(patient_id);
//   } else if (date) {
//     query += " WHERE DATE(a.appointment_datetime) = ?";
//     params.push(date);
//   }

//   query += " ORDER BY a.appointment_datetime ASC";

//   try {
//     const [rows] = await db.query(query, params);
//     res.json(rows);
//   } catch (err) {
//     console.error("Error fetching appointments:", err);
//     res.status(500).json({ message: "Error fetching appointments" });
//   }
// });

// // --- ENDPOINT: Add New Appointment ---
// // Combines 'services' tags into the 'reason' column.
// router.post("/", async (req, res) => {
//   const { patient_id, dentist_id, timeStart, procedure, services, notes, status } = req.body;
//   const appointment_datetime = parseTime(timeStart);

//   if (!appointment_datetime) {
//     return res.status(400).json({ message: "Invalid Start Time Format" });
//   }

//   // Logic to handle multiple services added via the frontend "+" button
//   let finalReason = procedure || "";
//   if (services && Array.isArray(services)) {
//     finalReason = services.join(", ");
//   } else if (services) {
//     finalReason = services;
//   }

//   try {
//     const [result] = await db.query(
//       `INSERT INTO appointments (patient_id, dentist_id, appointment_datetime, reason, notes, status)
//        VALUES (?, ?, ?, ?, ?, ?)`,
//       [patient_id, dentist_id, appointment_datetime, finalReason, notes || "", status || 'Scheduled']
//     );
    
//     // We return the full object with full_name so the React state updates correctly
//     const [rows] = await db.query(
//         `SELECT a.*, a.reason AS \`procedure\`, p.full_name 
//          FROM appointments a 
//          JOIN patients p ON a.patient_id = p.id 
//          WHERE a.id = ?`,
//         [result.insertId]
//     );

//     res.status(201).json(rows[0]);
//   } catch (err) {
//     console.error("Database Save Error:", err);
//     res.status(500).json({ message: "Database error saving appointment" });
//   }
// });

// // --- ENDPOINT: Update Appointment ---
// router.put("/:id", async (req, res) => {
//   const { id } = req.params;
//   const fields = req.body;
//   const setClauses = [];
//   const values = [];

//   if (fields.timeStart) {
//     const parsed = parseTime(fields.timeStart);
//     if (parsed) { setClauses.push("appointment_datetime = ?"); values.push(parsed); }
//   }
//   if (fields.dentist_id) { setClauses.push("dentist_id = ?"); values.push(fields.dentist_id); }
//   if (fields.procedure || fields.services) {
//     const updatedProc = fields.services ? (Array.isArray(fields.services) ? fields.services.join(", ") : fields.services) : fields.procedure;
//     setClauses.push("reason = ?"); 
//     values.push(updatedProc);
//   }
//   if (fields.notes) { setClauses.push("notes = ?"); values.push(fields.notes); }
//   if (fields.status) { setClauses.push("status = ?"); values.push(fields.status); }

//   if (setClauses.length === 0) return res.status(400).json({ message: "No valid updates" });

//   try {
//     values.push(id);
//     await db.query(`UPDATE appointments SET ${setClauses.join(", ")} WHERE id = ?`, values);
//     const [rows] = await db.query("SELECT * FROM appointments WHERE id = ?", [id]);
//     res.json(rows[0]);
//   } catch (err) {
//     res.status(500).json({ message: "Update failed" });
//   }
// });

// // --- ENDPOINT: Delete Appointment ---
// router.delete("/:id", async (req, res) => {
//   try {
//     await db.query("DELETE FROM appointments WHERE id = ?", [req.params.id]);
//     res.json({ message: "Appointment deleted" });
//   } catch (err) {
//     res.status(500).json({ message: "Delete failed" });
//   }
// });

// module.exports = router;








// const express = require("express");
// const router = express.Router();
// const db = require("../db");

// /**
//  * Helper: Parses Date Strings into MySQL format.
//  * Handles 12-hour (AM/PM) and 24-hour formats.
//  */
// function parseTime(dateTimeStr) {
//   if (!dateTimeStr) return null;
//   let parts = dateTimeStr.match(/(\d{4})-(\d{2})-(\d{2}) (\d{1,2}):(\d{2}) (AM|PM)/);
//   if (parts) {
//     let [, year, month, day, hour, minute, meridiem] = parts;
//     let hourInt = parseInt(hour, 10);
//     if (meridiem === 'PM' && hourInt < 12) hourInt += 12;
//     if (meridiem === 'AM' && hourInt === 12) hourInt = 0;
//     return `${year}-${month}-${day} ${hourInt.toString().padStart(2, '0')}:${minute}:00`;
//   }
//   return dateTimeStr; 
// }

// // --- CHECK DAILY LIMIT ---
// router.get("/check-limit", async (req, res) => {
//   const { dentist_id, date } = req.query;
//   if (!dentist_id || !date) return res.status(400).json({ message: "Missing data" });

//   try {
//     const [countResult] = await db.query(
//       `SELECT COUNT(*) as count FROM appointments WHERE dentist_id = ? AND DATE(appointment_datetime) = ? AND status != 'Cancelled'`,
//       [dentist_id, date]
//     );
//     res.json({ count: countResult[0].count, limit: 5 });
//   } catch (err) {
//     res.status(500).json({ message: "Error checking limit" });
//   }
// });

// // --- GET ALL APPOINTMENTS ---
// router.get("/", async (req, res) => {
//   const { date } = req.query;
//   let query = `SELECT a.*, a.reason AS \`procedure\`, p.full_name FROM appointments a JOIN patients p ON a.patient_id = p.id`;
//   const params = [];
//   if (date) { query += " WHERE DATE(a.appointment_datetime) = ?"; params.push(date); }
//   query += " ORDER BY a.appointment_datetime ASC";

//   try {
//     const [rows] = await db.query(query, params);
//     res.json(rows);
//   } catch (err) {
//     res.status(500).json({ message: "Fetch failed" });
//   }
// });

// // --- ADD APPOINTMENT (The "Video Fix") ---
// router.post("/", async (req, res) => {
//   const { patient_id, dentist_id, timeStart, procedure, services, notes, status } = req.body;
//   const appointment_datetime = parseTime(timeStart);

//   if (!appointment_datetime) return res.status(400).json({ message: "Invalid time" });

//   // Merge "Regular Check-up" etc into one string for the database
//   let finalReason = procedure || "";
//   if (services && Array.isArray(services)) {
//     finalReason = services.join(", ");
//   } else if (services) {
//     finalReason = services;
//   }

//   try {
//     const [result] = await db.query(
//       `INSERT INTO appointments (patient_id, dentist_id, appointment_datetime, reason, notes, status)
//        VALUES (?, ?, ?, ?, ?, ?)`,
//       [patient_id, dentist_id, appointment_datetime, finalReason, notes || "", status || 'Scheduled']
//     );
    
//     // IMPORTANT: Return 'full_name' so React can close the modal and update the row
//     const [rows] = await db.query(
//         `SELECT a.*, a.reason AS \`procedure\`, p.full_name 
//          FROM appointments a 
//          JOIN patients p ON a.patient_id = p.id 
//          WHERE a.id = ?`,
//         [result.insertId]
//     );
//     res.status(201).json(rows[0]);
//   } catch (err) {
//     console.error("Save error:", err);
//     res.status(500).json({ message: "Database save failed" });
//   }
// });

// module.exports = router;

const express = require("express");
const router = express.Router();
const db = require("../db");

/**
 * Helper: Parses Date Strings into MySQL format.
 * Handles 12-hour (AM/PM) and 24-hour formats.
 */
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

// --- CHECK DAILY LIMIT ---
router.get("/check-limit", async (req, res) => {
  const { dentist_id, date } = req.query;
  if (!dentist_id || !date) return res.status(400).json({ message: "Missing data" });

  try {
    const [countResult] = await db.query(
      `SELECT COUNT(*) as count FROM appointments WHERE dentist_id = ? AND DATE(appointment_datetime) = ? AND status != 'Cancelled'`,
      [dentist_id, date]
    );
    res.json({ count: countResult[0].count, limit: 5 });
  } catch (err) {
    res.status(500).json({ message: "Error checking limit" });
  }
});

// --- GET ALL APPOINTMENTS ---
router.get("/", async (req, res) => {
  const { date } = req.query;
  let query = `SELECT a.*, a.reason AS \`procedure\`, p.full_name FROM appointments a JOIN patients p ON a.patient_id = p.id`;
  const params = [];
  if (date) { query += " WHERE DATE(a.appointment_datetime) = ?"; params.push(date); }
  query += " ORDER BY a.appointment_datetime ASC";

  try {
    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Fetch failed" });
  }
});

// --- ADD APPOINTMENT ---
router.post("/", async (req, res) => {
  const { patient_id, dentist_id, timeStart, procedure, services, notes, status } = req.body;
  const appointment_datetime = parseTime(timeStart);

  if (!appointment_datetime) return res.status(400).json({ message: "Invalid time format" });

  // Merge selected services into a string
  let finalReason = procedure || "";
  if (services && Array.isArray(services)) {
    finalReason = services.join(", ");
  } else if (services) {
    finalReason = services;
  }

  try {
    const [result] = await db.query(
      `INSERT INTO appointments (patient_id, dentist_id, appointment_datetime, reason, notes, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [patient_id, dentist_id, appointment_datetime, finalReason, notes || "", status || 'Scheduled']
    );
    
    // IMPORTANT: Return 'full_name' so React can close the modal and update the row
    const [rows] = await db.query(
        `SELECT a.*, a.reason AS \`procedure\`, p.full_name 
         FROM appointments a 
         JOIN patients p ON a.patient_id = p.id 
         WHERE a.id = ?`,
        [result.insertId]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("Save error:", err);
    res.status(500).json({ message: "Database save failed" });
  }
});

// --- UPDATE APPOINTMENT ---
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const fields = req.body;
  const setClauses = [];
  const values = [];

  if (fields.timeStart) {
    const parsed = parseTime(fields.timeStart);
    if (parsed) { setClauses.push("appointment_datetime = ?"); values.push(parsed); }
  }
  if (fields.dentist_id) { setClauses.push("dentist_id = ?"); values.push(fields.dentist_id); }
  if (fields.procedure || fields.services) {
    const updatedProc = fields.services ? (Array.isArray(fields.services) ? fields.services.join(", ") : fields.services) : fields.procedure;
    setClauses.push("reason = ?"); 
    values.push(updatedProc);
  }
  if (fields.notes) { setClauses.push("notes = ?"); values.push(fields.notes); }
  if (fields.status) { setClauses.push("status = ?"); values.push(fields.status); }

  if (setClauses.length === 0) return res.status(400).json({ message: "No valid updates" });

  try {
    values.push(id);
    await db.query(`UPDATE appointments SET ${setClauses.join(", ")} WHERE id = ?`, values);
    const [rows] = await db.query("SELECT * FROM appointments WHERE id = ?", [id]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: "Update failed" });
  }
});

// --- DELETE APPOINTMENT ---
router.delete("/:id", async (req, res) => {
  try {
    await db.query("DELETE FROM appointments WHERE id = ?", [req.params.id]);
    res.json({ message: "Appointment deleted" });
  } catch (err) {
    res.status(500).json({ message: "Delete failed" });
  }
});

module.exports = router;