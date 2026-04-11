// // const express = require("express");
// // const router = express.Router();
// // const db = require("../db");

// // function parseTime(dateTimeStr) {
// //   if (!dateTimeStr) return null;
// //   let parts = dateTimeStr.match(/(\d{4})-(\d{2})-(\d{2}) (\d{1,2}):(\d{2}) (AM|PM)/);
// //   if (parts) {
// //     let [, year, month, day, hour, minute, meridiem] = parts;
// //     let hourInt = parseInt(hour, 10);
// //     if (meridiem === 'PM' && hourInt < 12) hourInt += 12;
// //     if (meridiem === 'AM' && hourInt === 12) hourInt = 0;
// //     return `${year}-${month}-${day} ${hourInt.toString().padStart(2, '0')}:${minute}:00`;
// //   }
// //   return dateTimeStr; 
// // }

// // // --- CHECK DAILY LIMIT ---
// // router.get("/check-limit", async (req, res) => {
// //   const { dentist_id, date } = req.query;
// //   if (!dentist_id || !date) return res.status(400).json({ message: "Missing data" });

// //   try {
// //     const [countResult] = await db.query(
// //       `SELECT COUNT(*) as count FROM appointments WHERE dentist_id = ? AND DATE(appointment_datetime) = ? AND status != 'Cancelled'`,
// //       [dentist_id, date]
// //     );
// //     res.json({ count: countResult[0].count, limit: 5 });
// //   } catch (err) {
// //     res.status(500).json({ message: "Error checking limit" });
// //   }
// // });

// // // --- GET ALL APPOINTMENTS ---
// // router.get("/", async (req, res) => {
// //   const { date } = req.query;
// //   let query = `SELECT a.*, a.reason AS \`procedure\`, p.full_name FROM appointments a JOIN patients p ON a.patient_id = p.id`;
// //   const params = [];
// //   if (date) { query += " WHERE DATE(a.appointment_datetime) = ?"; params.push(date); }
// //   query += " ORDER BY a.appointment_datetime ASC";

// //   try {
// //     const [rows] = await db.query(query, params);
// //     res.json(rows);
// //   } catch (err) {
// //     res.status(500).json({ message: "Fetch failed" });
// //   }
// // });

// // // --- GET SINGLE APPOINTMENT ---
// // router.get("/:id", async (req, res) => {
// //   try {
// //     const [rows] = await db.query(
// //       `SELECT a.*, a.reason AS \`procedure\`, p.full_name 
// //        FROM appointments a 
// //        JOIN patients p ON a.patient_id = p.id 
// //        WHERE a.id = ?`,
// //       [req.params.id]
// //     );
    
// //     if (rows.length === 0) {
// //       return res.status(404).json({ message: "Appointment not found" });
// //     }
// //     res.json(rows[0]);
// //   } catch (err) {
// //     console.error("Error fetching single appointment:", err);
// //     res.status(500).json({ message: "Fetch failed" });
// //   }
// // });

// // // --- ADD APPOINTMENT ---
// // router.post("/", async (req, res) => {
// //   const { patient_id, dentist_id, timeStart, procedure, services, notes, status } = req.body;
// //   const appointment_datetime = parseTime(timeStart);

// //   if (!appointment_datetime) return res.status(400).json({ message: "Invalid time format" });

// //   try {
// //     // --- OVERLAP CONFLICT CHECK ---
// //     // Check if the dentist already has a non-cancelled appointment at this exact time
// //     const [existingConflict] = await db.query(
// //       `SELECT id FROM appointments 
// //        WHERE dentist_id = ? 
// //        AND appointment_datetime = ? 
// //        AND status NOT IN ('Cancelled', 'Declined')`,
// //       [dentist_id, appointment_datetime]
// //     );

// //     if (existingConflict.length > 0) {
// //       return res.status(409).json({ message: "This time slot is already booked for this dentist. Please select another time." });
// //     }
// //     // -------------------------------

// //     // Merge selected services into a string
// //     let finalReason = procedure || "";
// //     if (services && Array.isArray(services)) {
// //       finalReason = services.join(", ");
// //     } else if (services) {
// //       finalReason = services;
// //     }

// //     const [result] = await db.query(
// //       `INSERT INTO appointments (patient_id, dentist_id, appointment_datetime, reason, notes, status)
// //        VALUES (?, ?, ?, ?, ?, ?)`,
// //       [patient_id, dentist_id, appointment_datetime, finalReason, notes || "", status || 'Scheduled']
// //     );
    
// //     // IMPORTANT: Return 'full_name' so React can close the modal and update the row
// //     const [rows] = await db.query(
// //         `SELECT a.*, a.reason AS \`procedure\`, p.full_name 
// //          FROM appointments a 
// //          JOIN patients p ON a.patient_id = p.id 
// //          WHERE a.id = ?`,
// //         [result.insertId]
// //     );
// //     res.status(201).json(rows[0]);
// //   } catch (err) {
// //     console.error("Save error:", err);
// //     res.status(500).json({ message: "Database save failed" });
// //   }
// // });

// // // --- UPDATE APPOINTMENT ---
// // router.put("/:id", async (req, res) => {
// //   const { id } = req.params;
// //   const fields = req.body;
// //   const setClauses = [];
// //   const values = [];

// //   try {
// //     // --- OVERLAP CONFLICT CHECK (For Updates) ---
// //     // Only perform the check if they are trying to change the time or the assigned dentist
// //     if (fields.timeStart || fields.dentist_id) {
// //         const [currentAppt] = await db.query(`SELECT dentist_id, appointment_datetime FROM appointments WHERE id = ?`, [id]);
        
// //         if (currentAppt.length > 0) {
// //             // Determine the final time and dentist we need to check against
// //             const checkTime = fields.timeStart ? parseTime(fields.timeStart) : currentAppt[0].appointment_datetime;
// //             const checkDentistId = fields.dentist_id ? fields.dentist_id : currentAppt[0].dentist_id;

// //             // Check for overlaps, ensuring we don't accidentally match the appointment we are currently editing (id != ?)
// //             const [existingConflict] = await db.query(
// //               `SELECT id FROM appointments 
// //                WHERE dentist_id = ? 
// //                AND appointment_datetime = ? 
// //                AND status NOT IN ('Cancelled', 'Declined') 
// //                AND id != ?`,
// //               [checkDentistId, checkTime, id]
// //             );

// //             if (existingConflict.length > 0) {
// //               return res.status(409).json({ message: "This time slot is already booked for this dentist. Please select another time." });
// //             }
// //         }
// //     }
// //     // -------------------------------

// //     if (fields.timeStart) {
// //       const parsed = parseTime(fields.timeStart);
// //       if (parsed) { setClauses.push("appointment_datetime = ?"); values.push(parsed); }
// //     }
// //     if (fields.dentist_id) { setClauses.push("dentist_id = ?"); values.push(fields.dentist_id); }
// //     if (fields.procedure || fields.services) {
// //       const updatedProc = fields.services ? (Array.isArray(fields.services) ? fields.services.join(", ") : fields.services) : fields.procedure;
// //       setClauses.push("reason = ?"); 
// //       values.push(updatedProc);
// //     }
// //     if (fields.notes) { setClauses.push("notes = ?"); values.push(fields.notes); }
// //     if (fields.status) { setClauses.push("status = ?"); values.push(fields.status); }

// //     if (setClauses.length === 0) return res.status(400).json({ message: "No valid updates provided." });

// //     values.push(id);
// //     await db.query(`UPDATE appointments SET ${setClauses.join(", ")} WHERE id = ?`, values);
// //     const [rows] = await db.query("SELECT * FROM appointments WHERE id = ?", [id]);
// //     res.json(rows[0]);
// //   } catch (err) {
// //     console.error("Update error:", err);
// //     res.status(500).json({ message: "Update failed" });
// //   }
// // });

// // // --- DELETE APPOINTMENT ---
// // router.delete("/:id", async (req, res) => {
// //   try {
// //     await db.query("DELETE FROM appointments WHERE id = ?", [req.params.id]);
// //     res.json({ message: "Appointment deleted" });
// //   } catch (err) {
// //     res.status(500).json({ message: "Delete failed" });
// //   }
// // });

// // module.exports = router;


// const express = require("express");
// const router = express.Router();
// const db = require("../db");

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

// // --- GET ALL APPOINTMENTS (UPDATED WITH PATIENT FILTER) ---
// router.get("/", async (req, res) => {
//   const { date, patient_id } = req.query; 
//   let query = `SELECT a.*, a.reason AS \`procedure\`, p.full_name FROM appointments a JOIN patients p ON a.patient_id = p.id`;
  
//   const params = [];
//   const whereClauses = [];

//   if (date) { 
//     whereClauses.push("DATE(a.appointment_datetime) = ?"); 
//     params.push(date); 
//   }
  
//   // Add the patient_id filter to strictly return only requested appointments
//   if (patient_id) { 
//     whereClauses.push("a.patient_id = ?"); 
//     params.push(patient_id); 
//   }

//   // Combine where clauses dynamically if any exist
//   if (whereClauses.length > 0) {
//     query += " WHERE " + whereClauses.join(" AND ");
//   }

//   query += " ORDER BY a.appointment_datetime ASC";

//   try {
//     const [rows] = await db.query(query, params);
//     res.json(rows);
//   } catch (err) {
//     res.status(500).json({ message: "Fetch failed" });
//   }
// });

// // --- GET SINGLE APPOINTMENT ---
// router.get("/:id", async (req, res) => {
//   try {
//     const [rows] = await db.query(
//       `SELECT a.*, a.reason AS \`procedure\`, p.full_name 
//        FROM appointments a 
//        JOIN patients p ON a.patient_id = p.id 
//        WHERE a.id = ?`,
//       [req.params.id]
//     );
    
//     if (rows.length === 0) {
//       return res.status(404).json({ message: "Appointment not found" });
//     }
//     res.json(rows[0]);
//   } catch (err) {
//     console.error("Error fetching single appointment:", err);
//     res.status(500).json({ message: "Fetch failed" });
//   }
// });

// // --- ADD APPOINTMENT ---
// router.post("/", async (req, res) => {
//   const { patient_id, dentist_id, timeStart, procedure, services, notes, status } = req.body;
//   const appointment_datetime = parseTime(timeStart);

//   if (!appointment_datetime) return res.status(400).json({ message: "Invalid time format" });

//   try {
//     // --- OVERLAP CONFLICT CHECK ---
//     const [existingConflict] = await db.query(
//       `SELECT id FROM appointments 
//        WHERE dentist_id = ? 
//        AND appointment_datetime = ? 
//        AND status NOT IN ('Cancelled', 'Declined')`,
//       [dentist_id, appointment_datetime]
//     );

//     if (existingConflict.length > 0) {
//       return res.status(409).json({ message: "This time slot is already booked for this dentist. Please select another time." });
//     }
//     // -------------------------------

//     // Merge selected services into a string
//     let finalReason = procedure || "";
//     if (services && Array.isArray(services)) {
//       finalReason = services.join(", ");
//     } else if (services) {
//       finalReason = services;
//     }

//     const [result] = await db.query(
//       `INSERT INTO appointments (patient_id, dentist_id, appointment_datetime, reason, notes, status)
//        VALUES (?, ?, ?, ?, ?, ?)`,
//       [patient_id, dentist_id, appointment_datetime, finalReason, notes || "", status || 'Scheduled']
//     );
    
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

// // --- UPDATE APPOINTMENT ---
// router.put("/:id", async (req, res) => {
//   const { id } = req.params;
//   const fields = req.body;
//   const setClauses = [];
//   const values = [];

//   try {
//     // --- OVERLAP CONFLICT CHECK (For Updates) ---
//     if (fields.timeStart || fields.dentist_id) {
//         const [currentAppt] = await db.query(`SELECT dentist_id, appointment_datetime FROM appointments WHERE id = ?`, [id]);
        
//         if (currentAppt.length > 0) {
//             const checkTime = fields.timeStart ? parseTime(fields.timeStart) : currentAppt[0].appointment_datetime;
//             const checkDentistId = fields.dentist_id ? fields.dentist_id : currentAppt[0].dentist_id;

//             const [existingConflict] = await db.query(
//               `SELECT id FROM appointments 
//                WHERE dentist_id = ? 
//                AND appointment_datetime = ? 
//                AND status NOT IN ('Cancelled', 'Declined') 
//                AND id != ?`,
//               [checkDentistId, checkTime, id]
//             );

//             if (existingConflict.length > 0) {
//               return res.status(409).json({ message: "This time slot is already booked for this dentist. Please select another time." });
//             }
//         }
//     }
//     // -------------------------------

//     if (fields.timeStart) {
//       const parsed = parseTime(fields.timeStart);
//       if (parsed) { setClauses.push("appointment_datetime = ?"); values.push(parsed); }
//     }
//     if (fields.dentist_id) { setClauses.push("dentist_id = ?"); values.push(fields.dentist_id); }
//     if (fields.procedure || fields.services) {
//       const updatedProc = fields.services ? (Array.isArray(fields.services) ? fields.services.join(", ") : fields.services) : fields.procedure;
//       setClauses.push("reason = ?"); 
//       values.push(updatedProc);
//     }
//     if (fields.notes) { setClauses.push("notes = ?"); values.push(fields.notes); }
//     if (fields.status) { setClauses.push("status = ?"); values.push(fields.status); }

//     if (setClauses.length === 0) return res.status(400).json({ message: "No valid updates provided." });

//     values.push(id);
//     await db.query(`UPDATE appointments SET ${setClauses.join(", ")} WHERE id = ?`, values);
//     const [rows] = await db.query("SELECT * FROM appointments WHERE id = ?", [id]);
//     res.json(rows[0]);
//   } catch (err) {
//     console.error("Update error:", err);
//     res.status(500).json({ message: "Update failed" });
//   }
// });

// // --- DELETE APPOINTMENT ---
// router.delete("/:id", async (req, res) => {
//   try {
//     await db.query("DELETE FROM appointments WHERE id = ?", [req.params.id]);
//     res.json({ message: "Appointment deleted" });
//   } catch (err) {
//     res.status(500).json({ message: "Delete failed" });
//   }
// });

// module.exports = router;


const express = require("express");
const router = express.Router();
const db = require("../db");

const DEFAULT_DURATION_MINUTES = 30;

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

function toPositiveInt(value) {
  const parsed = Number.parseInt(String(value || ""), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const normalized = String(value).replace(" ", "T");
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatSqlDateTime(value) {
  const date = toDate(value);
  if (!date) return null;

  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function addMinutes(sqlDateTime, minutes) {
  const date = toDate(sqlDateTime);
  if (!date) return null;

  const ms = Number(minutes || 0) * 60 * 1000;
  const next = new Date(date.getTime() + ms);
  return formatSqlDateTime(next);
}

function splitServiceNames(value) {
  return String(value || "")
    .split(",")
    .map((item) => String(item || "").trim())
    .filter(Boolean);
}

function buildReasonText(services, procedure) {
  if (Array.isArray(services) && services.length > 0) {
    return services.map((item) => String(item || "").trim()).filter(Boolean).join(", ");
  }

  if (typeof services === "string" && services.trim()) {
    return services.trim();
  }

  return String(procedure || "").trim();
}

function normalizeServiceList(services, procedure) {
  if (Array.isArray(services) && services.length > 0) {
    return services.map((item) => String(item || "").trim()).filter(Boolean);
  }

  if (typeof services === "string" && services.trim()) {
    return splitServiceNames(services);
  }

  return splitServiceNames(procedure);
}

async function resolveDurationMinutes({ services, procedure, durationHint }) {
  const hintedMinutes = toPositiveInt(durationHint);
  if (hintedMinutes) {
    return hintedMinutes;
  }

  const normalizedServices = normalizeServiceList(services, procedure);
  if (normalizedServices.length === 0) {
    return DEFAULT_DURATION_MINUTES;
  }

  const placeholders = normalizedServices.map(() => "?").join(",");
  const [rows] = await db.query(
    `SELECT name, estimated_duration FROM clinic_services WHERE name IN (${placeholders})`,
    normalizedServices
  );

  const durationMap = new Map(
    rows.map((row) => [String(row.name || "").trim().toLowerCase(), toPositiveInt(row.estimated_duration) || DEFAULT_DURATION_MINUTES])
  );

  return normalizedServices.reduce((total, serviceName) => {
    const key = String(serviceName || "").trim().toLowerCase();
    return total + (durationMap.get(key) || DEFAULT_DURATION_MINUTES);
  }, 0);
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
  const { date, patient_id } = req.query; 
  // ADDED: LEFT JOIN to fetch the dentist's name
  let query = `SELECT a.*, a.reason AS \`procedure\`, p.full_name, d.name AS dentist_name 
               FROM appointments a 
               JOIN patients p ON a.patient_id = p.id 
               LEFT JOIN dentists d ON a.dentist_id = d.id`;
  
  const params = [];
  const whereClauses = [];

  if (date) { 
    whereClauses.push("DATE(a.appointment_datetime) = ?"); 
    params.push(date); 
  }
  
  if (patient_id) { 
    whereClauses.push("a.patient_id = ?"); 
    params.push(patient_id); 
  }

  if (whereClauses.length > 0) {
    query += " WHERE " + whereClauses.join(" AND ");
  }

  query += " ORDER BY a.appointment_datetime ASC";

  try {
    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Fetch failed" });
  }
});

// --- GET SINGLE APPOINTMENT ---
router.get("/:id", async (req, res) => {
  try {
    // ADDED: LEFT JOIN to fetch the dentist's name
    const [rows] = await db.query(
      `SELECT a.*, a.reason AS \`procedure\`, p.full_name, d.name AS dentist_name 
       FROM appointments a 
       JOIN patients p ON a.patient_id = p.id 
       LEFT JOIN dentists d ON a.dentist_id = d.id
       WHERE a.id = ?`,
      [req.params.id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ message: "Appointment not found" });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error("Error fetching single appointment:", err);
    res.status(500).json({ message: "Fetch failed" });
  }
});

// --- ADD APPOINTMENT ---
router.post("/", async (req, res) => {
  const { patient_id, dentist_id, timeStart, procedure, services, notes, status, estimated_duration_minutes } = req.body;
  const appointment_datetime = parseTime(timeStart);

  if (!appointment_datetime) return res.status(400).json({ message: "Invalid time format" });

  try {
    const finalReason = buildReasonText(services, procedure);
    const durationMinutes = await resolveDurationMinutes({
      services,
      procedure: finalReason,
      durationHint: estimated_duration_minutes,
    });
    const endDateTime = addMinutes(appointment_datetime, durationMinutes);

    if (!endDateTime) {
      return res.status(400).json({ message: "Invalid computed end time." });
    }

    const [existingConflict] = await db.query(
      `SELECT id FROM appointments 
       WHERE dentist_id = ? 
       AND status NOT IN ('Cancelled', 'Declined')
       AND appointment_datetime < ?
       AND COALESCE(end_datetime, DATE_ADD(appointment_datetime, INTERVAL 30 MINUTE)) > ?`,
      [dentist_id, endDateTime, appointment_datetime]
    );

    if (existingConflict.length > 0) {
      return res.status(409).json({ message: "This time slot is already booked for this dentist. Please select another time." });
    }

    const [result] = await db.query(
      `INSERT INTO appointments (patient_id, dentist_id, appointment_datetime, end_datetime, reason, notes, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [patient_id, dentist_id, appointment_datetime, endDateTime, finalReason, notes || "", status || 'Scheduled']
    );
    
    const [rows] = await db.query(
      `SELECT a.*, a.reason AS \`procedure\`, p.full_name, d.name AS dentist_name  
         FROM appointments a 
         JOIN patients p ON a.patient_id = p.id 
         LEFT JOIN dentists d ON a.dentist_id = d.id
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

  try {
    const [currentRows] = await db.query(
      `SELECT id, dentist_id, appointment_datetime, reason, end_datetime FROM appointments WHERE id = ? LIMIT 1`,
      [id]
    );

    if (!currentRows.length) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    const currentAppt = currentRows[0];
    const nextDentistId = fields.dentist_id || currentAppt.dentist_id;

    const parsedStart = fields.timeStart ? parseTime(fields.timeStart) : null;
    if (fields.timeStart && !parsedStart) {
      return res.status(400).json({ message: "Invalid time format" });
    }

    const nextStart = parsedStart || formatSqlDateTime(currentAppt.appointment_datetime);

    const reasonSeed = Object.prototype.hasOwnProperty.call(fields, "procedure")
      ? fields.procedure
      : currentAppt.reason;
    const nextReason = buildReasonText(fields.services, reasonSeed);

    const durationMinutes = await resolveDurationMinutes({
      services: fields.services,
      procedure: nextReason,
      durationHint: fields.estimated_duration_minutes,
    });

    const nextEnd = addMinutes(nextStart, durationMinutes);
    if (!nextEnd) {
      return res.status(400).json({ message: "Invalid computed end time." });
    }

    if (fields.timeStart || fields.dentist_id || fields.procedure || fields.services) {
      const [existingConflict] = await db.query(
        `SELECT id FROM appointments 
         WHERE dentist_id = ? 
         AND status NOT IN ('Cancelled', 'Declined')
         AND appointment_datetime < ?
         AND COALESCE(end_datetime, DATE_ADD(appointment_datetime, INTERVAL 30 MINUTE)) > ?
         AND id != ?`,
        [nextDentistId, nextEnd, nextStart, id]
      );

      if (existingConflict.length > 0) {
        return res.status(409).json({ message: "This time slot is already booked for this dentist. Please select another time." });
      }
    }

    if (fields.timeStart) {
      setClauses.push("appointment_datetime = ?");
      values.push(nextStart);
    }
    if (fields.dentist_id) { setClauses.push("dentist_id = ?"); values.push(fields.dentist_id); }
    if (fields.procedure || fields.services) {
      setClauses.push("reason = ?"); 
      values.push(nextReason);
    }
    if (fields.timeStart || fields.procedure || fields.services) {
      setClauses.push("end_datetime = ?");
      values.push(nextEnd);
    }
    if (Object.prototype.hasOwnProperty.call(fields, "notes")) {
      setClauses.push("notes = ?");
      values.push(fields.notes || "");
    }
    if (Object.prototype.hasOwnProperty.call(fields, "status")) {
      setClauses.push("status = ?");
      values.push(fields.status);
    }

    if (setClauses.length === 0) return res.status(400).json({ message: "No valid updates provided." });

    values.push(id);
    await db.query(`UPDATE appointments SET ${setClauses.join(", ")} WHERE id = ?`, values);
    
    // ADDED: LEFT JOIN to return the updated dentist name instantly
    const [rows] = await db.query(
      `SELECT a.*, a.reason AS \`procedure\`, p.full_name, d.name AS dentist_name 
       FROM appointments a 
       JOIN patients p ON a.patient_id = p.id 
       LEFT JOIN dentists d ON a.dentist_id = d.id
       WHERE a.id = ?`, 
      [id]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error("Update error:", err);
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