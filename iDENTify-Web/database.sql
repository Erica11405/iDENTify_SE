CREATE DATABASE IF NOT EXISTS `identify_app`;

USE `identify_app`;

-- CORE TENANT TABLES
CREATE TABLE IF NOT EXISTS `clinics` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `code` VARCHAR(64) NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `status` VARCHAR(32) NOT NULL DEFAULT 'Active',
  `suspended_at` DATETIME NULL,
  `deactivated_at` DATETIME NULL,
  `archived_at` DATETIME NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_clinics_name` (`name`),
  INDEX `idx_clinics_status` (`status`)
);

CREATE TABLE IF NOT EXISTS `clinic_branches` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `clinic_id` INT NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `code` VARCHAR(64) NULL,
  `address` VARCHAR(500) NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `status` VARCHAR(32) NOT NULL DEFAULT 'Active',
  `suspended_at` DATETIME NULL,
  `deactivated_at` DATETIME NULL,
  `archived_at` DATETIME NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_clinic_branch_name` (`clinic_id`, `name`),
  INDEX `idx_branch_clinic` (`clinic_id`),
  INDEX `idx_clinic_branches_status` (`status`),
  CONSTRAINT `fk_clinic_branches_clinic`
    FOREIGN KEY (`clinic_id`) REFERENCES `clinics`(`id`)
    ON DELETE CASCADE
);

-- DENTISTS TABLE
CREATE TABLE IF NOT EXISTS `dentists` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `first_name` VARCHAR(100),
  `last_name` VARCHAR(100),
  `middle_name` VARCHAR(100),
  `name` VARCHAR(255), -- "First Last" display name
  `specialization` VARCHAR(255),
  `phone` VARCHAR(20),
  `email` VARCHAR(100),
  `status` VARCHAR(50) DEFAULT 'Available',
  `is_archived` TINYINT(1) NOT NULL DEFAULT 0,
  `archived_at` DATETIME NULL,
  `schedule_days` JSON DEFAULT NULL,
  `operating_hours` JSON DEFAULT NULL,
  `lunch` JSON DEFAULT NULL,
  `breaks` JSON DEFAULT NULL,
  `leave_days` JSON DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
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
('Endodontist'),
('Dental Aide');

-- USERS TABLE
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `password_change_required` TINYINT(1) NOT NULL DEFAULT 0,
  `full_name` VARCHAR(255),
  `last_name` VARCHAR(100),
  `role` VARCHAR(50) NOT NULL,
  `dentist_id` INT NULL,
  `clinic_id` INT NULL,
  `branch_id` INT NULL,
  `is_verified` TINYINT(1) NOT NULL DEFAULT 0,
  `is_archived` TINYINT(1) NOT NULL DEFAULT 0,
  `approval_status` VARCHAR(32) NOT NULL DEFAULT 'approved',
  `approved_at` DATETIME NULL,
  `approved_by_user_id` INT NULL,
  `declined_at` DATETIME NULL,
  `decline_reason` VARCHAR(500) NULL,
  `otp_code` VARCHAR(10) NULL,
  `otp_expires_at` DATETIME NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_users_role` (`role`),
  INDEX `idx_users_clinic_id` (`clinic_id`),
  INDEX `idx_users_branch_id` (`branch_id`),
  INDEX `idx_users_approval_status` (`approval_status`),
  INDEX `idx_users_approved_by_user_id` (`approved_by_user_id`),
  FOREIGN KEY (`dentist_id`) REFERENCES `dentists`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`clinic_id`) REFERENCES `clinics`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`branch_id`) REFERENCES `clinic_branches`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`approved_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
);

-- SUPERADMIN ACCESS REQUESTS
CREATE TABLE IF NOT EXISTS `superadmin_access_requests` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `clinic_name` VARCHAR(255) NOT NULL,
  `branch_count` INT NOT NULL DEFAULT 1,
  `clinic_address` TEXT NOT NULL,
  `contact_phone` VARCHAR(64) NOT NULL,
  `business_permit_or_license_number` VARCHAR(255) NOT NULL,
  `owner_valid_id_name` VARCHAR(255) NOT NULL,
  `owner_valid_id_data` LONGTEXT NOT NULL,
  `doh_lto_number` VARCHAR(255) NOT NULL,
  `doh_lto_doc_name` VARCHAR(255) NOT NULL,
  `doh_lto_doc_data` LONGTEXT NOT NULL,
  `sec_dti_number` VARCHAR(255) NOT NULL,
  `sec_dti_doc_name` VARCHAR(255) NOT NULL,
  `sec_dti_doc_data` LONGTEXT NOT NULL,
  `bir_2303_number` VARCHAR(255) NOT NULL,
  `bir_2303_doc_name` VARCHAR(255) NOT NULL,
  `bir_2303_doc_data` LONGTEXT NOT NULL,
  `status` VARCHAR(32) NOT NULL DEFAULT 'pending_review',
  `submitted_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `reviewed_at` DATETIME NULL,
  `reviewed_by_user_id` INT NULL,
  `review_notes` VARCHAR(500) NULL,
  `resubmission_count` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_superadmin_access_requests_user_id` (`user_id`),
  INDEX `idx_superadmin_access_requests_status` (`status`),
  INDEX `idx_superadmin_access_requests_submitted_at` (`submitted_at`),
  INDEX `idx_superadmin_access_requests_reviewed_by` (`reviewed_by_user_id`),
  CONSTRAINT `fk_superadmin_access_requests_user_id` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_superadmin_access_requests_reviewed_by` FOREIGN KEY (`reviewed_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
);

-- LOGIN AUDIT EVENTS
CREATE TABLE IF NOT EXISTS `login_audit_events` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NULL,
  `attempted_email` VARCHAR(255) NULL,
  `role` VARCHAR(32) NULL,
  `clinic_id` INT NULL,
  `branch_id` INT NULL,
  `outcome` VARCHAR(32) NOT NULL,
  `failure_reason` VARCHAR(255) NULL,
  `ip_address` VARCHAR(64) NULL,
  `user_agent` VARCHAR(500) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_login_audit_outcome_created` (`outcome`, `created_at`),
  INDEX `idx_login_audit_user_created` (`user_id`, `created_at`),
  INDEX `idx_login_audit_clinic_created` (`clinic_id`, `created_at`),
  INDEX `idx_login_audit_branch_created` (`branch_id`, `created_at`),
  CONSTRAINT `fk_login_audit_user_id` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_login_audit_clinic_id` FOREIGN KEY (`clinic_id`) REFERENCES `clinics`(`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_login_audit_branch_id` FOREIGN KEY (`branch_id`) REFERENCES `clinic_branches`(`id`) ON DELETE SET NULL
);

-- CLINIC SERVICES & MEDICATIONS
CREATE TABLE IF NOT EXISTS `clinic_services` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `min_price` DECIMAL(10,2) DEFAULT 0.00,
  `max_price` DECIMAL(10,2) DEFAULT 0.00,
  `estimated_duration` INT DEFAULT 30,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `clinic_medications` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `default_dosage` VARCHAR(255),
  `default_frequency` VARCHAR(255),
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- PATIENTS TABLE
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
  `medical_alerts` TEXT,
  `parent_id` INT,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`parent_id`) REFERENCES `patients`(`id`) ON DELETE SET NULL
);

-- PATIENT ANNUAL RECORDS TABLE
CREATE TABLE IF NOT EXISTS `patient_annual_records` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `patient_id` INT NOT NULL,
  `record_year` INT NOT NULL DEFAULT 1,
  `dental_history` TEXT,
  `vitals` JSON,
  `xrays` LONGTEXT,
  `status` VARCHAR(50) DEFAULT 'Active',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `unique_year_record` (`patient_id`, `record_year`)
);

-- APPOINTMENTS TABLE
CREATE TABLE IF NOT EXISTS `appointments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `patient_id` INT,
  `dentist_id` INT,
  `clinic_id` INT NULL,
  `branch_id` INT NULL,
  `appointment_datetime` DATETIME,
  `end_datetime` DATETIME,
  `reason` TEXT,
  `notes` TEXT,
  `status` VARCHAR(50),
  `decision_status` VARCHAR(32) NOT NULL DEFAULT 'pending',
  `decided_at` DATETIME NULL,
  `decided_by_user_id` INT NULL,
  `decline_reason` VARCHAR(500) NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_appointments_clinic_id` (`clinic_id`),
  INDEX `idx_appointments_branch_id` (`branch_id`),
  INDEX `idx_appointments_decision_status` (`decision_status`),
  INDEX `idx_appointments_decided_by_user_id` (`decided_by_user_id`),
  FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`dentist_id`) REFERENCES `dentists`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`clinic_id`) REFERENCES `clinics`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`branch_id`) REFERENCES `clinic_branches`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`decided_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
);

-- APPOINTMENT SERVICE ITEMS
CREATE TABLE IF NOT EXISTS `appointment_service_items` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `appointment_id` INT NOT NULL,
  `sequence_order` INT NOT NULL,
  `service_id` INT NULL,
  `service_name_snapshot` VARCHAR(255) NOT NULL,
  `dentist_id` INT NOT NULL,
  `duration_minutes` INT NOT NULL DEFAULT 30,
  `segment_start` DATETIME NOT NULL,
  `segment_end` DATETIME NOT NULL,
  `notes` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_appointment_service_items_order` (`appointment_id`, `sequence_order`),
  INDEX `idx_appointment_service_items_appointment` (`appointment_id`),
  INDEX `idx_appointment_service_items_dentist_time` (`dentist_id`, `segment_start`, `segment_end`),
  CONSTRAINT `fk_appointment_service_items_appointment_id` FOREIGN KEY (`appointment_id`) REFERENCES `appointments`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_appointment_service_items_dentist_id` FOREIGN KEY (`dentist_id`) REFERENCES `dentists`(`id`) ON DELETE RESTRICT
);

-- QUEUE TABLE
CREATE TABLE IF NOT EXISTS `walk_in_queue` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `patient_id` INT,
  `appointment_id` INT NULL,
  `dentist_id` INT NULL,
  `clinic_id` INT NULL,
  `branch_id` INT NULL,
  `source` VARCHAR(50),
  `status` VARCHAR(50),
  `notes` TEXT,
  `time_added` DATETIME,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_queue_clinic_id` (`clinic_id`),
  INDEX `idx_queue_branch_id` (`branch_id`),
  FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`appointment_id`) REFERENCES `appointments`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`dentist_id`) REFERENCES `dentists`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`clinic_id`) REFERENCES `clinics`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`branch_id`) REFERENCES `clinic_branches`(`id`) ON DELETE SET NULL
);

-- PAYMENT RECORDS TABLE
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
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE CASCADE
);

-- MEDICATIONS TABLE
CREATE TABLE IF NOT EXISTS `medications` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `patient_id` INT,
  `treatment_id` INT,
  `record_year` INT NOT NULL DEFAULT 1,
  `medicine` VARCHAR(255) NOT NULL,
  `dosage` VARCHAR(255),
  `frequency` VARCHAR(255),
  `notes` TEXT,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_medications_treatment_id` (`treatment_id`),
  FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`treatment_id`) REFERENCES `treatment_timeline`(`id`) ON DELETE SET NULL
);

-- MIGRATION TRACKING
CREATE TABLE IF NOT EXISTS `schema_migrations` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `filename` VARCHAR(255) NOT NULL UNIQUE,
  `checksum` VARCHAR(64) NOT NULL,
  `applied_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- SEED DATA: Global Admin Account
-- Email: ericaaquino01145@gmail.com
-- Default password: password (hashed)
INSERT INTO `users` (
  `email`,
  `password_hash`,
  `full_name`,
  `last_name`,
  `role`,
  `is_verified`,
  `is_archived`,
  `password_change_required`,
  `approval_status`,
  `approved_at`
) VALUES (
  'ericaaquino01145@gmail.com',
  '$2b$10$dIabtxsHVT2hq5VZXbUHMeO7lV6MhGlYZksompSzfdpqREwPH4Gqe',
  'System Global Admin',
  'Admin',
  'globaladmin',
  1,
  0,
  0,
  'approved',
  NOW()
) ON DUPLICATE KEY UPDATE `email` = `email`;
