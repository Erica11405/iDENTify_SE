const express = require("express");
const router = express.Router();
const db = require("../db");

router.get("/", async (req, res) => {
  try {
    // Return recent treatments from the timeline
    const [rows] = await db.query(`
      SELECT t.id, t.patient_id as patientId, t.start_time as date, 
             t.procedure_text as procedure, t.provider as dentist, t.notes
      FROM treatment_timeline t
      ORDER BY t.id DESC
      LIMIT 50
    `);
    
    // Map date format if necessary, assuming start_time stores "HH:MM" or full date string
    // This connects the "Treatments" concept to actual data
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;