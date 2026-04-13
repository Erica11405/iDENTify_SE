-- iDENTify-Web migration: split payments support + PH timezone session guidance
-- Date: 2026-04-13

-- 1) Optional per-session timezone for manual SQL checks (DBeaver/testing)
SET SESSION time_zone = '+08:00';

-- 2) Resolve DB name
SET @db_name = DATABASE();

-- 3) Drop child-side FK constraints first (required before dropping indexes used by FK checks)
SET @fk_appointment = (
  SELECT kcu.CONSTRAINT_NAME
  FROM information_schema.KEY_COLUMN_USAGE kcu
  WHERE kcu.TABLE_SCHEMA = @db_name
    AND kcu.TABLE_NAME = 'payment_records'
    AND kcu.COLUMN_NAME = 'appointment_id'
    AND kcu.REFERENCED_TABLE_NAME = 'appointments'
  LIMIT 1
);

SET @drop_fk_appointment_sql = IF(
  @fk_appointment IS NULL OR @fk_appointment = '',
  'SELECT ''skip drop fk appointment_id''',
  CONCAT('ALTER TABLE payment_records DROP FOREIGN KEY `', REPLACE(@fk_appointment, '`', '``'), '`')
);
PREPARE stmt_drop_fk_appointment FROM @drop_fk_appointment_sql;
EXECUTE stmt_drop_fk_appointment;
DEALLOCATE PREPARE stmt_drop_fk_appointment;

SET @fk_queue = (
  SELECT kcu.CONSTRAINT_NAME
  FROM information_schema.KEY_COLUMN_USAGE kcu
  WHERE kcu.TABLE_SCHEMA = @db_name
    AND kcu.TABLE_NAME = 'payment_records'
    AND kcu.COLUMN_NAME = 'queue_id'
    AND kcu.REFERENCED_TABLE_NAME = 'walk_in_queue'
  LIMIT 1
);

SET @drop_fk_queue_sql = IF(
  @fk_queue IS NULL OR @fk_queue = '',
  'SELECT ''skip drop fk queue_id''',
  CONCAT('ALTER TABLE payment_records DROP FOREIGN KEY `', REPLACE(@fk_queue, '`', '``'), '`')
);
PREPARE stmt_drop_fk_queue FROM @drop_fk_queue_sql;
EXECUTE stmt_drop_fk_queue;
DEALLOCATE PREPARE stmt_drop_fk_queue;

-- 4) Drop old unique queue/appointment indexes if they exist

SET @drop_uq_queue_sql = (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM information_schema.statistics
      WHERE table_schema = @db_name
        AND table_name = 'payment_records'
        AND index_name = 'uniq_payment_queue'
    ),
    'ALTER TABLE payment_records DROP INDEX uniq_payment_queue',
    'SELECT ''skip drop uniq_payment_queue'''
  )
);
PREPARE stmt_drop_uq_queue FROM @drop_uq_queue_sql;
EXECUTE stmt_drop_uq_queue;
DEALLOCATE PREPARE stmt_drop_uq_queue;

SET @drop_uq_appointment_sql = (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM information_schema.statistics
      WHERE table_schema = @db_name
        AND table_name = 'payment_records'
        AND index_name = 'uniq_payment_appointment'
    ),
    'ALTER TABLE payment_records DROP INDEX uniq_payment_appointment',
    'SELECT ''skip drop uniq_payment_appointment'''
  )
);
PREPARE stmt_drop_uq_appointment FROM @drop_uq_appointment_sql;
EXECUTE stmt_drop_uq_appointment;
DEALLOCATE PREPARE stmt_drop_uq_appointment;

-- 5) Ensure non-unique indexes exist for lookup performance
SET @create_idx_queue_sql = (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM information_schema.statistics
      WHERE table_schema = @db_name
        AND table_name = 'payment_records'
        AND index_name = 'idx_payment_queue'
    ),
    'SELECT ''skip create idx_payment_queue''',
    'CREATE INDEX idx_payment_queue ON payment_records(queue_id)'
  )
);
PREPARE stmt_create_idx_queue FROM @create_idx_queue_sql;
EXECUTE stmt_create_idx_queue;
DEALLOCATE PREPARE stmt_create_idx_queue;

SET @create_idx_appointment_sql = (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM information_schema.statistics
      WHERE table_schema = @db_name
        AND table_name = 'payment_records'
        AND index_name = 'idx_payment_appointment'
    ),
    'SELECT ''skip create idx_payment_appointment''',
    'CREATE INDEX idx_payment_appointment ON payment_records(appointment_id)'
  )
);
PREPARE stmt_create_idx_appointment FROM @create_idx_appointment_sql;
EXECUTE stmt_create_idx_appointment;
DEALLOCATE PREPARE stmt_create_idx_appointment;

-- 6) Recreate FK constraints only if missing
SET @has_fk_appointment = (
  SELECT COUNT(*)
  FROM information_schema.KEY_COLUMN_USAGE kcu
  WHERE kcu.TABLE_SCHEMA = @db_name
    AND kcu.TABLE_NAME = 'payment_records'
    AND kcu.COLUMN_NAME = 'appointment_id'
    AND kcu.REFERENCED_TABLE_NAME = 'appointments'
);

SET @create_fk_appointment_sql = IF(
  @has_fk_appointment > 0,
  'SELECT ''skip create fk_payment_records_appointment''',
  'ALTER TABLE payment_records ADD CONSTRAINT fk_payment_records_appointment FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL'
);
PREPARE stmt_create_fk_appointment FROM @create_fk_appointment_sql;
EXECUTE stmt_create_fk_appointment;
DEALLOCATE PREPARE stmt_create_fk_appointment;

SET @has_fk_queue = (
  SELECT COUNT(*)
  FROM information_schema.KEY_COLUMN_USAGE kcu
  WHERE kcu.TABLE_SCHEMA = @db_name
    AND kcu.TABLE_NAME = 'payment_records'
    AND kcu.COLUMN_NAME = 'queue_id'
    AND kcu.REFERENCED_TABLE_NAME = 'walk_in_queue'
);

SET @create_fk_queue_sql = IF(
  @has_fk_queue > 0,
  'SELECT ''skip create fk_payment_records_queue''',
  'ALTER TABLE payment_records ADD CONSTRAINT fk_payment_records_queue FOREIGN KEY (queue_id) REFERENCES walk_in_queue(id) ON DELETE SET NULL'
);
PREPARE stmt_create_fk_queue FROM @create_fk_queue_sql;
EXECUTE stmt_create_fk_queue;
DEALLOCATE PREPARE stmt_create_fk_queue;

-- 7) Verify resulting indexes + FK constraints
SELECT
  s.index_name,
  s.non_unique,
  s.column_name
FROM information_schema.statistics s
WHERE s.table_schema = @db_name
  AND s.table_name = 'payment_records'
  AND s.index_name IN (
    'uniq_payment_queue',
    'uniq_payment_appointment',
    'idx_payment_queue',
    'idx_payment_appointment'
  )
ORDER BY s.index_name, s.seq_in_index;

SELECT
  kcu.constraint_name,
  kcu.column_name,
  kcu.referenced_table_name,
  kcu.referenced_column_name
FROM information_schema.key_column_usage kcu
WHERE kcu.table_schema = @db_name
  AND kcu.table_name = 'payment_records'
  AND kcu.referenced_table_name IS NOT NULL
ORDER BY kcu.constraint_name, kcu.ordinal_position;
