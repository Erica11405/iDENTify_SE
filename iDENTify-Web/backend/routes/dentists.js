const express = require('express');
const router = express.Router();
const db = require('../db'); 

// GET ALL DENTISTS
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM dentists');
    const formattedDentists = rows.map(d => ({
      ...d,
      days: typeof d.schedule_days === 'string' ? JSON.parse(d.schedule_days) : (d.schedule_days || []),
      operatingHours: typeof d.operating_hours === 'string' ? JSON.parse(d.operating_hours) : (d.operating_hours || { start: '09:00', end: '17:00' }),
      lunch: typeof d.lunch === 'string' ? JSON.parse(d.lunch) : (d.lunch || { start: '', end: '' }),
      breaks: typeof d.breaks === 'string' ? JSON.parse(d.breaks) : (d.breaks || []),
      leaveDays: typeof d.leave_days === 'string' ? JSON.parse(d.leave_days) : (d.leave_days || []),
      name: d.name || `${d.first_name} ${d.last_name}`
    }));
    res.json(formattedDentists);
  } catch (err) {
    console.error("Error fetching dentists:", err);
    res.status(500).json({ error: err.message });
  }
});

// ADD NEW DENTIST
router.post('/', async (req, res) => {
  const { first_name, last_name, specialization, phone, email, days, operatingHours, lunch, breaks, leaveDays, status } = req.body;
  try {
    const sql = `INSERT INTO dentists (first_name, last_name, specialization, phone, email, schedule_days, operating_hours, lunch, breaks, leave_days, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const values = [first_name, last_name, specialization, phone, email, JSON.stringify(days || []), JSON.stringify(operatingHours || {}), JSON.stringify(lunch || {}), JSON.stringify(breaks || []), JSON.stringify(leaveDays || []), status || 'Available'];
    const [result] = await db.query(sql, values);
    res.status(201).json({ id: result.insertId, message: 'Dentist added successfully' });
  } catch (err) {
    console.error("Error adding dentist:", err);
    res.status(500).json({ error: err.message });
  }
});

// UPDATE DENTIST
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { first_name, last_name, specialization, phone, email, days, operatingHours, lunch, breaks, leaveDays, status } = req.body;
  try {
    const fullName = `${first_name} ${last_name}`;
    const sql = `UPDATE dentists SET first_name = ?, last_name = ?, name = ?, specialization = ?, phone = ?, email = ?, schedule_days = ?, operating_hours = ?, lunch = ?, breaks = ?, leave_days = ?, status = ? WHERE id = ?`;
    const values = [first_name, last_name, fullName, specialization, phone, email, JSON.stringify(days || []), JSON.stringify(operatingHours || {}), JSON.stringify(lunch || {}), JSON.stringify(breaks || []), JSON.stringify(leaveDays || []), status || 'Available', id];
    const [result] = await db.query(sql, values);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Dentist not found' });
    res.json({ message: 'Dentist updated successfully' });
  } catch (err) {
    console.error("Error updating dentist:", err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE DENTIST (NEW)
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await db.query('DELETE FROM dentists WHERE id = ?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Dentist not found' });
    res.json({ message: 'Dentist deleted successfully' });
  } catch (err) {
    console.error("Error deleting dentist:", err);
    res.status(500).json({ error: "Cannot delete dentist with active appointments or records." });
  }
});

module.exports = router;