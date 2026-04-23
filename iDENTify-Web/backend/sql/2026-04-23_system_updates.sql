-- iDENTify-Web migration: Global System Updates
-- Date: 2026-04-23
-- Description: Strict Data Isolation, Segmented Address Fields, Additional Charges

SET @db_name = DATABASE();

-- 1. STRICT DATA ISOLATION & SEGMENTED ADDRESS FIELDS

-- PATIENTS
SET @patients_has_clinic_id = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = @db_name AND table_name = 'patients' AND column_name = 'clinic_id');
SET @patients_add_clinic_id_sql = IF(@patients_has_clinic_id = 0, 'ALTER TABLE patients ADD COLUMN clinic_id INT NULL AFTER parent_id', 'SELECT 1');
PREPARE stmt FROM @patients_add_clinic_id_sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @patients_has_idx_clinic_id = (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = @db_name AND table_name = 'patients' AND index_name = 'idx_patients_clinic_id');
SET @patients_add_idx_clinic_id_sql = IF(@patients_has_idx_clinic_id = 0 AND @patients_has_clinic_id = 0, 'ALTER TABLE patients ADD INDEX idx_patients_clinic_id (clinic_id)', 'SELECT 1');
-- Note: Re-running index add might fail if column already exists but index doesn't, so we check both.
-- Actually if column exists, we can still add index.
SET @patients_add_idx_clinic_id_sql = IF(@patients_has_idx_clinic_id = 0, 'ALTER TABLE patients ADD INDEX idx_patients_clinic_id (clinic_id)', 'SELECT 1');
PREPARE stmt FROM @patients_add_idx_clinic_id_sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ... and so on. This is getting verbose. 
-- I'll use a more compact way or just rely on the fact that I'm adding these now.
-- But since I need to be safe, I'll use a stored procedure to make it cleaner.

DROP PROCEDURE IF EXISTS AddColumnSafely;
DELIMITER //
CREATE PROCEDURE AddColumnSafely(IN tableName VARCHAR(255), IN columnName VARCHAR(255), IN columnDef VARCHAR(255), IN afterColumn VARCHAR(255))
BEGIN
    IF NOT EXISTS (SELECT * FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = tableName AND column_name = columnName) THEN
        SET @sql = CONCAT('ALTER TABLE ', tableName, ' ADD COLUMN ', columnName, ' ', columnDef, ' AFTER ', afterColumn);
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS AddIndexSafely;
DELIMITER //
CREATE PROCEDURE AddIndexSafely(IN tableName VARCHAR(255), IN indexName VARCHAR(255), IN indexDef VARCHAR(255))
BEGIN
    IF NOT EXISTS (SELECT * FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = tableName AND index_name = indexName) THEN
        SET @sql = CONCAT('ALTER TABLE ', tableName, ' ADD INDEX ', indexName, ' ', indexDef);
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS AddConstraintSafely;
DELIMITER //
CREATE PROCEDURE AddConstraintSafely(IN tableName VARCHAR(255), IN constraintName VARCHAR(255), IN constraintDef VARCHAR(255))
BEGIN
    IF NOT EXISTS (SELECT * FROM information_schema.table_constraints WHERE table_schema = DATABASE() AND table_name = tableName AND constraint_name = constraintName) THEN
        SET @sql = CONCAT('ALTER TABLE ', tableName, ' ADD CONSTRAINT ', constraintName, ' ', constraintDef);
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END //
DELIMITER ;

-- Apply changes
CALL AddColumnSafely('patients', 'clinic_id', 'INT NULL', 'parent_id');
CALL AddColumnSafely('patients', 'branch_id', 'INT NULL', 'clinic_id');
CALL AddIndexSafely('patients', 'idx_patients_clinic_id', '(clinic_id)');
CALL AddIndexSafely('patients', 'idx_patients_branch_id', '(branch_id)');
CALL AddConstraintSafely('patients', 'fk_patients_clinic_id', 'FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE SET NULL');
CALL AddConstraintSafely('patients', 'fk_patients_branch_id', 'FOREIGN KEY (branch_id) REFERENCES clinic_branches(id) ON DELETE SET NULL');

CALL AddColumnSafely('patients', 'street', 'VARCHAR(255) NULL', 'address');
CALL AddColumnSafely('patients', 'barangay', 'VARCHAR(255) NULL', 'street');
CALL AddColumnSafely('patients', 'city', 'VARCHAR(255) NULL', 'barangay');
CALL AddColumnSafely('patients', 'province', 'VARCHAR(255) NULL', 'city');

CALL AddColumnSafely('patient_annual_records', 'clinic_id', 'INT NULL', 'status');
CALL AddColumnSafely('patient_annual_records', 'branch_id', 'INT NULL', 'clinic_id');
CALL AddIndexSafely('patient_annual_records', 'idx_par_clinic_id', '(clinic_id)');
CALL AddConstraintSafely('patient_annual_records', 'fk_par_clinic_id', 'FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE SET NULL');

CALL AddColumnSafely('clinic_services', 'clinic_id', 'INT NULL', 'id');
CALL AddIndexSafely('clinic_services', 'idx_services_clinic_id', '(clinic_id)');
CALL AddConstraintSafely('clinic_services', 'fk_services_clinic_id', 'FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE SET NULL');

CALL AddColumnSafely('clinic_medications', 'clinic_id', 'INT NULL', 'id');
CALL AddIndexSafely('clinic_medications', 'idx_medications_clinic_id', '(clinic_id)');
CALL AddConstraintSafely('clinic_medications', 'fk_medications_clinic_id', 'FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE SET NULL');

CALL AddColumnSafely('payment_records', 'clinic_id', 'INT NULL', 'queue_id');
CALL AddColumnSafely('payment_records', 'branch_id', 'INT NULL', 'clinic_id');
CALL AddIndexSafely('payment_records', 'idx_payments_clinic_id', '(clinic_id)');
CALL AddConstraintSafely('payment_records', 'fk_payments_clinic_id', 'FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE SET NULL');
CALL AddColumnSafely('payment_records', 'additional_charges', 'JSON NULL', 'services_text');

CALL AddColumnSafely('tooth_conditions', 'clinic_id', 'INT NULL', 'is_shaded');
CALL AddIndexSafely('tooth_conditions', 'idx_tooth_conditions_clinic_id', '(clinic_id)');
CALL AddConstraintSafely('tooth_conditions', 'fk_tooth_conditions_clinic_id', 'FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE SET NULL');

CALL AddColumnSafely('treatment_timeline', 'clinic_id', 'INT NULL', 'price');
CALL AddColumnSafely('treatment_timeline', 'branch_id', 'INT NULL', 'clinic_id');
CALL AddIndexSafely('treatment_timeline', 'idx_treatment_clinic_id', '(clinic_id)');
CALL AddConstraintSafely('treatment_timeline', 'fk_treatment_clinic_id', 'FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE SET NULL');

CALL AddColumnSafely('medications', 'clinic_id', 'INT NULL', 'notes');
CALL AddIndexSafely('medications', 'idx_prescriptions_clinic_id', '(clinic_id)');
CALL AddConstraintSafely('medications', 'fk_prescriptions_clinic_id', 'FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE SET NULL');

CALL AddColumnSafely('clinic_branches', 'street', 'VARCHAR(255) NULL', 'address');
CALL AddColumnSafely('clinic_branches', 'barangay', 'VARCHAR(255) NULL', 'street');
CALL AddColumnSafely('clinic_branches', 'city', 'VARCHAR(255) NULL', 'barangay');
CALL AddColumnSafely('clinic_branches', 'province', 'VARCHAR(255) NULL', 'city');

CALL AddColumnSafely('superadmin_access_requests', 'street', 'VARCHAR(255) NULL', 'clinic_address');
CALL AddColumnSafely('superadmin_access_requests', 'barangay', 'VARCHAR(255) NULL', 'street');
CALL AddColumnSafely('superadmin_access_requests', 'city', 'VARCHAR(255) NULL', 'barangay');
CALL AddColumnSafely('superadmin_access_requests', 'province', 'VARCHAR(255) NULL', 'city');

DROP PROCEDURE AddColumnSafely;
DROP PROCEDURE AddIndexSafely;
DROP PROCEDURE AddConstraintSafely;
