const express = require('express');
const router = express.Router();
const db = require('../db');

// Get notifications for a patient
router.get('/:patientId', async (req, res) => {
  const { patientId } = req.params;
  try {
    const [rows] = await db.query(
      'SELECT * FROM notifications WHERE patient_id = ? ORDER BY created_at DESC LIMIT 50',
      [patientId]
    );
    res.json(rows);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Error fetching notifications' });
  }
});

// Mark notification as read
router.patch('/:id/read', async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('UPDATE notifications SET is_read = 1 WHERE id = ?', [id]);
    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Error updating notification:', error);
    res.status(500).json({ message: 'Error updating notification' });
  }
});

// Mark all as read
router.patch('/read-all/:patientId', async (req, res) => {
  const { patientId } = req.params;
  try {
    await db.query('UPDATE notifications SET is_read = 1 WHERE patient_id = ?', [patientId]);
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error updating notifications:', error);
    res.status(500).json({ message: 'Error updating notifications' });
  }
});

module.exports = router;
