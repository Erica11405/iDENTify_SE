const express = require('express');
const router = express.Router();
const db = require('../db'); 

// GET all services
router.get('/', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM clinic_services');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ADD a new service
router.post('/', async (req, res) => {
    const { name, minPrice, maxPrice } = req.body;
    try {
        const [result] = await db.query(
            'INSERT INTO clinic_services (name, min_price, max_price) VALUES (?, ?, ?)', 
            [name, minPrice, maxPrice]
        );
        res.status(201).json({ id: result.insertId, message: 'Service added successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE a service
router.delete('/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM clinic_services WHERE id = ?', [req.params.id]);
        res.json({ message: 'Service deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;