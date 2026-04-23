const db = require('../db');

/**
 * Creates an in-app notification for a patient
 * @param {number} patientId 
 * @param {string} title 
 * @param {string} message 
 * @param {string} type - 'rescheduled', 'declined', 'reminder', 'general'
 */
async function createNotification(patientId, title, message, type = 'general') {
  if (!patientId) return;
  try {
    await db.query(
      'INSERT INTO notifications (patient_id, title, message, type) VALUES (?, ?, ?, ?)',
      [patientId, title, message, type]
    );
  } catch (error) {
    console.error('Failed to create notification:', error);
  }
}

module.exports = { createNotification };
