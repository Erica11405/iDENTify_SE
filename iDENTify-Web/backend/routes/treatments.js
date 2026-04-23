const express = require("express");
const router = express.Router();
const db = require("../db");
const { getActorTenantScope, appendTenantWhereClauses, hasColumn } = require("../utils/accessControl");

router.get("/", async (req, res) => {
  try {
    const actorScope = await getActorTenantScope(req);
    const supportsClinic = await hasColumn('treatment_timeline', 'clinic_id');
    const supportsBranch = await hasColumn('treatment_timeline', 'branch_id');

    let query = `
      SELECT t.id, t.patient_id as patientId, t.start_time as date, 
             t.procedure_text as procedure, t.provider as dentist, t.notes
      FROM treatment_timeline t
    `;
    const params = [];
    const whereClauses = [];

    appendTenantWhereClauses({
      whereClauses,
      params,
      scope: actorScope,
      clinicExpression: supportsClinic ? "t.clinic_id" : null,
      branchExpression: supportsBranch ? "t.branch_id" : null,
    });

    if (whereClauses.length > 0) {
      query += ` WHERE ${whereClauses.join(" AND ")}`;
    }

    query += ` ORDER BY t.id DESC LIMIT 50`;

    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
