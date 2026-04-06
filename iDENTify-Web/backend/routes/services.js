// // const express = require('express');
// // const router = express.Router();
// // const db = require('../db'); 

// // // GET all services
// // router.get('/', async (req, res) => {
// //     try {
// //         const [rows] = await db.query('SELECT * FROM clinic_services');
// //         res.json(rows);
// //     } catch (err) {
// //         res.status(500).json({ error: err.message });
// //     }
// // });

// // // ADD a new service
// // router.post('/', async (req, res) => {
// //     const { name, minPrice, maxPrice, estimated_duration } = req.body;
// //     try {
// //         const [result] = await db.query(
// //             // Make sure the estimated_duration column exists in your clinic_services table
// //             'INSERT INTO clinic_services (name, min_price, max_price, estimated_duration) VALUES (?, ?, ?, ?)', 
// //             [name, minPrice, maxPrice, estimated_duration]
// //         );
// //         res.status(201).json({ id: result.insertId, message: 'Service added successfully' });
// //     } catch (err) {
// //         res.status(500).json({ error: err.message });
// //     }
// // });

// // // DELETE a service
// // router.delete('/:id', async (req, res) => {
// //     try {
// //         await db.query('DELETE FROM clinic_services WHERE id = ?', [req.params.id]);
// //         res.json({ message: 'Service deleted successfully' });
// //     } catch (err) {
// //         res.status(500).json({ error: err.message });
// //     }
// // });

// // module.exports = router;


// const express = require('express');
// const router = express.Router();
// const db = require('../db'); 

// // GET all services
// router.get('/', async (req, res) => {
//     try {
//         const [rows] = await db.query('SELECT * FROM clinic_services');
//         res.json(rows);
//     } catch (err) {
//         res.status(500).json({ error: err.message });
//     }
// });

// // ADD a new service
// router.post('/', async (req, res) => {
//     const { name, minPrice, maxPrice, estimated_duration } = req.body;
//     try {
//         const [result] = await db.query(
//             'INSERT INTO clinic_services (name, min_price, max_price, estimated_duration) VALUES (?, ?, ?, ?)', 
//             [name, minPrice, maxPrice, estimated_duration]
//         );
//         res.status(201).json({ id: result.insertId, message: 'Service added successfully' });
//     } catch (err) {
//         res.status(500).json({ error: err.message });
//     }
// });

// // UPDATE an existing service
// router.put('/:id', async (req, res) => {
//     const { name, minPrice, maxPrice, estimated_duration } = req.body;
//     try {
//         await db.query(
//             'UPDATE clinic_services SET name = ?, min_price = ?, max_price = ?, estimated_duration = ? WHERE id = ?',
//             [name, minPrice, maxPrice, estimated_duration, req.params.id]
//         );
//         res.json({ message: 'Service updated successfully' });
//     } catch (err) {
//         res.status(500).json({ error: err.message });
//     }
// });

// // DELETE a service
// router.delete('/:id', async (req, res) => {
//     try {
//         await db.query('DELETE FROM clinic_services WHERE id = ?', [req.params.id]);
//         res.json({ message: 'Service deleted successfully' });
//     } catch (err) {
//         res.status(500).json({ error: err.message });
//     }
// });

// module.exports = router;

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
    const { name, minPrice, maxPrice, estimated_duration } = req.body;
    try {
        const [result] = await db.query(
            'INSERT INTO clinic_services (name, min_price, max_price, estimated_duration) VALUES (?, ?, ?, ?)', 
            // Fallback to 30 just in case the frontend sends a blank value
            [name, minPrice, maxPrice, estimated_duration || 30]
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
        await db.query(
            'UPDATE clinic_services SET name = ?, min_price = ?, max_price = ?, estimated_duration = ? WHERE id = ?',
            [name, minPrice, maxPrice, estimated_duration || 30, req.params.id]
        );
        res.json({ message: 'Service updated successfully' });
    } catch (err) {
        console.error("Database Update Error on Services:", err);
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