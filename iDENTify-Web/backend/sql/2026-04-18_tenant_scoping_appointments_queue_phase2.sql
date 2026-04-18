-- iDENTify-Web migration: tenant scoping columns for appointments and queue
-- Date: 2026-04-18

SET @db_name = DATABASE();

-- --- appointments table guards ---
SET @appointments_table_exists = (
  SELECT COUNT(*)
  FROM information_schema.tables
  WHERE table_schema = @db_name
    AND table_name = 'appointments'
);

SET @appointments_has_clinic_id = (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = @db_name
    AND table_name = 'appointments'
    AND column_name = 'clinic_id'
);

SET @appointments_has_branch_id = (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = @db_name
    AND table_name = 'appointments'
    AND column_name = 'branch_id'
);

SET @appointments_add_clinic_id_sql = IF(
  @appointments_table_exists = 0 OR @appointments_has_clinic_id > 0,
  'SELECT ''skip add appointments.clinic_id''',
  'ALTER TABLE appointments ADD COLUMN clinic_id INT NULL AFTER dentist_id'
);
PREPARE stmt_appointments_add_clinic_id FROM @appointments_add_clinic_id_sql;
EXECUTE stmt_appointments_add_clinic_id;
DEALLOCATE PREPARE stmt_appointments_add_clinic_id;

SET @appointments_add_branch_id_sql = IF(
  @appointments_table_exists = 0 OR @appointments_has_branch_id > 0,
  'SELECT ''skip add appointments.branch_id''',
  'ALTER TABLE appointments ADD COLUMN branch_id INT NULL AFTER clinic_id'
);
PREPARE stmt_appointments_add_branch_id FROM @appointments_add_branch_id_sql;
EXECUTE stmt_appointments_add_branch_id;
DEALLOCATE PREPARE stmt_appointments_add_branch_id;

SET @appointments_has_clinic_idx = (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = @db_name
    AND table_name = 'appointments'
    AND index_name = 'idx_appointments_clinic_id'
);

SET @appointments_has_branch_idx = (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = @db_name
    AND table_name = 'appointments'
    AND index_name = 'idx_appointments_branch_id'
);

SET @appointments_add_clinic_idx_sql = IF(
  @appointments_table_exists = 0 OR @appointments_has_clinic_idx > 0,
  'SELECT ''skip add idx_appointments_clinic_id''',
  'ALTER TABLE appointments ADD INDEX idx_appointments_clinic_id (clinic_id)'
);
PREPARE stmt_appointments_add_clinic_idx FROM @appointments_add_clinic_idx_sql;
EXECUTE stmt_appointments_add_clinic_idx;
DEALLOCATE PREPARE stmt_appointments_add_clinic_idx;

SET @appointments_add_branch_idx_sql = IF(
  @appointments_table_exists = 0 OR @appointments_has_branch_idx > 0,
  'SELECT ''skip add idx_appointments_branch_id''',
  'ALTER TABLE appointments ADD INDEX idx_appointments_branch_id (branch_id)'
);
PREPARE stmt_appointments_add_branch_idx FROM @appointments_add_branch_idx_sql;
EXECUTE stmt_appointments_add_branch_idx;
DEALLOCATE PREPARE stmt_appointments_add_branch_idx;

SET @appointments_has_fk_clinic = (
  SELECT COUNT(*)
  FROM information_schema.referential_constraints
  WHERE constraint_schema = @db_name
    AND table_name = 'appointments'
    AND constraint_name = 'fk_appointments_clinic_id'
);

SET @appointments_has_fk_branch = (
  SELECT COUNT(*)
  FROM information_schema.referential_constraints
  WHERE constraint_schema = @db_name
    AND table_name = 'appointments'
    AND constraint_name = 'fk_appointments_branch_id'
);

SET @appointments_add_fk_clinic_sql = IF(
  @appointments_table_exists = 0 OR @appointments_has_fk_clinic > 0,
  'SELECT ''skip add fk_appointments_clinic_id''',
  'ALTER TABLE appointments ADD CONSTRAINT fk_appointments_clinic_id FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE SET NULL'
);
PREPARE stmt_appointments_add_fk_clinic FROM @appointments_add_fk_clinic_sql;
EXECUTE stmt_appointments_add_fk_clinic;
DEALLOCATE PREPARE stmt_appointments_add_fk_clinic;

SET @appointments_add_fk_branch_sql = IF(
  @appointments_table_exists = 0 OR @appointments_has_fk_branch > 0,
  'SELECT ''skip add fk_appointments_branch_id''',
  'ALTER TABLE appointments ADD CONSTRAINT fk_appointments_branch_id FOREIGN KEY (branch_id) REFERENCES clinic_branches(id) ON DELETE SET NULL'
);
PREPARE stmt_appointments_add_fk_branch FROM @appointments_add_fk_branch_sql;
EXECUTE stmt_appointments_add_fk_branch;
DEALLOCATE PREPARE stmt_appointments_add_fk_branch;

-- --- walk_in_queue table guards ---
SET @queue_table_exists = (
  SELECT COUNT(*)
  FROM information_schema.tables
  WHERE table_schema = @db_name
    AND table_name = 'walk_in_queue'
);

SET @queue_has_clinic_id = (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = @db_name
    AND table_name = 'walk_in_queue'
    AND column_name = 'clinic_id'
);

SET @queue_has_branch_id = (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = @db_name
    AND table_name = 'walk_in_queue'
    AND column_name = 'branch_id'
);

SET @queue_add_clinic_id_sql = IF(
  @queue_table_exists = 0 OR @queue_has_clinic_id > 0,
  'SELECT ''skip add walk_in_queue.clinic_id''',
  'ALTER TABLE walk_in_queue ADD COLUMN clinic_id INT NULL AFTER dentist_id'
);
PREPARE stmt_queue_add_clinic_id FROM @queue_add_clinic_id_sql;
EXECUTE stmt_queue_add_clinic_id;
DEALLOCATE PREPARE stmt_queue_add_clinic_id;

SET @queue_add_branch_id_sql = IF(
  @queue_table_exists = 0 OR @queue_has_branch_id > 0,
  'SELECT ''skip add walk_in_queue.branch_id''',
  'ALTER TABLE walk_in_queue ADD COLUMN branch_id INT NULL AFTER clinic_id'
);
PREPARE stmt_queue_add_branch_id FROM @queue_add_branch_id_sql;
EXECUTE stmt_queue_add_branch_id;
DEALLOCATE PREPARE stmt_queue_add_branch_id;

SET @queue_has_clinic_idx = (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = @db_name
    AND table_name = 'walk_in_queue'
    AND index_name = 'idx_queue_clinic_id'
);

SET @queue_has_branch_idx = (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = @db_name
    AND table_name = 'walk_in_queue'
    AND index_name = 'idx_queue_branch_id'
);

SET @queue_add_clinic_idx_sql = IF(
  @queue_table_exists = 0 OR @queue_has_clinic_idx > 0,
  'SELECT ''skip add idx_queue_clinic_id''',
  'ALTER TABLE walk_in_queue ADD INDEX idx_queue_clinic_id (clinic_id)'
);
PREPARE stmt_queue_add_clinic_idx FROM @queue_add_clinic_idx_sql;
EXECUTE stmt_queue_add_clinic_idx;
DEALLOCATE PREPARE stmt_queue_add_clinic_idx;

SET @queue_add_branch_idx_sql = IF(
  @queue_table_exists = 0 OR @queue_has_branch_idx > 0,
  'SELECT ''skip add idx_queue_branch_id''',
  'ALTER TABLE walk_in_queue ADD INDEX idx_queue_branch_id (branch_id)'
);
PREPARE stmt_queue_add_branch_idx FROM @queue_add_branch_idx_sql;
EXECUTE stmt_queue_add_branch_idx;
DEALLOCATE PREPARE stmt_queue_add_branch_idx;

SET @queue_has_fk_clinic = (
  SELECT COUNT(*)
  FROM information_schema.referential_constraints
  WHERE constraint_schema = @db_name
    AND table_name = 'walk_in_queue'
    AND constraint_name = 'fk_queue_clinic_id'
);

SET @queue_has_fk_branch = (
  SELECT COUNT(*)
  FROM information_schema.referential_constraints
  WHERE constraint_schema = @db_name
    AND table_name = 'walk_in_queue'
    AND constraint_name = 'fk_queue_branch_id'
);

SET @queue_add_fk_clinic_sql = IF(
  @queue_table_exists = 0 OR @queue_has_fk_clinic > 0,
  'SELECT ''skip add fk_queue_clinic_id''',
  'ALTER TABLE walk_in_queue ADD CONSTRAINT fk_queue_clinic_id FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE SET NULL'
);
PREPARE stmt_queue_add_fk_clinic FROM @queue_add_fk_clinic_sql;
EXECUTE stmt_queue_add_fk_clinic;
DEALLOCATE PREPARE stmt_queue_add_fk_clinic;

SET @queue_add_fk_branch_sql = IF(
  @queue_table_exists = 0 OR @queue_has_fk_branch > 0,
  'SELECT ''skip add fk_queue_branch_id''',
  'ALTER TABLE walk_in_queue ADD CONSTRAINT fk_queue_branch_id FOREIGN KEY (branch_id) REFERENCES clinic_branches(id) ON DELETE SET NULL'
);
PREPARE stmt_queue_add_fk_branch FROM @queue_add_fk_branch_sql;
EXECUTE stmt_queue_add_fk_branch;
DEALLOCATE PREPARE stmt_queue_add_fk_branch;

-- Verification snapshot
SELECT
  table_name,
  column_name,
  column_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = @db_name
  AND table_name IN ('appointments', 'walk_in_queue')
  AND column_name IN ('clinic_id', 'branch_id')
ORDER BY table_name, ordinal_position;
