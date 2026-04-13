// const express = require("express");
// const router = express.Router();
// const db = require("../db");

// router.get("/status", async (req, res) => {
//   const { patient_id } = req.query;

//   if (!patient_id) {
//     return res.status(400).json({ message: "patient_id is required" });
//   }

//   try {
//     const [allRows] = await db.query(
//       `SELECT q.*, p.full_name, d.name as dentist_name 
//        FROM walk_in_queue q
//        LEFT JOIN patients p ON q.patient_id = p.id
//        LEFT JOIN dentists d ON q.dentist_id = d.id
//        WHERE q.status != 'Cancelled'
//        AND DATE(q.time_added) = CURDATE() 
//        ORDER BY q.time_added ASC`
//     );

//     const myIndex = allRows.findIndex(row => String(row.patient_id) === String(patient_id));
//     const myStatusRow = myIndex !== -1 ? allRows[myIndex] : null;
//     const myNumber = myIndex !== -1 ? myIndex + 1 : null; 

//     let servingRow = allRows.find(row => 
//       ['On Chair', 'Serving', 'Treatment'].includes(row.status)
//     );

//     if (!servingRow) {
//       servingRow = allRows.find(row => row.status !== 'Done');
//     }

//     let servingNumber = null;
//     if (servingRow) {
//       const servingIndex = allRows.findIndex(row => row.id === servingRow.id);
//       servingNumber = servingIndex + 1;
//     }

//     res.json({
//       myStatus: myStatusRow,
//       myNumber: myNumber,           
//       nowServing: servingRow,
//       servingNumber: servingNumber, 
//       estimatedWaitTime: "10-20 mins",
//     });

//   } catch (error) {
//     console.error("Error fetching queue status:", error);
//     res.status(500).json({ message: "Database error fetching queue status" });
//   }
// });

// // FIXED: Added history parameter support to fetch all records
// router.get("/", async (req, res) => {
//   const { history } = req.query;
//   try {
//     let sql = `
//        SELECT q.*, p.full_name, d.name as dentist_name 
//        FROM walk_in_queue q
//        LEFT JOIN patients p ON q.patient_id = p.id
//        LEFT JOIN dentists d ON q.dentist_id = d.id
//     `;
    
//     // Only filter by current date if NOT in history mode
//     if (history !== 'true') {
//       sql += ` WHERE DATE(q.time_added) = CURDATE() `;
//     }

//     sql += ` ORDER BY FIELD(q.status, 'On Chair', 'Treatment', 'Checked-In', 'Waiting', 'Payment / Billing', 'Done', 'Cancelled'), time_added ASC`;
    
//     const [rows] = await db.query(sql);
//     res.json(rows);
//   } catch (err) {
//     console.error("Error fetching dashboard queue:", err);
//     res.status(500).json({ message: "Database error" });
//   }
// });

// router.post("/", async (req, res) => {
//   const { patient_id, dentist_id, appointment_id, source, status, notes, checkedInTime } = req.body;

//   try {
//     const [result] = await db.query(
//       `INSERT INTO walk_in_queue (patient_id, dentist_id, appointment_id, source, status, notes, time_added)
//        VALUES (?, ?, ?, ?, ?, ?, ?)`,
//       [patient_id, dentist_id, appointment_id, source, status, notes, checkedInTime || new Date()]
//     );

//     const [rows] = await db.query(
//       `SELECT q.*, p.full_name, d.name as dentist_name
//        FROM walk_in_queue q
//        LEFT JOIN patients p ON q.patient_id = p.id
//        LEFT JOIN dentists d ON q.dentist_id = d.id
//        WHERE q.id = ?`,
//       [result.insertId]
//     );

//     res.status(201).json(rows[0]);
//   } catch (error) {
//     console.error("Error adding to queue:", error);
//     res.status(500).json({ message: "Database error adding to queue" });
//   }
// });

// router.put("/:id", async (req, res) => {
//   const { id } = req.params;
//   const { status } = req.body;

//   try {
//     await db.query(
//       `UPDATE walk_in_queue SET status = ? WHERE id = ?`,
//       [status, id]
//     );

//     const [qItem] = await db.query("SELECT appointment_id FROM walk_in_queue WHERE id = ?", [id]);
    
//     if (qItem.length > 0 && qItem[0].appointment_id) {
//        await db.query(
//          `UPDATE appointments SET status = ? WHERE id = ?`,
//          [status, qItem[0].appointment_id]
//        );
//        console.log(`[Sync] Updated Linked Appointment ${qItem[0].appointment_id} to status: ${status}`);
//     }

//     res.json({ message: "Queue item updated and synchronized", id, status });
//   } catch (err) {
//     console.error("Error updating queue:", err);
//     res.status(500).json({ message: "Failed to update queue" });
//   }
// });

// router.delete("/:id", async (req, res) => {
//   const { id } = req.params;
//   try {
//     await db.query("DELETE FROM walk_in_queue WHERE id = ?", [id]);
//     res.json({ message: "Queue item deleted" });
//   } catch (err) {
//     res.status(500).json({ message: "Failed to delete queue item" });
//   }
// });

// module.exports = router;


const express = require("express");
const router = express.Router();
const db = require("../db");

// --- TIMEZONE HELPERS FOR PHILIPPINES (Asia/Manila) ---
function getPhDateOnly() {
  // Returns YYYY-MM-DD accurately for Philippine Time
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
}

function getPhDateTime() {
  // Returns YYYY-MM-DD HH:MM:SS accurately for Philippine Time
  const phTimeStr = new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" });
  const d = new Date(phTimeStr);
  const pad = (n) => (n < 10 ? '0' + n : n);
  return d.getFullYear() + '-' +
         pad(d.getMonth() + 1) + '-' +
         pad(d.getDate()) + ' ' +
         pad(d.getHours()) + ':' +
         pad(d.getMinutes()) + ':' +
         pad(d.getSeconds());
}

function toPositiveInt(value) {
  const parsed = Number.parseInt(String(value || ""), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

const QUEUE_STATUS_MAP = {
  "waiting": "Waiting",
  "checked in": "Checked-In",
  "checked-in": "Checked-In",
  "checkedin": "Checked-In",
  "on chair": "On Chair",
  "on-chair": "On Chair",
  "treatment": "Treatment",
  "serving": "Treatment",
  "payment / billing": "Payment / Billing",
  "payment/billing": "Payment / Billing",
  "payment": "Payment / Billing",
  "billing": "Payment / Billing",
  "scheduled": "Scheduled",
  "done": "Done",
  "cancelled": "Cancelled",
  "no-show": "No-Show",
  "no show": "No-Show",
  "noshow": "No-Show",
};

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

router.get("/status", async (req, res) => {
  const { patient_id } = req.query;

  if (!patient_id) {
    return res.status(400).json({ message: "patient_id is required" });
  }

  try {
    const phToday = getPhDateOnly(); // Overrides database UTC timezone
    const [allRows] = await db.query(
      `SELECT q.*, p.full_name, d.name as dentist_name 
       FROM walk_in_queue q
       LEFT JOIN patients p ON q.patient_id = p.id
       LEFT JOIN dentists d ON q.dentist_id = d.id
       WHERE q.status NOT IN ('Done', 'Cancelled', 'No-Show')
       AND DATE(q.time_added) = ? 
       ORDER BY q.time_added ASC`,
       [phToday]
    );

    const myIndex = allRows.findIndex(row => String(row.patient_id) === String(patient_id));
    const myStatusRow = myIndex !== -1 ? allRows[myIndex] : null;
    const myNumber = myIndex !== -1 ? myIndex + 1 : null; 

    let servingRow = allRows.find(row => 
      ['On Chair', 'Serving', 'Treatment'].includes(row.status)
    );

    if (!servingRow) {
      servingRow = allRows.find(row => row.status !== 'Done');
    }

    let servingNumber = null;
    if (servingRow) {
      const servingIndex = allRows.findIndex(row => row.id === servingRow.id);
      servingNumber = servingIndex + 1;
    }

    res.json({
      myStatus: myStatusRow,
      myNumber: myNumber,           
      nowServing: servingRow,
      servingNumber: servingNumber, 
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
    let sql = `
       SELECT q.*, p.full_name, d.name as dentist_name 
       FROM walk_in_queue q
       LEFT JOIN patients p ON q.patient_id = p.id
       LEFT JOIN dentists d ON q.dentist_id = d.id
    `;
    
    const params = [];

    // Only filter by current date if NOT in history mode
    if (history !== 'true') {
      const phToday = getPhDateOnly();
      sql += ` WHERE DATE(q.time_added) = ? AND q.status NOT IN ('Done', 'Cancelled', 'No-Show') `;
      params.push(phToday);
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
  // Capture 'time_added' sent from the frontend
  const { patient_id, dentist_id, appointment_id, source, status, notes, checkedInTime, time_added } = req.body;
  const patientId = toPositiveInt(patient_id);
  const dentistId = toPositiveInt(dentist_id);
  const appointmentId = toPositiveInt(appointment_id);
  const normalizedStatus = normalizeQueueStatus(status, "Checked-In");

  if (!patientId) {
    return res.status(400).json({ message: "patient_id is required." });
  }

  // Use frontend local time, fallback to generated PH time, or final fallback to JS Date
  const insertTime = normalizeQueueDateTime(time_added || checkedInTime) || getPhDateTime();
  const queueSource = String(source || (appointmentId ? "appointment" : "walk-in")).trim() || null;
  const queueNotes = String(notes || "").trim();

  try {
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

    const [result] = await db.query(
      `INSERT INTO walk_in_queue (patient_id, dentist_id, appointment_id, source, status, notes, time_added)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [patientId, dentistId, appointmentId, queueSource, normalizedStatus, queueNotes, insertTime]
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
    await db.query(
      `UPDATE walk_in_queue SET status = ? WHERE id = ?`,
      [normalizedStatus, queueId]
    );

    const [qItem] = await db.query("SELECT appointment_id FROM walk_in_queue WHERE id = ?", [queueId]);
    
    if (qItem.length > 0 && qItem[0].appointment_id) {
       await db.query(
         `UPDATE appointments SET status = ? WHERE id = ?`,
         [normalizedStatus, qItem[0].appointment_id]
       );
       console.log(`[Sync] Updated Linked Appointment ${qItem[0].appointment_id} to status: ${normalizedStatus}`);
    }

    res.json({ message: "Queue item updated and synchronized", id: queueId, status: normalizedStatus });
  } catch (err) {
    console.error("Error updating queue:", err);
    res.status(500).json({ message: "Failed to update queue" });
  }
});

router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await db.query("DELETE FROM walk_in_queue WHERE id = ?", [id]);
    res.json({ message: "Queue item deleted" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete queue item" });
  }
});

module.exports = router;