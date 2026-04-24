const express = require('express');
const router = express.Router();
const db = require('../db'); 
const { getActorTenantScope } = require('../utils/accessControl');

// GET all services (Isolated)
router.get('/', async (req, res) => {
    try {
        const scope = await getActorTenantScope(req);
        let query = 'SELECT * FROM clinic_services';
        let params = [];

        if (scope.scoped && scope.clinicId) {
            query += ' WHERE clinic_id = ?';
            params.push(scope.clinicId);
        } else if (scope.scoped) {
             return res.json([]); // Scoped but no clinic ID? Return empty.
        }

        const [rows] = await db.query(query, params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ADD a new service (Isolated)
router.post('/', async (req, res) => {
    const { name, minPrice, maxPrice, estimated_duration } = req.body;
    try {
        const scope = await getActorTenantScope(req);
        if (!scope.clinicId) {
            return res.status(403).json({ error: "Clinic context required to add services." });
        }

        const [result] = await db.query(
            'INSERT INTO clinic_services (name, min_price, max_price, estimated_duration, clinic_id) VALUES (?, ?, ?, ?, ?)', 
            [name, minPrice, maxPrice, estimated_duration || 30, scope.clinicId]
        );
        res.status(201).json({ id: result.insertId, message: 'Service added successfully' });
    } catch (err) {
        console.error("Database Insert Error on Services:", err);
        res.status(500).json({ error: err.message });
    }
});

// UPDATE an existing service
router.put('/:id', async (req, res) => {
    const { name, minPrice, maxPrice, estimated_duration } = req.body;
    try {
        const scope = await getActorTenantScope(req);
        if (scope.scoped && scope.clinicId) {
            const [result] = await db.query(
                'UPDATE clinic_services SET name = ?, min_price = ?, max_price = ?, estimated_duration = ? WHERE id = ? AND clinic_id = ?',
                [name, minPrice, maxPrice, estimated_duration || 30, req.params.id, scope.clinicId]
            );
            if (result.affectedRows === 0) return res.status(404).json({ error: "Service not found or unauthorized." });
        } else {
            await db.query(
                'UPDATE clinic_services SET name = ?, min_price = ?, max_price = ?, estimated_duration = ? WHERE id = ?',
                [name, minPrice, maxPrice, estimated_duration || 30, req.params.id]
            );
        }
        res.json({ message: 'Service updated successfully' });
    } catch (err) {
        console.error("Database Update Error on Services:", err);
        res.status(500).json({ error: err.message });
    }
});

// DELETE a service
router.delete('/:id', async (req, res) => {
    try {
        const scope = await getActorTenantScope(req);
        if (scope.scoped && scope.clinicId) {
            const [result] = await db.query('DELETE FROM clinic_services WHERE id = ? AND clinic_id = ?', [req.params.id, scope.clinicId]);
            if (result.affectedRows === 0) return res.status(404).json({ error: "Service not found or unauthorized." });
        } else {
            await db.query('DELETE FROM clinic_services WHERE id = ?', [req.params.id]);
        }
        res.json({ message: 'Service deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;