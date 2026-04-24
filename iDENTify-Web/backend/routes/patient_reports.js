const express = require('express');
const router = express.Router();
const db = require('../db');

// Initialize table and alter dentists table if necessary
async function initPatientReports() {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS patient_reports (
                id INT AUTO_INCREMENT PRIMARY KEY,
                patient_id INT NOT NULL,
                dentist_id INT NOT NULL,
                branch_id INT,
                reason TEXT NOT NULL,
                status ENUM('pending', 'reviewed', 'valid', 'dismissed') DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Check if is_suspended exists in dentists table, if not add it
        const [columns] = await db.query("SHOW COLUMNS FROM dentists LIKE 'is_suspended'");
        if (columns.length === 0) {
            await db.query("ALTER TABLE dentists ADD COLUMN is_suspended TINYINT(1) DEFAULT 0, ADD COLUMN suspended_at DATETIME NULL");
        }
    } catch (err) {
        console.error("Failed to initialize patient_reports table:", err);
    }
}
initPatientReports();

// 1. Submit a report (From the App)
router.post('/', async (req, res) => {
    const { patient_id, dentist_id, branch_id, reason } = req.body;
    
    if (!patient_id || !dentist_id || !reason) {
        return res.status(400).json({ error: 'Patient ID, Dentist ID, and Reason are required.' });
    }

    try {
        const [result] = await db.query(
            `INSERT INTO patient_reports (patient_id, dentist_id, branch_id, reason) VALUES (?, ?, ?, ?)`,
            [patient_id, dentist_id, branch_id || null, reason]
        );
        res.status(201).json({ id: result.insertId, message: 'Report submitted successfully.' });
    } catch (err) {
        console.error("Error submitting report:", err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// 2. Get all reports (For Clinic Admin)
router.get('/', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT 
                pr.id, pr.reason, pr.status, pr.created_at,
                p.full_name AS patient_name, p.full_name AS patient_full_name,
                d.id AS dentist_id, d.name AS dentist_name, d.is_suspended,
                cb.name AS branch_name
            FROM patient_reports pr
            LEFT JOIN patients p ON pr.patient_id = p.id
            LEFT JOIN dentists d ON pr.dentist_id = d.id
            LEFT JOIN clinic_branches cb ON pr.branch_id = cb.id
            ORDER BY pr.created_at DESC
        `);
        res.json(rows);
    } catch (err) {
        console.error("Error fetching reports:", err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// 3. Update Report Status
router.put('/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!['pending', 'reviewed', 'valid', 'dismissed'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }

    try {
        await db.query(`UPDATE patient_reports SET status = ? WHERE id = ?`, [status, id]);
        res.json({ message: 'Status updated' });
    } catch (err) {
        console.error("Error updating report status:", err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// 4. Suspend/Unsuspend Dentist
router.put('/dentist-suspend/:dentist_id', async (req, res) => {
    const { dentist_id } = req.params;
    const { suspend } = req.body; // boolean

    try {
        if (suspend) {
            await db.query(`UPDATE dentists SET is_suspended = 1, suspended_at = NOW() WHERE id = ?`, [dentist_id]);
            res.json({ message: 'Dentist suspended successfully' });
        } else {
            await db.query(`UPDATE dentists SET is_suspended = 0, suspended_at = NULL WHERE id = ?`, [dentist_id]);
            res.json({ message: 'Dentist unsuspended successfully' });
        }
    } catch (err) {
        console.error("Error suspending dentist:", err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;