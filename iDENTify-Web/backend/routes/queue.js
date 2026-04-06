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
       WHERE q.status != 'Cancelled'
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
      sql += ` WHERE DATE(q.time_added) = ? `;
      params.push(phToday);
    }

    sql += ` ORDER BY FIELD(q.status, 'On Chair', 'Treatment', 'Checked-In', 'Waiting', 'Payment / Billing', 'Done', 'Cancelled'), time_added ASC`;
    
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

  // Use frontend local time, fallback to generated PH time, or final fallback to JS Date
  const insertTime = time_added || checkedInTime || getPhDateTime();

  try {
    const [result] = await db.query(
      `INSERT INTO walk_in_queue (patient_id, dentist_id, appointment_id, source, status, notes, time_added)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [patient_id, dentist_id, appointment_id, source, status, notes, insertTime]
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

  try {
    await db.query(
      `UPDATE walk_in_queue SET status = ? WHERE id = ?`,
      [status, id]
    );

    const [qItem] = await db.query("SELECT appointment_id FROM walk_in_queue WHERE id = ?", [id]);
    
    if (qItem.length > 0 && qItem[0].appointment_id) {
       await db.query(
         `UPDATE appointments SET status = ? WHERE id = ?`,
         [status, qItem[0].appointment_id]
       );
       console.log(`[Sync] Updated Linked Appointment ${qItem[0].appointment_id} to status: ${status}`);
    }

    res.json({ message: "Queue item updated and synchronized", id, status });
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