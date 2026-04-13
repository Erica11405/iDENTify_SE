// const express = require("express");
// const router = express.Router();
// const db = require("../db");


// router.get("/", async (req, res) => {
//   try {
//     const { date } = req.query;
//     // Default to today if no date is provided
//     const reportDate = date || new Date().toISOString().split('T')[0];

//     // 1. Daily Summary Queries
    
//     // A. Patients Seen (Unique patients with appointments marked 'Done' on the selected date)
//     const [patientsSeenRes] = await db.query(
//       `SELECT COUNT(DISTINCT patient_id) as count 
//        FROM appointments 
//        WHERE DATE(appointment_datetime) = ? AND status = 'Done'`,
//       [reportDate]
//     );

//     // B. Procedures Done (Total 'Done' appointments)
//     const [proceduresRes] = await db.query(
//       `SELECT COUNT(*) as count 
//        FROM appointments 
//        WHERE DATE(appointment_datetime) = ? AND status = 'Done'`,
//       [reportDate]
//     );

//     // C. New Patients (Patients registered on the selected date)
//     let newPatients = 0;
//     try {
//         const [newPatientsRes] = await db.query(
//             `SELECT COUNT(*) as count FROM patients WHERE DATE(created_at) = ?`,
//             [reportDate]
//         );
//         newPatients = newPatientsRes[0].count;
//     } catch (e) {
//         console.warn("Could not query new patients (missing created_at?)", e);
//     }

//     // D. Average Treatment Duration (Difference between start and end time for Done appts)
//     const [durationRes] = await db.query(
//       `SELECT AVG(TIMESTAMPDIFF(MINUTE, appointment_datetime, end_datetime)) as avg_min 
//        FROM appointments 
//        WHERE DATE(appointment_datetime) = ? AND status = 'Done' AND end_datetime IS NOT NULL`,
//       [reportDate]
//     );

//     // 2. Dentist Performance
//     const [dentistPerformance] = await db.query(`
//       SELECT
//         d.id,
//         d.name,
//         COUNT(a.id) AS patientsHandled,
//         COALESCE(AVG(TIMESTAMPDIFF(MINUTE, a.appointment_datetime, a.end_datetime)), 0) as avgTimePerPatient
//       FROM dentists d
//       LEFT JOIN appointments a ON d.id = a.dentist_id 
//            AND DATE(a.appointment_datetime) = ? 
//            AND a.status = 'Done'
//       GROUP BY d.id, d.name
//     `, [reportDate]);

//     // 3. Treatment Distribution
//     const [distributionRes] = await db.query(`
//       SELECT
//         dentist_id,
//         reason as treatment,
//         COUNT(id) as count
//       FROM appointments
//       WHERE DATE(appointment_datetime) = ? AND status = 'Done' AND dentist_id IS NOT NULL
//       GROUP BY dentist_id, reason
//     `, [reportDate]);
    
//     const distributionMap = distributionRes.reduce((acc, row) => {
//         if (!acc[row.dentist_id]) {
//             acc[row.dentist_id] = {};
//         }
//         const treatmentName = row.treatment || 'Unspecified';
//         acc[row.dentist_id][treatmentName] = row.count;
//         return acc;
//     }, {});

//     dentistPerformance.forEach(dentist => {
//         dentist.treatmentDistribution = distributionMap[dentist.id] || {};
//     });

//     res.json({
//       date: reportDate,
//       dailySummary: {
//         patientsSeen: patientsSeenRes[0].count || 0,
//         proceduresDone: proceduresRes[0].count || 0,
//         newPatients: newPatients,
//         avgTreatmentDuration: durationRes[0].avg_min ? `${Math.round(durationRes[0].avg_min)} min` : "0 min",
//       },
//       dentistPerformance,
//     });

//   } catch (err) {
//     console.error("Reports API Error:", err);
//     res.status(500).json({ message: "Failed to load reports" });
//   }
// });


// // Get detailed list of patients for a specific dentist on a specific date
// router.get("/dentist/:id/patients", async (req, res) => {
//   const { id } = req.params;
//   const { date } = req.query;
//   // Default to today if no date is provided
//   const reportDate = date || new Date().toISOString().split('T')[0];

//   try {
//     const query = `
//       SELECT 
//         p.full_name, 
//         a.appointment_datetime,
//         a.reason
//       FROM patients p
//       JOIN appointments a ON p.id = a.patient_id
//       WHERE a.dentist_id = ? 
//       AND DATE(a.appointment_datetime) = ?
//       AND a.status = 'Done'
//       ORDER BY a.appointment_datetime ASC
//     `;
//     const [rows] = await db.query(query, [id, reportDate]);
//     res.json({ patients: rows });
//   } catch (error) {
//     console.error("Error fetching dentist patient details:", error);
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// });

// module.exports = router;

const express = require("express");
const router = express.Router();
const db = require("../db");

router.get("/", async (req, res) => {
  try {
    const { startDate, endDate, date } = req.query;
    // Default to today if no dates are provided (supports legacy 'date' param too)
    const start = startDate || date || new Date().toISOString().split('T')[0];
    const end = endDate || start;

    // 1. Daily/Range Summary Queries
    
    // A. Patients Seen (Unique patients handled in range, including walk-ins)
    const [patientsSeenRes] = await db.query(
      `SELECT COUNT(DISTINCT handled.patient_id) AS count
       FROM (
         SELECT a.patient_id
         FROM appointments a
         WHERE DATE(a.appointment_datetime) BETWEEN ? AND ?
           AND a.status IN ('Done', 'Completed')
         UNION ALL
         SELECT q.patient_id
         FROM walk_in_queue q
         WHERE DATE(q.time_added) BETWEEN ? AND ?
           AND q.source = 'walk-in'
           AND q.status IN ('Done', 'Completed')
       ) handled`,
      [start, end, start, end]
    );

    // B. Procedures Done (Appointments + walk-ins completed in range)
    const [proceduresRes] = await db.query(
      `SELECT (
         SELECT COUNT(*)
         FROM appointments a
         WHERE DATE(a.appointment_datetime) BETWEEN ? AND ?
           AND a.status IN ('Done', 'Completed')
       ) + (
         SELECT COUNT(*)
         FROM walk_in_queue q
         WHERE DATE(q.time_added) BETWEEN ? AND ?
           AND q.source = 'walk-in'
           AND q.status IN ('Done', 'Completed')
       ) AS count`,
      [start, end, start, end]
    );

    // C. New Patients (Patients registered in range)
    let newPatients = 0;
    try {
        const [newPatientsRes] = await db.query(
            `SELECT COUNT(*) as count FROM patients WHERE DATE(created_at) BETWEEN ? AND ?`,
            [start, end]
        );
        newPatients = newPatientsRes[0].count;
    } catch (e) {
        console.warn("Could not query new patients (missing created_at?)", e);
    }

    // D. Average Treatment Duration 
    const [durationRes] = await db.query(
      `SELECT AVG(TIMESTAMPDIFF(MINUTE, appointment_datetime, end_datetime)) as avg_min 
       FROM appointments 
       WHERE DATE(appointment_datetime) BETWEEN ? AND ? AND status IN ('Done', 'Completed') AND end_datetime IS NOT NULL`,
      [start, end]
    );

    // 2. Dentist Performance
    const [dentistPerformance] = await db.query(`
      SELECT
        d.id,
        d.name,
        COUNT(h.record_id) AS patientsHandled,
        COALESCE(AVG(h.duration_minutes), 0) AS avgTimePerPatient
      FROM dentists d
      LEFT JOIN (
        SELECT
          CAST(a.id AS CHAR) AS record_id,
          a.dentist_id,
          TIMESTAMPDIFF(MINUTE, a.appointment_datetime, a.end_datetime) AS duration_minutes
        FROM appointments a
        WHERE DATE(a.appointment_datetime) BETWEEN ? AND ?
          AND a.status IN ('Done', 'Completed')

        UNION ALL

        SELECT
          CONCAT('walkin-', q.id) AS record_id,
          q.dentist_id,
          NULL AS duration_minutes
        FROM walk_in_queue q
        WHERE DATE(q.time_added) BETWEEN ? AND ?
          AND q.source = 'walk-in'
          AND q.status IN ('Done', 'Completed')
      ) h ON d.id = h.dentist_id
      GROUP BY d.id, d.name
    `, [start, end, start, end]);

    // 3. Treatment Distribution
    const [distributionRes] = await db.query(`
      SELECT
        distribution.dentist_id,
        distribution.treatment,
        SUM(distribution.entry_count) AS count
      FROM (
        SELECT
          a.dentist_id,
          COALESCE(NULLIF(TRIM(a.reason), ''), 'Unspecified') AS treatment,
          COUNT(a.id) AS entry_count
        FROM appointments a
        WHERE DATE(a.appointment_datetime) BETWEEN ? AND ?
          AND a.status IN ('Done', 'Completed')
          AND a.dentist_id IS NOT NULL
        GROUP BY a.dentist_id, COALESCE(NULLIF(TRIM(a.reason), ''), 'Unspecified')

        UNION ALL

        SELECT
          q.dentist_id,
          COALESCE(NULLIF(TRIM(q.notes), ''), 'Walk-in') AS treatment,
          COUNT(q.id) AS entry_count
        FROM walk_in_queue q
        WHERE DATE(q.time_added) BETWEEN ? AND ?
          AND q.source = 'walk-in'
          AND q.status IN ('Done', 'Completed')
          AND q.dentist_id IS NOT NULL
        GROUP BY q.dentist_id, COALESCE(NULLIF(TRIM(q.notes), ''), 'Walk-in')
      ) distribution
      GROUP BY distribution.dentist_id, distribution.treatment
    `, [start, end, start, end]);
    
    const distributionMap = distributionRes.reduce((acc, row) => {
        if (!acc[row.dentist_id]) {
            acc[row.dentist_id] = {};
        }
        const treatmentName = row.treatment || 'Unspecified';
        acc[row.dentist_id][treatmentName] = row.count;
        return acc;
    }, {});

    dentistPerformance.forEach(dentist => {
        dentist.treatmentDistribution = distributionMap[dentist.id] || {};
    });

    res.json({
      startDate: start,
      endDate: end,
      dailySummary: {
        patientsSeen: patientsSeenRes[0].count || 0,
        proceduresDone: proceduresRes[0].count || 0,
        newPatients: newPatients,
        avgTreatmentDuration: durationRes[0].avg_min ? `${Math.round(durationRes[0].avg_min)} min` : "0 min",
      },
      dentistPerformance,
    });

  } catch (err) {
    console.error("Reports API Error:", err);
    res.status(500).json({ message: "Failed to load reports" });
  }
});

// Dentist-only analytics summary for a date range
router.get("/dentist/:id/summary", async (req, res) => {
  const dentistId = Number(req.params.id);
  if (!Number.isFinite(dentistId) || dentistId <= 0) {
    return res.status(400).json({ error: "Invalid dentist id." });
  }

  const { startDate, endDate, date } = req.query;
  const start = startDate || date || new Date().toISOString().split('T')[0];
  const end = endDate || start;

  try {
    const [dentistRows] = await db.query(
      `SELECT id, name FROM dentists WHERE id = ? LIMIT 1`,
      [dentistId]
    );

    if (!dentistRows.length) {
      return res.status(404).json({ error: "Dentist not found." });
    }

    const [summaryRows] = await db.query(
      `SELECT
         COUNT(DISTINCT handled.patient_id) AS patientsHandled,
         COUNT(*) AS proceduresDone,
         AVG(handled.duration_minutes) AS avgTreatmentMinutes
       FROM (
         SELECT
           a.patient_id,
           TIMESTAMPDIFF(MINUTE, a.appointment_datetime, a.end_datetime) AS duration_minutes
         FROM appointments a
         WHERE a.dentist_id = ?
           AND DATE(a.appointment_datetime) BETWEEN ? AND ?
           AND a.status IN ('Done', 'Completed')

         UNION ALL

         SELECT
           q.patient_id,
           NULL AS duration_minutes
         FROM walk_in_queue q
         WHERE q.dentist_id = ?
           AND DATE(q.time_added) BETWEEN ? AND ?
           AND q.source = 'walk-in'
           AND q.status IN ('Done', 'Completed')
       ) handled`,
      [dentistId, start, end, dentistId, start, end]
    );

    const [distributionRows] = await db.query(
      `SELECT
         distribution.service,
         SUM(distribution.entry_count) AS count
       FROM (
         SELECT
           COALESCE(NULLIF(TRIM(a.reason), ''), 'Unspecified') AS service,
           COUNT(*) AS entry_count
         FROM appointments a
         WHERE a.dentist_id = ?
           AND DATE(a.appointment_datetime) BETWEEN ? AND ?
           AND a.status IN ('Done', 'Completed')
         GROUP BY COALESCE(NULLIF(TRIM(a.reason), ''), 'Unspecified')

         UNION ALL

         SELECT
           COALESCE(NULLIF(TRIM(q.notes), ''), 'Walk-in') AS service,
           COUNT(*) AS entry_count
         FROM walk_in_queue q
         WHERE q.dentist_id = ?
           AND DATE(q.time_added) BETWEEN ? AND ?
           AND q.source = 'walk-in'
           AND q.status IN ('Done', 'Completed')
         GROUP BY COALESCE(NULLIF(TRIM(q.notes), ''), 'Walk-in')
       ) distribution
       GROUP BY distribution.service
       ORDER BY count DESC, service ASC`,
      [dentistId, start, end, dentistId, start, end]
    );

    const summary = summaryRows[0] || {};
    const avgMinutes = Number(summary.avgTreatmentMinutes || 0);

    res.json({
      dentist: dentistRows[0],
      startDate: start,
      endDate: end,
      summary: {
        patientsHandled: Number(summary.patientsHandled || 0),
        proceduresDone: Number(summary.proceduresDone || 0),
        avgTreatmentMinutes: avgMinutes,
        avgTreatmentDuration: avgMinutes > 0 ? `${Math.round(avgMinutes)} min` : "0 min",
      },
      serviceDistribution: distributionRows.map((row) => ({
        service: row.service,
        count: Number(row.count || 0),
      })),
    });
  } catch (error) {
    console.error("Error fetching dentist summary report:", error);
    res.status(500).json({ error: "Failed to load dentist summary report." });
  }
});

// Get detailed list of patients for a specific dentist on a specific date range
router.get("/dentist/:id/patients", async (req, res) => {
  const { id } = req.params;
  const { startDate, endDate, date } = req.query;
  const start = startDate || date || new Date().toISOString().split('T')[0];
  const end = endDate || start;

  try {
    const query = `
      SELECT
        history.appointment_id,
        history.patient_id,
        history.full_name,
        history.appointment_datetime,
        history.end_datetime,
        history.reason,
        history.status
      FROM (
        SELECT
          CAST(a.id AS CHAR) AS appointment_id,
          p.id AS patient_id,
          p.full_name,
          a.appointment_datetime,
          a.end_datetime,
          a.reason,
          a.status
        FROM patients p
        JOIN appointments a ON p.id = a.patient_id
        WHERE a.dentist_id = ?
          AND DATE(a.appointment_datetime) BETWEEN ? AND ?
          AND a.status IN ('Done', 'Completed')

        UNION ALL

        SELECT
          CONCAT('walkin-', q.id) AS appointment_id,
          p.id AS patient_id,
          p.full_name,
          q.time_added AS appointment_datetime,
          NULL AS end_datetime,
          COALESCE(NULLIF(TRIM(q.notes), ''), 'Walk-in') AS reason,
          q.status
        FROM patients p
        JOIN walk_in_queue q ON p.id = q.patient_id
        WHERE q.dentist_id = ?
          AND DATE(q.time_added) BETWEEN ? AND ?
          AND q.source = 'walk-in'
          AND q.status IN ('Done', 'Completed')
      ) history
      ORDER BY history.appointment_datetime ASC
    `;
    const [rows] = await db.query(query, [id, start, end, id, start, end]);
    res.json({ patients: rows });
  } catch (error) {
    console.error("Error fetching dentist patient details:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;