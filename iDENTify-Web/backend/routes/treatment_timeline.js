// const express = require("express");
// const router = express.Router();
// const db = require("../db");

// router.get("/:patientId", async (req, res) => {
//   const { patientId } = req.params;
//   const { year } = req.query;

//   try {
//     let query = "SELECT * FROM treatment_timeline WHERE patient_id = ?";
//     let params = [patientId];

//     if (year) {
//         query += " AND record_year = ?";
//         params.push(year);
//     }
    
//     query += " ORDER BY id DESC";

//     const [rows] = await db.query(query, params);
//     res.json(rows);
//   } catch (error) {
//     console.error("Error fetching timeline:", error);
//     res.status(500).json({ message: "Server error" });
//   }
// });

// router.post("/", async (req, res) => {
//   const { patient_id, start_time, end_time, provider, procedure_text, notes, image_url, price, record_year } = req.body;
  
//   try {
//     const [result] = await db.query(
//       `INSERT INTO treatment_timeline (patient_id, start_time, end_time, provider, procedure_text, notes, image_url, price, record_year)
//        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
//       [patient_id, start_time, end_time, provider, procedure_text, notes, image_url, price || 0.00, record_year || 1]
//     );
//     const [rows] = await db.query("SELECT * FROM treatment_timeline WHERE id = ?", [result.insertId]);
//     res.status(201).json(rows[0]);
//   } catch (error) {
//     console.error("Error adding timeline entry:", error);
//     res.status(500).json({ message: "Server error" });
//   }
// });

// router.delete("/:id", async (req, res) => {
//   const { id } = req.params;
//   try {
//     await db.query("DELETE FROM treatment_timeline WHERE id = ?", [id]);
//     res.json({ message: "Entry deleted" });
//   } catch (error) {
//     console.error("Error deleting timeline entry:", error);
//     res.status(500).json({ message: "Server error" });
//   }
// });

// module.exports = router;


const express = require("express");
const router = express.Router();
const db = require("../db");

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

// ADDED: Single record fetch endpoint for the mobile app details page
// Note: This must come BEFORE the "/:patientId" route so it doesn't get confused
router.get("/record/:id", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM treatment_timeline WHERE id = ?", [req.params.id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ message: "Record not found" });
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

// Existing route: Fetch all records for a patient
router.get("/:patientId", async (req, res) => {
  const { patientId } = req.params;
  const year = req.query.year || req.query.record_year;

  try {
    let query = "SELECT * FROM treatment_timeline WHERE patient_id = ?";
    let params = [patientId];

    if (year) {
        query += " AND record_year = ?";
        params.push(year);
    }
    
    query += " ORDER BY id DESC";

    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error("Error fetching timeline:", error);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/", async (req, res) => {
  const { patient_id, start_time, end_time, provider, procedure_text, notes, image_url, price, record_year } = req.body;
  
  try {
    const [result] = await db.query(
      `INSERT INTO treatment_timeline (patient_id, start_time, end_time, provider, procedure_text, notes, image_url, price, record_year)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [patient_id, start_time, end_time, provider, procedure_text, notes, image_url, price || 0.00, record_year || 1]
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