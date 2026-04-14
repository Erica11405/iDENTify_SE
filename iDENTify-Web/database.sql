CREATE DATABASE IF NOT EXISTS `identify_app`;

USE `identify_app`;

-- DENTISTS TABLE
CREATE TABLE IF NOT EXISTS `dentists` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `specialty` VARCHAR(255),
  `status` VARCHAR(50) DEFAULT 'Available',
  `schedule` JSON
);

CREATE TABLE IF NOT EXISTS `dentist_types` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL UNIQUE,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT IGNORE INTO `dentist_types` (`name`) VALUES
('General Dentist'),
('Orthodontist'),
('Periodontist'),
('Oral Surgeon'),
('Pediatric Dentist'),
('Endodontist');

-- PATIENTS TABLE
-- Stores global immutable data (Demographics, Medical Alerts)
CREATE TABLE IF NOT EXISTS `patients` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `first_name` VARCHAR(100),
  `last_name` VARCHAR(100),
  `middle_name` VARCHAR(100),
  `full_name` VARCHAR(255) NOT NULL,
  `birthdate` DATE,
  `gender` VARCHAR(50),
  `address` TEXT,
  `contact_number` VARCHAR(50),
  `email` VARCHAR(255),
  `medical_alerts` TEXT, -- Allergies usually persist, so keeping them global
  `parent_id` INT,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`parent_id`) REFERENCES `patients`(`id`) ON DELETE SET NULL
);

-- PATIENT ANNUAL RECORDS TABLE
-- Stores year-specific data (Vitals, Dental History, X-rays, Status)
CREATE TABLE IF NOT EXISTS `patient_annual_records` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `patient_id` INT NOT NULL,
  `record_year` INT NOT NULL DEFAULT 1,
  `dental_history` TEXT,
  `vitals` JSON,
  `xrays` LONGTEXT,
  `status` VARCHAR(50) DEFAULT 'Active', -- 'Active' or 'Done'
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `unique_year_record` (`patient_id`, `record_year`)
);

-- APPOINTMENTS TABLE
CREATE TABLE IF NOT EXISTS `appointments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `patient_id` INT,
  `dentist_id` INT,
  `appointment_datetime` DATETIME,
  `end_datetime` DATETIME,
  `reason` TEXT,
  `notes` TEXT,
  `status` VARCHAR(50),
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`dentist_id`) REFERENCES `dentists`(`id`) ON DELETE SET NULL
);

-- QUEUE TABLE
CREATE TABLE IF NOT EXISTS `walk_in_queue` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `patient_id` INT,
  `appointment_id` INT NULL,
  `dentist_id` INT NULL,
  `source` VARCHAR(50),
  `status` VARCHAR(50),
  `notes` TEXT,
  `time_added` DATETIME,
  FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`appointment_id`) REFERENCES `appointments`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`dentist_id`) REFERENCES `dentists`(`id`) ON DELETE SET NULL
);

-- PAYMENT RECORDS TABLE
-- Stores billing records for appointment/queue context.
-- Multiple records are allowed to support split flows (existing deposit + new one-time services).
CREATE TABLE IF NOT EXISTS `payment_records` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `patient_id` INT NOT NULL,
  `dentist_id` INT NULL,
  `appointment_id` INT NULL,
  `queue_id` INT NULL,
  `patient_name` VARCHAR(255),
  `dentist_name` VARCHAR(255),
  `visit_datetime` VARCHAR(255),
  `services_text` TEXT,
  `total_due` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `amount_paid` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `balance_due` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `is_deposit` TINYINT(1) NOT NULL DEFAULT 0,
  `payment_status` VARCHAR(50) NOT NULL DEFAULT 'Unpaid',
  `notes` TEXT,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_payment_queue` (`queue_id`),
  INDEX `idx_payment_appointment` (`appointment_id`),
  INDEX `idx_payment_patient` (`patient_id`),
  INDEX `idx_payment_status` (`payment_status`),
  INDEX `idx_payment_created` (`created_at`),
  FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`dentist_id`) REFERENCES `dentists`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`appointment_id`) REFERENCES `appointments`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`queue_id`) REFERENCES `walk_in_queue`(`id`) ON DELETE SET NULL
);

-- PAYMENT TRANSACTIONS TABLE
-- Stores installment/payment history entries for each payment record.
CREATE TABLE IF NOT EXISTS `payment_transactions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `payment_record_id` INT NOT NULL,
  `payment_method` VARCHAR(50) NOT NULL,
  `amount_paid` DECIMAL(10,2) NOT NULL,
  `cash_received` DECIMAL(10,2) NULL,
  `change_amount` DECIMAL(10,2) NULL,
  `proof_name` VARCHAR(255) NULL,
  `proof_data` LONGTEXT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_payment_tx_record` (`payment_record_id`),
  INDEX `idx_payment_tx_created` (`created_at`),
  FOREIGN KEY (`payment_record_id`) REFERENCES `payment_records`(`id`) ON DELETE CASCADE
);

-- TOOTH CONDITIONS TABLE
-- Added record_year
CREATE TABLE IF NOT EXISTS `tooth_conditions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `patient_id` INT,
  `record_year` INT NOT NULL DEFAULT 1,
  `cell_key` VARCHAR(255) NOT NULL,
  `condition_code` VARCHAR(10),
  `status` VARCHAR(50),
  `is_shaded` BOOLEAN DEFAULT FALSE,
  `segments` JSON, 
  FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE CASCADE
);

-- TREATMENT TIMELINE TABLE
-- Added record_year
CREATE TABLE IF NOT EXISTS `treatment_timeline` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `patient_id` INT,
  `record_year` INT NOT NULL DEFAULT 1,
  `start_time` VARCHAR(255),
  `end_time` VARCHAR(255),
  `provider` VARCHAR(255),
  `procedure_text` TEXT,
  `notes` TEXT,
  `price` DECIMAL(10, 2),
  `image_url` LONGTEXT,
  FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE CASCADE
);

-- MEDICATIONS TABLE
-- Added record_year
CREATE TABLE IF NOT EXISTS `medications` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `patient_id` INT,
  `treatment_id` INT,
  `record_year` INT NOT NULL DEFAULT 1,
  `medicine` VARCHAR(255) NOT NULL,
  `dosage` VARCHAR(255),
  `frequency` VARCHAR(255),
  `notes` TEXT,
  FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`treatment_id`) REFERENCES `treatment_timeline`(`id`) ON DELETE SET NULL
);

-- INITIAL DATA SEEDING
INSERT INTO `dentists` (`name`, `specialty`, `status`, `schedule`) VALUES
('Dr. Paul Zaragoza', 'General Dentist', 'Available', '{\"days\": [1,3,5], "operatingHours\": {\"start\": \"09:00\", \"end\": \"17:30\"}, \"lunch\": {\"start\": \"12:30\", \"end\": \"13:15\"}, \"breaks\": [], \"leaveDays\": []}'),
('Dr. Erica Aquino', 'Orthodontist', 'Available', '{\"days\": [2,4], "operatingHours\": {\"start\": \"10:00\", \"end\": \"18:00\"}, \"lunch\": {\"start\": \"13:00\", \"end\": \"14:00\"}, \"breaks\": [], \"leaveDays\": []}'),
('Dr. Hernane Benedicto', 'Prosthodontist', 'Available', '{\"days\": [1,2,3,4,5], "operatingHours\": {\"start\": \"08:30\", \"end\": \"17:00\"}, \"lunch\": {\"start\": \"12:00\", \"end\": \"12:45\"}, \"breaks\": [], \"leaveDays\": []}');