const express = require('express');
const router = express.Router();
const db = require('../db'); 
const { getActorTenantScope } = require('../utils/accessControl');

// GET all services (Isolated)
router.get('/', async (req, res) => {
    try {
        const { branch_id } = req.query;
        const scope = await getActorTenantScope(req);
        
        const bId = Number(branch_id);

        // Using a join to get branch associations. 
        let query = `
            SELECT 
                s.*, 
                GROUP_CONCAT(sb.branch_id) as branch_ids 
            FROM clinic_services s 
            LEFT JOIN clinic_service_branches sb ON s.id = sb.service_id
        `;
        let whereClauses = [];
        let params = [];

        if (scope.scoped && scope.clinicId) {
            whereClauses.push('s.clinic_id = ?');
            params.push(scope.clinicId);
        } else if (scope.scoped) {
             return res.json([]); // Scoped but no clinic ID? Return empty.
        }

        if (whereClauses.length > 0) {
            query += ` WHERE ${whereClauses.join(' AND ')}`;
        }

        query += ' GROUP BY s.id';
        
        // If branch_id is provided, we filter the results
        // We do this after grouping to ensure we have all branch_ids for each service
        if (bId) {
            query = `SELECT * FROM (${query}) grouped_services WHERE FIND_IN_SET(?, branch_ids)`;
            params.push(bId);
        }

        const [rows] = await db.query(query, params);
        
        const formatted = rows.map(r => ({
            ...r,
            branch_ids: r.branch_ids ? String(r.branch_ids).split(',').map(Number) : []
        }));

        res.json(formatted);
    } catch (err) {
        console.error("Error fetching services:", err);
        res.status(500).json({ error: err.message });
    }
});

// ADD a new service (Isolated)
router.post('/', async (req, res) => {
    const { name, minPrice, maxPrice, estimated_duration, branchIds } = req.body;
    try {
        const scope = await getActorTenantScope(req);
        if (!scope.clinicId) {
            return res.status(403).json({ error: "Clinic context required to add services." });
        }

        const [result] = await db.query(
            'INSERT INTO clinic_services (name, min_price, max_price, estimated_duration, clinic_id) VALUES (?, ?, ?, ?, ?)', 
            [name, minPrice, maxPrice, estimated_duration || 30, scope.clinicId]
        );
        const serviceId = result.insertId;

        if (branchIds && Array.isArray(branchIds) && branchIds.length > 0) {
            const values = branchIds.map(bid => [serviceId, bid]);
            await db.query('INSERT INTO clinic_service_branches (service_id, branch_id) VALUES ?', [values]);
        }

        res.status(201).json({ id: serviceId, message: 'Service added successfully' });
    } catch (err) {
        console.error("Database Insert Error on Services:", err);
        res.status(500).json({ error: err.message });
    }
});

// UPDATE an existing service
router.put('/:id', async (req, res) => {
    const { name, minPrice, maxPrice, estimated_duration, branchIds } = req.body;
    const serviceId = req.params.id;
    try {
        const scope = await getActorTenantScope(req);
        
        // Basic Update
        if (scope.scoped && scope.clinicId) {
            const [result] = await db.query(
                'UPDATE clinic_services SET name = ?, min_price = ?, max_price = ?, estimated_duration = ? WHERE id = ? AND clinic_id = ?',
                [name, minPrice, maxPrice, estimated_duration || 30, serviceId, scope.clinicId]
            );
            if (result.affectedRows === 0) return res.status(404).json({ error: "Service not found or unauthorized." });
        } else {
            await db.query(
                'UPDATE clinic_services SET name = ?, min_price = ?, max_price = ?, estimated_duration = ? WHERE id = ?',
                [name, minPrice, maxPrice, estimated_duration || 30, serviceId]
            );
        }

        // Branch Update: Clear and Re-insert
        // If the user is clinic-scoped, we should only clear associations for branches they own
        // But since clinic_service_branches links to clinic_branches which has clinic_id, and service also has clinic_id, it's generally safe.
        await db.query('DELETE FROM clinic_service_branches WHERE service_id = ?', [serviceId]);
        
        if (branchIds && Array.isArray(branchIds) && branchIds.length > 0) {
            const values = branchIds.map(bid => [serviceId, bid]);
            await db.query('INSERT INTO clinic_service_branches (service_id, branch_id) VALUES ?', [values]);
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