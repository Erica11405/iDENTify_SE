-- iDENTify-Web migration: add treatment-session linkage for medications
-- Date: 2026-04-14

SET @db_name = DATABASE();

-- 1) Add medications.treatment_id if missing
SET @has_treatment_column = (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = @db_name
    AND table_name = 'medications'
    AND column_name = 'treatment_id'
);

SET @add_column_sql = IF(
  @has_treatment_column > 0,
  'SELECT ''skip add medications.treatment_id''',
  'ALTER TABLE medications ADD COLUMN treatment_id INT NULL AFTER patient_id'
);
PREPARE stmt_add_column FROM @add_column_sql;
EXECUTE stmt_add_column;
DEALLOCATE PREPARE stmt_add_column;

-- 2) Add lookup index for treatment_id if missing
SET @has_index_treatment = (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = @db_name
    AND table_name = 'medications'
    AND index_name = 'idx_medications_treatment_id'
);

SET @add_index_sql = IF(
  @has_index_treatment > 0,
  'SELECT ''skip create idx_medications_treatment_id''',
  'CREATE INDEX idx_medications_treatment_id ON medications(treatment_id)'
);
PREPARE stmt_add_index FROM @add_index_sql;
EXECUTE stmt_add_index;
DEALLOCATE PREPARE stmt_add_index;

-- 3) Add FK to treatment_timeline if missing
SET @has_fk_treatment = (
  SELECT COUNT(*)
  FROM information_schema.KEY_COLUMN_USAGE kcu
  WHERE kcu.TABLE_SCHEMA = @db_name
    AND kcu.TABLE_NAME = 'medications'
    AND kcu.COLUMN_NAME = 'treatment_id'
    AND kcu.REFERENCED_TABLE_NAME = 'treatment_timeline'
);

SET @add_fk_sql = IF(
  @has_fk_treatment > 0,
  'SELECT ''skip create fk_medications_treatment''',
  'ALTER TABLE medications ADD CONSTRAINT fk_medications_treatment FOREIGN KEY (treatment_id) REFERENCES treatment_timeline(id) ON DELETE SET NULL'
);
PREPARE stmt_add_fk FROM @add_fk_sql;
EXECUTE stmt_add_fk;
DEALLOCATE PREPARE stmt_add_fk;

-- 4) Verify
SELECT
  c.column_name,
  c.column_type,
  c.is_nullable
FROM information_schema.columns c
WHERE c.table_schema = @db_name
  AND c.table_name = 'medications'
  AND c.column_name IN ('patient_id', 'treatment_id', 'record_year')
ORDER BY c.ordinal_position;

SELECT
  kcu.constraint_name,
  kcu.column_name,
  kcu.referenced_table_name,
  kcu.referenced_column_name
FROM information_schema.key_column_usage kcu
WHERE kcu.table_schema = @db_name
  AND kcu.table_name = 'medications'
  AND kcu.referenced_table_name IS NOT NULL
ORDER BY kcu.constraint_name;
