const express = require('express');
const router = express.Router();
const db = require('../db');

const DEFAULT_DENTIST_TYPES = [
    'General Dentist',
    'Orthodontist',
    'Periodontist',
    'Oral Surgeon',
    'Pediatric Dentist',
    'Endodontist',
];

let tableEnsured = false;

function normalizeTypeName(value) {
    return String(value || '').trim();
}

async function ensureDentistTypesTable() {
    if (tableEnsured) {
        return;
    }

    await db.query(`
        CREATE TABLE IF NOT EXISTS dentist_types (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL UNIQUE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    if (DEFAULT_DENTIST_TYPES.length > 0) {
        const placeholders = DEFAULT_DENTIST_TYPES.map(() => '(?)').join(', ');
        await db.query(
            `INSERT IGNORE INTO dentist_types (name) VALUES ${placeholders}`,
            DEFAULT_DENTIST_TYPES
        );
    }

    tableEnsured = true;
}

// GET all dentist types
router.get('/', async (_req, res) => {
    try {
        await ensureDentistTypesTable();
        const [rows] = await db.query('SELECT id, name FROM dentist_types ORDER BY name ASC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ADD a dentist type
router.post('/', async (req, res) => {
    const name = normalizeTypeName(req.body?.name);

    if (!name) {
        return res.status(400).json({ error: 'Dentist type name is required.' });
    }

    try {
        await ensureDentistTypesTable();
        const [result] = await db.query(
            'INSERT INTO dentist_types (name) VALUES (?)',
            [name]
        );

        res.status(201).json({
            id: result.insertId,
            name,
            message: 'Dentist type added successfully',
        });
    } catch (err) {
        if (err?.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'Dentist type already exists.' });
        }
        res.status(500).json({ error: err.message });
    }
});

// UPDATE a dentist type
router.put('/:id', async (req, res) => {
    const typeId = Number(req.params.id);
    const name = normalizeTypeName(req.body?.name);

    if (!Number.isFinite(typeId) || typeId <= 0) {
        return res.status(400).json({ error: 'Invalid dentist type id.' });
    }

    if (!name) {
        return res.status(400).json({ error: 'Dentist type name is required.' });
    }

    try {
        await ensureDentistTypesTable();
        const [result] = await db.query(
            'UPDATE dentist_types SET name = ? WHERE id = ?',
            [name, typeId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Dentist type not found.' });
        }

        res.json({
            id: typeId,
            name,
            message: 'Dentist type updated successfully',
        });
    } catch (err) {
        if (err?.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'Dentist type already exists.' });
        }
        res.status(500).json({ error: err.message });
    }
});

// DELETE a dentist type
router.delete('/:id', async (req, res) => {
    const typeId = Number(req.params.id);

    if (!Number.isFinite(typeId) || typeId <= 0) {
        return res.status(400).json({ error: 'Invalid dentist type id.' });
    }

    try {
        await ensureDentistTypesTable();
        const [result] = await db.query('DELETE FROM dentist_types WHERE id = ?', [typeId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Dentist type not found.' });
        }

        res.json({ message: 'Dentist type deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
