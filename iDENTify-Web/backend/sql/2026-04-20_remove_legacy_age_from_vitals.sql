-- iDENTify-Web migration: remove legacy age key from patient vitals JSON
-- Date: 2026-04-20

SET @db_name = DATABASE();

SET @patient_annual_records_table_exists = (
  SELECT COUNT(*)
  FROM information_schema.tables
  WHERE table_schema = @db_name
    AND table_name = 'patient_annual_records'
);

SET @patient_annual_records_vitals_exists = (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = @db_name
    AND table_name = 'patient_annual_records'
    AND column_name = 'vitals'
);

SET @remove_legacy_age_sql = IF(
  @patient_annual_records_table_exists = 0 OR @patient_annual_records_vitals_exists = 0,
  'SELECT ''skip remove vitals.age (table or column missing)''',
  "UPDATE patient_annual_records
   SET vitals = JSON_REMOVE(vitals, '$.age')
   WHERE vitals IS NOT NULL
     AND JSON_VALID(vitals)
     AND JSON_CONTAINS_PATH(vitals, 'one', '$.age')"
);
PREPARE stmt_remove_legacy_age FROM @remove_legacy_age_sql;
EXECUTE stmt_remove_legacy_age;
DEALLOCATE PREPARE stmt_remove_legacy_age;

SET @verify_legacy_age_sql = IF(
  @patient_annual_records_table_exists = 0 OR @patient_annual_records_vitals_exists = 0,
  "SELECT 'skip verify vitals.age cleanup' AS status_message",
  "SELECT COUNT(*) AS remaining_age_keys
   FROM patient_annual_records
   WHERE vitals IS NOT NULL
     AND JSON_VALID(vitals)
     AND JSON_CONTAINS_PATH(vitals, 'one', '$.age')"
);
PREPARE stmt_verify_legacy_age FROM @verify_legacy_age_sql;
EXECUTE stmt_verify_legacy_age;
DEALLOCATE PREPARE stmt_verify_legacy_age;