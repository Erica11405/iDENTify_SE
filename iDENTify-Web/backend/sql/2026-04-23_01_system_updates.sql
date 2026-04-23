-- iDENTify-Web migration: Global System Updates
-- Date: 2026-04-23
-- Description: Strict Data Isolation, Segmented Address Fields, Additional Charges

-- PATIENTS
SET @s = (SELECT IF((SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'patients' AND column_name = 'clinic_id') = 0, 'ALTER TABLE patients ADD COLUMN clinic_id INT NULL AFTER parent_id', 'SELECT 1'));
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF((SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'patients' AND column_name = 'branch_id') = 0, 'ALTER TABLE patients ADD COLUMN branch_id INT NULL AFTER clinic_id', 'SELECT 1'));
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF((SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'patients' AND index_name = 'idx_patients_clinic_id') = 0, 'ALTER TABLE patients ADD INDEX idx_patients_clinic_id (clinic_id)', 'SELECT 1'));
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF((SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'patients' AND index_name = 'idx_patients_branch_id') = 0, 'ALTER TABLE patients ADD INDEX idx_patients_branch_id (branch_id)', 'SELECT 1'));
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF((SELECT COUNT(*) FROM information_schema.table_constraints WHERE table_schema = DATABASE() AND table_name = 'patients' AND constraint_name = 'fk_patients_clinic_id') = 0, 'ALTER TABLE patients ADD CONSTRAINT fk_patients_clinic_id FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE SET NULL', 'SELECT 1'));
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF((SELECT COUNT(*) FROM information_schema.table_constraints WHERE table_schema = DATABASE() AND table_name = 'patients' AND constraint_name = 'fk_patients_branch_id') = 0, 'ALTER TABLE patients ADD CONSTRAINT fk_patients_branch_id FOREIGN KEY (branch_id) REFERENCES clinic_branches(id) ON DELETE SET NULL', 'SELECT 1'));
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF((SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'patients' AND column_name = 'street') = 0, 'ALTER TABLE patients ADD COLUMN street VARCHAR(255) NULL AFTER address', 'SELECT 1'));
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF((SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'patients' AND column_name = 'barangay') = 0, 'ALTER TABLE patients ADD COLUMN barangay VARCHAR(255) NULL AFTER street', 'SELECT 1'));
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF((SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'patients' AND column_name = 'city') = 0, 'ALTER TABLE patients ADD COLUMN city VARCHAR(255) NULL AFTER barangay', 'SELECT 1'));
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF((SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'patients' AND column_name = 'province') = 0, 'ALTER TABLE patients ADD COLUMN province VARCHAR(255) NULL AFTER city', 'SELECT 1'));
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- PATIENT ANNUAL RECORDS
SET @s = (SELECT IF((SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'patient_annual_records' AND column_name = 'clinic_id') = 0, 'ALTER TABLE patient_annual_records ADD COLUMN clinic_id INT NULL AFTER status', 'SELECT 1'));
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF((SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'patient_annual_records' AND column_name = 'branch_id') = 0, 'ALTER TABLE patient_annual_records ADD COLUMN branch_id INT NULL AFTER clinic_id', 'SELECT 1'));
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF((SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'patient_annual_records' AND index_name = 'idx_par_clinic_id') = 0, 'ALTER TABLE patient_annual_records ADD INDEX idx_par_clinic_id (clinic_id)', 'SELECT 1'));
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF((SELECT COUNT(*) FROM information_schema.table_constraints WHERE table_schema = DATABASE() AND table_name = 'patient_annual_records' AND constraint_name = 'fk_par_clinic_id') = 0, 'ALTER TABLE patient_annual_records ADD CONSTRAINT fk_par_clinic_id FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE SET NULL', 'SELECT 1'));
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- CLINIC SERVICES
SET @s = (SELECT IF((SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'clinic_services' AND column_name = 'clinic_id') = 0, 'ALTER TABLE clinic_services ADD COLUMN clinic_id INT NULL AFTER id', 'SELECT 1'));
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF((SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'clinic_services' AND index_name = 'idx_services_clinic_id') = 0, 'ALTER TABLE clinic_services ADD INDEX idx_services_clinic_id (clinic_id)', 'SELECT 1'));
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF((SELECT COUNT(*) FROM information_schema.table_constraints WHERE table_schema = DATABASE() AND table_name = 'clinic_services' AND constraint_name = 'fk_services_clinic_id') = 0, 'ALTER TABLE clinic_services ADD CONSTRAINT fk_services_clinic_id FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE SET NULL', 'SELECT 1'));
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- CLINIC MEDICATIONS
SET @s = (SELECT IF((SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'clinic_medications' AND column_name = 'clinic_id') = 0, 'ALTER TABLE clinic_medications ADD COLUMN clinic_id INT NULL AFTER id', 'SELECT 1'));
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF((SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'clinic_medications' AND index_name = 'idx_medications_clinic_id') = 0, 'ALTER TABLE clinic_medications ADD INDEX idx_medications_clinic_id (clinic_id)', 'SELECT 1'));
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF((SELECT COUNT(*) FROM information_schema.table_constraints WHERE table_schema = DATABASE() AND table_name = 'clinic_medications' AND constraint_name = 'fk_medications_clinic_id') = 0, 'ALTER TABLE clinic_medications ADD CONSTRAINT fk_medications_clinic_id FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE SET NULL', 'SELECT 1'));
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- PAYMENT RECORDS
SET @s = (SELECT IF((SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'payment_records' AND column_name = 'clinic_id') = 0, 'ALTER TABLE payment_records ADD COLUMN clinic_id INT NULL AFTER queue_id', 'SELECT 1'));
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF((SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'payment_records' AND column_name = 'branch_id') = 0, 'ALTER TABLE payment_records ADD COLUMN branch_id INT NULL AFTER clinic_id', 'SELECT 1'));
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF((SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'payment_records' AND index_name = 'idx_payments_clinic_id') = 0, 'ALTER TABLE payment_records ADD INDEX idx_payments_clinic_id (clinic_id)', 'SELECT 1'));
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF((SELECT COUNT(*) FROM information_schema.table_constraints WHERE table_schema = DATABASE() AND table_name = 'payment_records' AND constraint_name = 'fk_payments_clinic_id') = 0, 'ALTER TABLE payment_records ADD CONSTRAINT fk_payments_clinic_id FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE SET NULL', 'SELECT 1'));
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF((SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'payment_records' AND column_name = 'additional_charges') = 0, 'ALTER TABLE payment_records ADD COLUMN additional_charges JSON NULL AFTER services_text', 'SELECT 1'));
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- TOOTH CONDITIONS
SET @s = (SELECT IF((SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'tooth_conditions' AND column_name = 'clinic_id') = 0, 'ALTER TABLE tooth_conditions ADD COLUMN clinic_id INT NULL AFTER is_shaded', 'SELECT 1'));
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF((SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'tooth_conditions' AND index_name = 'idx_tooth_conditions_clinic_id') = 0, 'ALTER TABLE tooth_conditions ADD INDEX idx_tooth_conditions_clinic_id (clinic_id)', 'SELECT 1'));
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF((SELECT COUNT(*) FROM information_schema.table_constraints WHERE table_schema = DATABASE() AND table_name = 'tooth_conditions' AND constraint_name = 'fk_tooth_conditions_clinic_id') = 0, 'ALTER TABLE tooth_conditions ADD CONSTRAINT fk_tooth_conditions_clinic_id FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE SET NULL', 'SELECT 1'));
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- TREATMENT TIMELINE
SET @s = (SELECT IF((SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'treatment_timeline' AND column_name = 'clinic_id') = 0, 'ALTER TABLE treatment_timeline ADD COLUMN clinic_id INT NULL AFTER price', 'SELECT 1'));
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF((SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'treatment_timeline' AND column_name = 'branch_id') = 0, 'ALTER TABLE treatment_timeline ADD COLUMN branch_id INT NULL AFTER clinic_id', 'SELECT 1'));
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF((SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'treatment_timeline' AND index_name = 'idx_treatment_clinic_id') = 0, 'ALTER TABLE treatment_timeline ADD INDEX idx_treatment_clinic_id (clinic_id)', 'SELECT 1'));
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF((SELECT COUNT(*) FROM information_schema.table_constraints WHERE table_schema = DATABASE() AND table_name = 'treatment_timeline' AND constraint_name = 'fk_treatment_clinic_id') = 0, 'ALTER TABLE treatment_timeline ADD CONSTRAINT fk_treatment_clinic_id FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE SET NULL', 'SELECT 1'));
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- MEDICATIONS (Prescriptions)
SET @s = (SELECT IF((SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'medications' AND column_name = 'clinic_id') = 0, 'ALTER TABLE medications ADD COLUMN clinic_id INT NULL AFTER notes', 'SELECT 1'));
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF((SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'medications' AND index_name = 'idx_prescriptions_clinic_id') = 0, 'ALTER TABLE medications ADD INDEX idx_prescriptions_clinic_id (clinic_id)', 'SELECT 1'));
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF((SELECT COUNT(*) FROM information_schema.table_constraints WHERE table_schema = DATABASE() AND table_name = 'medications' AND constraint_name = 'fk_prescriptions_clinic_id') = 0, 'ALTER TABLE medications ADD CONSTRAINT fk_prescriptions_clinic_id FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE SET NULL', 'SELECT 1'));
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- CLINIC BRANCHES ADDRESS
SET @s = (SELECT IF((SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'clinic_branches' AND column_name = 'street') = 0, 'ALTER TABLE clinic_branches ADD COLUMN street VARCHAR(255) NULL AFTER address', 'SELECT 1'));
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF((SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'clinic_branches' AND column_name = 'barangay') = 0, 'ALTER TABLE clinic_branches ADD COLUMN barangay VARCHAR(255) NULL AFTER street', 'SELECT 1'));
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF((SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'clinic_branches' AND column_name = 'city') = 0, 'ALTER TABLE clinic_branches ADD COLUMN city VARCHAR(255) NULL AFTER barangay', 'SELECT 1'));
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF((SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'clinic_branches' AND column_name = 'province') = 0, 'ALTER TABLE clinic_branches ADD COLUMN province VARCHAR(255) NULL AFTER city', 'SELECT 1'));
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- SUPERADMIN ACCESS REQUESTS ADDRESS
SET @s = (SELECT IF((SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'superadmin_access_requests' AND column_name = 'street') = 0, 'ALTER TABLE superadmin_access_requests ADD COLUMN street VARCHAR(255) NULL AFTER clinic_address', 'SELECT 1'));
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF((SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'superadmin_access_requests' AND column_name = 'barangay') = 0, 'ALTER TABLE superadmin_access_requests ADD COLUMN barangay VARCHAR(255) NULL AFTER street', 'SELECT 1'));
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF((SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'superadmin_access_requests' AND column_name = 'city') = 0, 'ALTER TABLE superadmin_access_requests ADD COLUMN city VARCHAR(255) NULL AFTER barangay', 'SELECT 1'));
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF((SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'superadmin_access_requests' AND column_name = 'province') = 0, 'ALTER TABLE superadmin_access_requests ADD COLUMN province VARCHAR(255) NULL AFTER city', 'SELECT 1'));
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;
