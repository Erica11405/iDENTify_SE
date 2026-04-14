// const express = require("express");
// const router = express.Router();
// const db = require("../db");

// router.get("/:patient_id", async (req, res) => {
//   const { patient_id } = req.params;
//   const { year } = req.query;

//   let query = "SELECT * FROM medications WHERE patient_id = ?";
//   let params = [patient_id];

//   if (year) {
//       query += " AND record_year = ?";
//       params.push(year);
//   }

//   const [rows] = await db.query(query, params);
//   res.json(rows);
// });

// router.post("/", async (req, res) => {
//   const { patient_id, medicine, dosage, frequency, notes, record_year } = req.body;
//   const [result] = await db.query(
//     `INSERT INTO medications (patient_id, medicine, dosage, frequency, notes, record_year)
//      VALUES (?, ?, ?, ?, ?, ?)`,
//     [patient_id, medicine, dosage, frequency, notes, record_year || 1]
//   );
//   const [rows] = await db.query("SELECT * FROM medications WHERE id = ?", [result.insertId]);
//   res.status(201).json(rows[0]);
// });

// router.delete("/:id", async (req, res) => {
//   const { id } = req.params;
//   await db.query("DELETE FROM medications WHERE id = ?", [id]);
//   res.json({ message: "Medication deleted" });
// });

// module.exports = router;


const express = require("express");
const router = express.Router();
const db = require("../db");
const missingTreatmentIdColumnMessage = "Database schema is missing medications.treatment_id. Apply the latest backend SQL migration.";

// NEW ROUTE: Fetch medications by specific treatment session
router.get("/record/:treatment_id", async (req, res) => {
  const treatmentId = Number.parseInt(String(req.params.treatment_id || ""), 10);
  if (!Number.isFinite(treatmentId) || treatmentId <= 0) {
    return res.status(400).json({ error: "Invalid treatment_id." });
  }

  try {
    const [rows] = await db.query("SELECT * FROM medications WHERE treatment_id = ? ORDER BY id DESC", [treatmentId]);
    res.json(rows);
  } catch (err) {
    if (err && err.code === "ER_BAD_FIELD_ERROR") {
      return res.status(500).json({ error: missingTreatmentIdColumnMessage });
    }
    res.status(500).json({ error: err.message });
  }
});

router.get("/:patient_id", async (req, res) => {
  try {
    const { patient_id } = req.params;
    const year = req.query.year || req.query.record_year;

    let query = "SELECT * FROM medications WHERE patient_id = ?";
    const params = [patient_id];

    if (year) {
      query += " AND record_year = ?";
      params.push(year);
    }

    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const { patient_id, treatment_id, medicine, dosage, frequency, notes, record_year } = req.body;
    if (!patient_id || !medicine) {
      return res.status(400).json({ error: "patient_id and medicine are required." });
    }

    const parsedTreatmentId = Number.parseInt(String(treatment_id || ""), 10);
    const safeTreatmentId = Number.isFinite(parsedTreatmentId) && parsedTreatmentId > 0 ? parsedTreatmentId : null;

    const [result] = await db.query(
      `INSERT INTO medications (patient_id, treatment_id, medicine, dosage, frequency, notes, record_year)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [patient_id, safeTreatmentId, medicine, dosage, frequency, notes, record_year || 1]
    );
    const [rows] = await db.query("SELECT * FROM medications WHERE id = ?", [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err && err.code === "ER_BAD_FIELD_ERROR") {
      return res.status(500).json({ error: missingTreatmentIdColumnMessage });
    }
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db.query("DELETE FROM medications WHERE id = ?", [id]);
    res.json({ message: "Medication deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;