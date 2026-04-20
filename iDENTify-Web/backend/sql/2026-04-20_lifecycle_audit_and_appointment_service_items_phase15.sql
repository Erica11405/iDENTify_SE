-- iDENTify-Web migration: lifecycle controls, login audit, and appointment service line items
-- Date: 2026-04-20

SET @db_name = DATABASE();

SET @clinics_table_exists = (
  SELECT COUNT(*)
  FROM information_schema.tables
  WHERE table_schema = @db_name
    AND table_name = 'clinics'
);

SET @clinic_branches_table_exists = (
  SELECT COUNT(*)
  FROM information_schema.tables
  WHERE table_schema = @db_name
    AND table_name = 'clinic_branches'
);

SET @users_table_exists = (
  SELECT COUNT(*)
  FROM information_schema.tables
  WHERE table_schema = @db_name
    AND table_name = 'users'
);

SET @appointments_table_exists = (
  SELECT COUNT(*)
  FROM information_schema.tables
  WHERE table_schema = @db_name
    AND table_name = 'appointments'
);

SET @dentists_table_exists = (
  SELECT COUNT(*)
  FROM information_schema.tables
  WHERE table_schema = @db_name
    AND table_name = 'dentists'
);

-- clinics.status
SET @has_clinics_status = (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = @db_name
    AND table_name = 'clinics'
    AND column_name = 'status'
);

SET @add_clinics_status_sql = IF(
  @clinics_table_exists = 0 OR @has_clinics_status > 0,
  'SELECT ''skip add clinics.status''',
  "ALTER TABLE clinics ADD COLUMN status VARCHAR(32) NOT NULL DEFAULT 'Active' AFTER is_active"
);
PREPARE stmt_add_clinics_status FROM @add_clinics_status_sql;
EXECUTE stmt_add_clinics_status;
DEALLOCATE PREPARE stmt_add_clinics_status;

-- clinics.suspended_at
SET @has_clinics_suspended_at = (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = @db_name
    AND table_name = 'clinics'
    AND column_name = 'suspended_at'
);

SET @add_clinics_suspended_at_sql = IF(
  @clinics_table_exists = 0 OR @has_clinics_suspended_at > 0,
  'SELECT ''skip add clinics.suspended_at''',
  'ALTER TABLE clinics ADD COLUMN suspended_at DATETIME NULL AFTER status'
);
PREPARE stmt_add_clinics_suspended_at FROM @add_clinics_suspended_at_sql;
EXECUTE stmt_add_clinics_suspended_at;
DEALLOCATE PREPARE stmt_add_clinics_suspended_at;

-- clinics.deactivated_at
SET @has_clinics_deactivated_at = (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = @db_name
    AND table_name = 'clinics'
    AND column_name = 'deactivated_at'
);

SET @add_clinics_deactivated_at_sql = IF(
  @clinics_table_exists = 0 OR @has_clinics_deactivated_at > 0,
  'SELECT ''skip add clinics.deactivated_at''',
  'ALTER TABLE clinics ADD COLUMN deactivated_at DATETIME NULL AFTER suspended_at'
);
PREPARE stmt_add_clinics_deactivated_at FROM @add_clinics_deactivated_at_sql;
EXECUTE stmt_add_clinics_deactivated_at;
DEALLOCATE PREPARE stmt_add_clinics_deactivated_at;

-- clinics.archived_at
SET @has_clinics_archived_at = (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = @db_name
    AND table_name = 'clinics'
    AND column_name = 'archived_at'
);

SET @add_clinics_archived_at_sql = IF(
  @clinics_table_exists = 0 OR @has_clinics_archived_at > 0,
  'SELECT ''skip add clinics.archived_at''',
  'ALTER TABLE clinics ADD COLUMN archived_at DATETIME NULL AFTER deactivated_at'
);
PREPARE stmt_add_clinics_archived_at FROM @add_clinics_archived_at_sql;
EXECUTE stmt_add_clinics_archived_at;
DEALLOCATE PREPARE stmt_add_clinics_archived_at;

SET @backfill_clinics_status_sql = IF(
  @clinics_table_exists = 0 OR @has_clinics_status = 0,
  'SELECT ''skip backfill clinics.status''',
  "UPDATE clinics
   SET status = CASE WHEN COALESCE(is_active, 0) = 1 THEN 'Active' ELSE 'Deactivated' END
   WHERE status IS NULL OR TRIM(status) = ''"
);
PREPARE stmt_backfill_clinics_status FROM @backfill_clinics_status_sql;
EXECUTE stmt_backfill_clinics_status;
DEALLOCATE PREPARE stmt_backfill_clinics_status;

SET @has_clinics_status_idx = (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = @db_name
    AND table_name = 'clinics'
    AND index_name = 'idx_clinics_status'
);

SET @add_clinics_status_idx_sql = IF(
  @clinics_table_exists = 0 OR @has_clinics_status = 0 OR @has_clinics_status_idx > 0,
  'SELECT ''skip add idx_clinics_status''',
  'ALTER TABLE clinics ADD INDEX idx_clinics_status (status)'
);
PREPARE stmt_add_clinics_status_idx FROM @add_clinics_status_idx_sql;
EXECUTE stmt_add_clinics_status_idx;
DEALLOCATE PREPARE stmt_add_clinics_status_idx;

-- clinic_branches.status
SET @has_branches_status = (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = @db_name
    AND table_name = 'clinic_branches'
    AND column_name = 'status'
);

SET @add_branches_status_sql = IF(
  @clinic_branches_table_exists = 0 OR @has_branches_status > 0,
  'SELECT ''skip add clinic_branches.status''',
  "ALTER TABLE clinic_branches ADD COLUMN status VARCHAR(32) NOT NULL DEFAULT 'Active' AFTER is_active"
);
PREPARE stmt_add_branches_status FROM @add_branches_status_sql;
EXECUTE stmt_add_branches_status;
DEALLOCATE PREPARE stmt_add_branches_status;

-- clinic_branches.suspended_at
SET @has_branches_suspended_at = (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = @db_name
    AND table_name = 'clinic_branches'
    AND column_name = 'suspended_at'
);

SET @add_branches_suspended_at_sql = IF(
  @clinic_branches_table_exists = 0 OR @has_branches_suspended_at > 0,
  'SELECT ''skip add clinic_branches.suspended_at''',
  'ALTER TABLE clinic_branches ADD COLUMN suspended_at DATETIME NULL AFTER status'
);
PREPARE stmt_add_branches_suspended_at FROM @add_branches_suspended_at_sql;
EXECUTE stmt_add_branches_suspended_at;
DEALLOCATE PREPARE stmt_add_branches_suspended_at;

-- clinic_branches.deactivated_at
SET @has_branches_deactivated_at = (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = @db_name
    AND table_name = 'clinic_branches'
    AND column_name = 'deactivated_at'
);

SET @add_branches_deactivated_at_sql = IF(
  @clinic_branches_table_exists = 0 OR @has_branches_deactivated_at > 0,
  'SELECT ''skip add clinic_branches.deactivated_at''',
  'ALTER TABLE clinic_branches ADD COLUMN deactivated_at DATETIME NULL AFTER suspended_at'
);
PREPARE stmt_add_branches_deactivated_at FROM @add_branches_deactivated_at_sql;
EXECUTE stmt_add_branches_deactivated_at;
DEALLOCATE PREPARE stmt_add_branches_deactivated_at;

-- clinic_branches.archived_at
SET @has_branches_archived_at = (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = @db_name
    AND table_name = 'clinic_branches'
    AND column_name = 'archived_at'
);

SET @add_branches_archived_at_sql = IF(
  @clinic_branches_table_exists = 0 OR @has_branches_archived_at > 0,
  'SELECT ''skip add clinic_branches.archived_at''',
  'ALTER TABLE clinic_branches ADD COLUMN archived_at DATETIME NULL AFTER deactivated_at'
);
PREPARE stmt_add_branches_archived_at FROM @add_branches_archived_at_sql;
EXECUTE stmt_add_branches_archived_at;
DEALLOCATE PREPARE stmt_add_branches_archived_at;

SET @backfill_branches_status_sql = IF(
  @clinic_branches_table_exists = 0 OR @has_branches_status = 0,
  'SELECT ''skip backfill clinic_branches.status''',
  "UPDATE clinic_branches
   SET status = CASE WHEN COALESCE(is_active, 0) = 1 THEN 'Active' ELSE 'Deactivated' END
   WHERE status IS NULL OR TRIM(status) = ''"
);
PREPARE stmt_backfill_branches_status FROM @backfill_branches_status_sql;
EXECUTE stmt_backfill_branches_status;
DEALLOCATE PREPARE stmt_backfill_branches_status;

SET @has_branches_status_idx = (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = @db_name
    AND table_name = 'clinic_branches'
    AND index_name = 'idx_clinic_branches_status'
);

SET @add_branches_status_idx_sql = IF(
  @clinic_branches_table_exists = 0 OR @has_branches_status = 0 OR @has_branches_status_idx > 0,
  'SELECT ''skip add idx_clinic_branches_status''',
  'ALTER TABLE clinic_branches ADD INDEX idx_clinic_branches_status (status)'
);
PREPARE stmt_add_branches_status_idx FROM @add_branches_status_idx_sql;
EXECUTE stmt_add_branches_status_idx;
DEALLOCATE PREPARE stmt_add_branches_status_idx;

-- login_audit_events table
SET @login_audit_table_exists = (
  SELECT COUNT(*)
  FROM information_schema.tables
  WHERE table_schema = @db_name
    AND table_name = 'login_audit_events'
);

SET @create_login_audit_table_sql = IF(
  @login_audit_table_exists > 0,
  'SELECT ''skip create login_audit_events''',
  "CREATE TABLE login_audit_events (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    attempted_email VARCHAR(255) NULL,
    role VARCHAR(32) NULL,
    clinic_id INT NULL,
    branch_id INT NULL,
    outcome VARCHAR(32) NOT NULL,
    failure_reason VARCHAR(255) NULL,
    ip_address VARCHAR(64) NULL,
    user_agent VARCHAR(500) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_login_audit_outcome_created (outcome, created_at),
    INDEX idx_login_audit_user_created (user_id, created_at),
    INDEX idx_login_audit_clinic_created (clinic_id, created_at),
    INDEX idx_login_audit_branch_created (branch_id, created_at)
  )"
);
PREPARE stmt_create_login_audit_table FROM @create_login_audit_table_sql;
EXECUTE stmt_create_login_audit_table;
DEALLOCATE PREPARE stmt_create_login_audit_table;

SET @has_fk_login_audit_user = (
  SELECT COUNT(*)
  FROM information_schema.referential_constraints
  WHERE constraint_schema = @db_name
    AND table_name = 'login_audit_events'
    AND constraint_name = 'fk_login_audit_user_id'
);

SET @add_fk_login_audit_user_sql = IF(
  @users_table_exists = 0 OR @has_fk_login_audit_user > 0,
  'SELECT ''skip add fk_login_audit_user_id''',
  'ALTER TABLE login_audit_events ADD CONSTRAINT fk_login_audit_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL'
);
PREPARE stmt_add_fk_login_audit_user FROM @add_fk_login_audit_user_sql;
EXECUTE stmt_add_fk_login_audit_user;
DEALLOCATE PREPARE stmt_add_fk_login_audit_user;

SET @has_fk_login_audit_clinic = (
  SELECT COUNT(*)
  FROM information_schema.referential_constraints
  WHERE constraint_schema = @db_name
    AND table_name = 'login_audit_events'
    AND constraint_name = 'fk_login_audit_clinic_id'
);

SET @add_fk_login_audit_clinic_sql = IF(
  @clinics_table_exists = 0 OR @has_fk_login_audit_clinic > 0,
  'SELECT ''skip add fk_login_audit_clinic_id''',
  'ALTER TABLE login_audit_events ADD CONSTRAINT fk_login_audit_clinic_id FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE SET NULL'
);
PREPARE stmt_add_fk_login_audit_clinic FROM @add_fk_login_audit_clinic_sql;
EXECUTE stmt_add_fk_login_audit_clinic;
DEALLOCATE PREPARE stmt_add_fk_login_audit_clinic;

SET @has_fk_login_audit_branch = (
  SELECT COUNT(*)
  FROM information_schema.referential_constraints
  WHERE constraint_schema = @db_name
    AND table_name = 'login_audit_events'
    AND constraint_name = 'fk_login_audit_branch_id'
);

SET @add_fk_login_audit_branch_sql = IF(
  @clinic_branches_table_exists = 0 OR @has_fk_login_audit_branch > 0,
  'SELECT ''skip add fk_login_audit_branch_id''',
  'ALTER TABLE login_audit_events ADD CONSTRAINT fk_login_audit_branch_id FOREIGN KEY (branch_id) REFERENCES clinic_branches(id) ON DELETE SET NULL'
);
PREPARE stmt_add_fk_login_audit_branch FROM @add_fk_login_audit_branch_sql;
EXECUTE stmt_add_fk_login_audit_branch;
DEALLOCATE PREPARE stmt_add_fk_login_audit_branch;

-- appointments.decision_status
SET @has_appointments_decision_status = (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = @db_name
    AND table_name = 'appointments'
    AND column_name = 'decision_status'
);

SET @add_appointments_decision_status_sql = IF(
  @appointments_table_exists = 0 OR @has_appointments_decision_status > 0,
  'SELECT ''skip add appointments.decision_status''',
  "ALTER TABLE appointments ADD COLUMN decision_status VARCHAR(32) NOT NULL DEFAULT 'pending' AFTER status"
);
PREPARE stmt_add_appointments_decision_status FROM @add_appointments_decision_status_sql;
EXECUTE stmt_add_appointments_decision_status;
DEALLOCATE PREPARE stmt_add_appointments_decision_status;

-- appointments.decided_at
SET @has_appointments_decided_at = (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = @db_name
    AND table_name = 'appointments'
    AND column_name = 'decided_at'
);

SET @add_appointments_decided_at_sql = IF(
  @appointments_table_exists = 0 OR @has_appointments_decided_at > 0,
  'SELECT ''skip add appointments.decided_at''',
  'ALTER TABLE appointments ADD COLUMN decided_at DATETIME NULL AFTER decision_status'
);
PREPARE stmt_add_appointments_decided_at FROM @add_appointments_decided_at_sql;
EXECUTE stmt_add_appointments_decided_at;
DEALLOCATE PREPARE stmt_add_appointments_decided_at;

-- appointments.decided_by_user_id
SET @has_appointments_decided_by_user_id = (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = @db_name
    AND table_name = 'appointments'
    AND column_name = 'decided_by_user_id'
);

SET @add_appointments_decided_by_user_id_sql = IF(
  @appointments_table_exists = 0 OR @has_appointments_decided_by_user_id > 0,
  'SELECT ''skip add appointments.decided_by_user_id''',
  'ALTER TABLE appointments ADD COLUMN decided_by_user_id INT NULL AFTER decided_at'
);
PREPARE stmt_add_appointments_decided_by_user_id FROM @add_appointments_decided_by_user_id_sql;
EXECUTE stmt_add_appointments_decided_by_user_id;
DEALLOCATE PREPARE stmt_add_appointments_decided_by_user_id;

-- appointments.decline_reason
SET @has_appointments_decline_reason = (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = @db_name
    AND table_name = 'appointments'
    AND column_name = 'decline_reason'
);

SET @add_appointments_decline_reason_sql = IF(
  @appointments_table_exists = 0 OR @has_appointments_decline_reason > 0,
  'SELECT ''skip add appointments.decline_reason''',
  'ALTER TABLE appointments ADD COLUMN decline_reason VARCHAR(500) NULL AFTER decided_by_user_id'
);
PREPARE stmt_add_appointments_decline_reason FROM @add_appointments_decline_reason_sql;
EXECUTE stmt_add_appointments_decline_reason;
DEALLOCATE PREPARE stmt_add_appointments_decline_reason;

SET @backfill_appointments_decision_status_sql = IF(
  @appointments_table_exists = 0 OR @has_appointments_decision_status = 0,
  'SELECT ''skip backfill appointments.decision_status''',
  "UPDATE appointments
   SET decision_status = CASE
     WHEN LOWER(TRIM(COALESCE(status, ''))) IN ('declined', 'cancelled') THEN 'declined'
     ELSE 'pending'
   END
   WHERE decision_status IS NULL OR TRIM(decision_status) = ''"
);
PREPARE stmt_backfill_appointments_decision_status FROM @backfill_appointments_decision_status_sql;
EXECUTE stmt_backfill_appointments_decision_status;
DEALLOCATE PREPARE stmt_backfill_appointments_decision_status;

SET @has_appointments_decision_status_idx = (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = @db_name
    AND table_name = 'appointments'
    AND index_name = 'idx_appointments_decision_status'
);

SET @add_appointments_decision_status_idx_sql = IF(
  @appointments_table_exists = 0 OR @has_appointments_decision_status = 0 OR @has_appointments_decision_status_idx > 0,
  'SELECT ''skip add idx_appointments_decision_status''',
  'ALTER TABLE appointments ADD INDEX idx_appointments_decision_status (decision_status)'
);
PREPARE stmt_add_appointments_decision_status_idx FROM @add_appointments_decision_status_idx_sql;
EXECUTE stmt_add_appointments_decision_status_idx;
DEALLOCATE PREPARE stmt_add_appointments_decision_status_idx;

SET @has_appointments_decided_by_idx = (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = @db_name
    AND table_name = 'appointments'
    AND index_name = 'idx_appointments_decided_by_user_id'
);

SET @add_appointments_decided_by_idx_sql = IF(
  @appointments_table_exists = 0 OR @has_appointments_decided_by_user_id = 0 OR @has_appointments_decided_by_idx > 0,
  'SELECT ''skip add idx_appointments_decided_by_user_id''',
  'ALTER TABLE appointments ADD INDEX idx_appointments_decided_by_user_id (decided_by_user_id)'
);
PREPARE stmt_add_appointments_decided_by_idx FROM @add_appointments_decided_by_idx_sql;
EXECUTE stmt_add_appointments_decided_by_idx;
DEALLOCATE PREPARE stmt_add_appointments_decided_by_idx;

SET @has_fk_appointments_decided_by = (
  SELECT COUNT(*)
  FROM information_schema.referential_constraints
  WHERE constraint_schema = @db_name
    AND table_name = 'appointments'
    AND constraint_name = 'fk_appointments_decided_by_user_id'
);

SET @add_fk_appointments_decided_by_sql = IF(
  @users_table_exists = 0 OR @has_appointments_decided_by_user_id = 0 OR @has_fk_appointments_decided_by > 0,
  'SELECT ''skip add fk_appointments_decided_by_user_id''',
  'ALTER TABLE appointments ADD CONSTRAINT fk_appointments_decided_by_user_id FOREIGN KEY (decided_by_user_id) REFERENCES users(id) ON DELETE SET NULL'
);
PREPARE stmt_add_fk_appointments_decided_by FROM @add_fk_appointments_decided_by_sql;
EXECUTE stmt_add_fk_appointments_decided_by;
DEALLOCATE PREPARE stmt_add_fk_appointments_decided_by;

-- appointment_service_items table
SET @appointment_service_items_table_exists = (
  SELECT COUNT(*)
  FROM information_schema.tables
  WHERE table_schema = @db_name
    AND table_name = 'appointment_service_items'
);

SET @create_appointment_service_items_table_sql = IF(
  @appointments_table_exists = 0 OR @appointment_service_items_table_exists > 0,
  'SELECT ''skip create appointment_service_items''',
  "CREATE TABLE appointment_service_items (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    appointment_id INT NOT NULL,
    sequence_order INT NOT NULL,
    service_id INT NULL,
    service_name_snapshot VARCHAR(255) NOT NULL,
    dentist_id INT NOT NULL,
    duration_minutes INT NOT NULL DEFAULT 30,
    segment_start DATETIME NOT NULL,
    segment_end DATETIME NOT NULL,
    notes TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_appointment_service_items_order (appointment_id, sequence_order),
    INDEX idx_appointment_service_items_appointment (appointment_id),
    INDEX idx_appointment_service_items_dentist_time (dentist_id, segment_start, segment_end)
  )"
);
PREPARE stmt_create_appointment_service_items_table FROM @create_appointment_service_items_table_sql;
EXECUTE stmt_create_appointment_service_items_table;
DEALLOCATE PREPARE stmt_create_appointment_service_items_table;

SET @has_fk_service_items_appointment = (
  SELECT COUNT(*)
  FROM information_schema.referential_constraints
  WHERE constraint_schema = @db_name
    AND table_name = 'appointment_service_items'
    AND constraint_name = 'fk_appointment_service_items_appointment_id'
);

SET @add_fk_service_items_appointment_sql = IF(
  @appointments_table_exists = 0 OR @has_fk_service_items_appointment > 0,
  'SELECT ''skip add fk_appointment_service_items_appointment_id''',
  'ALTER TABLE appointment_service_items ADD CONSTRAINT fk_appointment_service_items_appointment_id FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE'
);
PREPARE stmt_add_fk_service_items_appointment FROM @add_fk_service_items_appointment_sql;
EXECUTE stmt_add_fk_service_items_appointment;
DEALLOCATE PREPARE stmt_add_fk_service_items_appointment;

SET @has_fk_service_items_dentist = (
  SELECT COUNT(*)
  FROM information_schema.referential_constraints
  WHERE constraint_schema = @db_name
    AND table_name = 'appointment_service_items'
    AND constraint_name = 'fk_appointment_service_items_dentist_id'
);

SET @add_fk_service_items_dentist_sql = IF(
  @dentists_table_exists = 0 OR @has_fk_service_items_dentist > 0,
  'SELECT ''skip add fk_appointment_service_items_dentist_id''',
  'ALTER TABLE appointment_service_items ADD CONSTRAINT fk_appointment_service_items_dentist_id FOREIGN KEY (dentist_id) REFERENCES dentists(id) ON DELETE RESTRICT'
);
PREPARE stmt_add_fk_service_items_dentist FROM @add_fk_service_items_dentist_sql;
EXECUTE stmt_add_fk_service_items_dentist;
DEALLOCATE PREPARE stmt_add_fk_service_items_dentist;

-- Verification snapshot
SELECT
  table_name,
  column_name,
  column_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = @db_name
  AND (
    (table_name = 'clinics' AND column_name IN ('status', 'suspended_at', 'deactivated_at', 'archived_at'))
    OR (table_name = 'clinic_branches' AND column_name IN ('status', 'suspended_at', 'deactivated_at', 'archived_at'))
    OR (table_name = 'appointments' AND column_name IN ('decision_status', 'decided_at', 'decided_by_user_id', 'decline_reason'))
  )
ORDER BY table_name, ordinal_position;

SELECT
  table_name,
  index_name,
  column_name
FROM information_schema.statistics
WHERE table_schema = @db_name
  AND table_name IN ('clinics', 'clinic_branches', 'appointments', 'login_audit_events', 'appointment_service_items')
  AND index_name IN (
    'idx_clinics_status',
    'idx_clinic_branches_status',
    'idx_appointments_decision_status',
    'idx_appointments_decided_by_user_id',
    'idx_login_audit_outcome_created',
    'idx_login_audit_user_created',
    'idx_login_audit_clinic_created',
    'idx_login_audit_branch_created',
    'idx_appointment_service_items_appointment',
    'idx_appointment_service_items_dentist_time'
  )
ORDER BY table_name, index_name, seq_in_index;
