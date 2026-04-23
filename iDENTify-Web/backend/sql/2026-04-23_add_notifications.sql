-- iDENTify-Web migration: In-App Notifications
-- Date: 2026-04-23

SET @db_name = DATABASE();

DROP PROCEDURE IF EXISTS CreateNotificationsTable;
DELIMITER //
CREATE PROCEDURE CreateNotificationsTable()
BEGIN
    IF NOT EXISTS (SELECT * FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'notifications') THEN
        CREATE TABLE `notifications` (
          `id` INT AUTO_INCREMENT PRIMARY KEY,
          `patient_id` INT NOT NULL,
          `title` VARCHAR(255) NOT NULL,
          `message` TEXT NOT NULL,
          `type` ENUM('rescheduled', 'declined', 'reminder', 'general') DEFAULT 'general',
          `is_read` TINYINT(1) DEFAULT 0,
          `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
          INDEX idx_notifications_patient_read (patient_id, is_read)
        );
    END IF;
END //
DELIMITER ;

CALL CreateNotificationsTable();
DROP PROCEDURE CreateNotificationsTable;
