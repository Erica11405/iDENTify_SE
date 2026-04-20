-- iDENTify-Web migration: add optional branch address
-- Date: 2026-04-20

SET @db_name = DATABASE();

SET @clinic_branches_table_exists = (
  SELECT COUNT(*)
  FROM information_schema.tables
  WHERE table_schema = @db_name
    AND table_name = 'clinic_branches'
);

SET @has_clinic_branches_address = (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = @db_name
    AND table_name = 'clinic_branches'
    AND column_name = 'address'
);

SET @add_clinic_branches_address_sql = IF(
  @clinic_branches_table_exists = 0 OR @has_clinic_branches_address > 0,
  'SELECT ''skip add clinic_branches.address''',
  "ALTER TABLE clinic_branches ADD COLUMN address VARCHAR(500) NULL AFTER code"
);
PREPARE stmt_add_clinic_branches_address FROM @add_clinic_branches_address_sql;
EXECUTE stmt_add_clinic_branches_address;
DEALLOCATE PREPARE stmt_add_clinic_branches_address;

SET @verify_clinic_branches_address_sql = IF(
  @clinic_branches_table_exists = 0,
  "SELECT 'skip verify clinic_branches.address (table missing)' AS status_message",
  "SELECT
     column_name,
     column_type,
     is_nullable,
     column_default
   FROM information_schema.columns
   WHERE table_schema = DATABASE()
     AND table_name = 'clinic_branches'
     AND column_name = 'address'"
);
PREPARE stmt_verify_clinic_branches_address FROM @verify_clinic_branches_address_sql;
EXECUTE stmt_verify_clinic_branches_address;
DEALLOCATE PREPARE stmt_verify_clinic_branches_address;
