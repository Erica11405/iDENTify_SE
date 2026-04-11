const express = require('express');
const router = express.Router();
const db = require('../db'); 

async function hasDefaultFrequencyColumn() {
    const [rows] = await db.query("SHOW COLUMNS FROM clinic_medications LIKE 'default_frequency'");
    return rows.length > 0;
}

function normalizeOptionalText(value) {
    const text = String(value || '').trim();
    return text.length > 0 ? text : null;
}

// GET all clinic medications
router.get('/', async (req, res) => {
    try {
        const includeFrequency = await hasDefaultFrequencyColumn();
        const query = includeFrequency
            ? 'SELECT id, name, default_dosage, default_frequency FROM clinic_medications ORDER BY name ASC'
            : "SELECT id, name, default_dosage, '' AS default_frequency FROM clinic_medications ORDER BY name ASC";

        const [rows] = await db.query(query);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ADD a new clinic medication
router.post('/', async (req, res) => {
    const name = normalizeOptionalText(req.body?.name);
    const defaultDosage = normalizeOptionalText(req.body?.default_dosage);
    const defaultFrequency = normalizeOptionalText(req.body?.default_frequency);

    if (!name) {
        return res.status(400).json({ error: 'Medication name is required.' });
    }

    try {
        const includeFrequency = await hasDefaultFrequencyColumn();
        const [result] = includeFrequency
            ? await db.query(
                'INSERT INTO clinic_medications (name, default_dosage, default_frequency) VALUES (?, ?, ?)',
                [name, defaultDosage, defaultFrequency]
            )
            : await db.query(
                'INSERT INTO clinic_medications (name, default_dosage) VALUES (?, ?)', 
                [name, defaultDosage]
            );

        res.status(201).json({
            id: result.insertId,
            name,
            default_dosage: defaultDosage,
            default_frequency: defaultFrequency,
            message: 'Medication added successfully',
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// UPDATE a clinic medication
router.put('/:id', async (req, res) => {
    const medicationId = Number(req.params.id);
    const name = normalizeOptionalText(req.body?.name);
    const defaultDosage = normalizeOptionalText(req.body?.default_dosage);
    const defaultFrequency = normalizeOptionalText(req.body?.default_frequency);

    if (!Number.isFinite(medicationId) || medicationId <= 0) {
        return res.status(400).json({ error: 'Invalid medication id.' });
    }

    if (!name) {
        return res.status(400).json({ error: 'Medication name is required.' });
    }

    try {
        const includeFrequency = await hasDefaultFrequencyColumn();
        if (includeFrequency) {
            await db.query(
                'UPDATE clinic_medications SET name = ?, default_dosage = ?, default_frequency = ? WHERE id = ?',
                [name, defaultDosage, defaultFrequency, medicationId]
            );
        } else {
            await db.query(
                'UPDATE clinic_medications SET name = ?, default_dosage = ? WHERE id = ?',
                [name, defaultDosage, medicationId]
            );
        }

        res.json({
            id: medicationId,
            name,
            default_dosage: defaultDosage,
            default_frequency: defaultFrequency,
            message: 'Medication updated successfully',
        });
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