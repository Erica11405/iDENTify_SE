const express = require('express');
const router = express.Router();
const db = require('../db'); 

// GET all clinic medications
router.get('/', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM clinic_medications ORDER BY name ASC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ADD a new clinic medication
router.post('/', async (req, res) => {
    const { name, default_dosage } = req.body;
    try {
        const [result] = await db.query(
            'INSERT INTO clinic_medications (name, default_dosage) VALUES (?, ?)', 
            [name, default_dosage]
        );
        res.status(201).json({ id: result.insertId, message: 'Medication added successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// UPDATE a clinic medication
router.put('/:id', async (req, res) => {
    const { name, default_dosage } = req.body;
    try {
        await db.query(
            'UPDATE clinic_medications SET name = ?, default_dosage = ? WHERE id = ?',
            [name, default_dosage, req.params.id]
        );
        res.json({ message: 'Medication updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE a clinic medication
router.delete('/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM clinic_medications WHERE id = ?', [req.params.id]);
        res.json({ message: 'Medication deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;