-- iDENTify-Web migration: Add rescheduling and follow-up tracking to appointments
-- Date: 2026-04-26

SET @db_name = DATABASE();

-- appointments.rescheduled_count
SET @has_rescheduled_count = (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = @db_name
    AND table_name = 'appointments'
    AND column_name = 'rescheduled_count'
);

SET @add_rescheduled_count_sql = IF(
  @has_rescheduled_count > 0,
  'SELECT ''skip add appointments.rescheduled_count''',
  'ALTER TABLE appointments ADD COLUMN rescheduled_count INT DEFAULT 0 AFTER decline_reason'
);
PREPARE stmt_add_rescheduled_count FROM @add_rescheduled_count_sql;
EXECUTE stmt_add_rescheduled_count;
DEALLOCATE PREPARE stmt_add_rescheduled_count;

-- appointments.is_follow_up
SET @has_is_follow_up = (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = @db_name
    AND table_name = 'appointments'
    AND column_name = 'is_follow_up'
);

SET @add_is_follow_up_sql = IF(
  @has_is_follow_up > 0,
  'SELECT ''skip add appointments.is_follow_up''',
  'ALTER TABLE appointments ADD COLUMN is_follow_up TINYINT(1) DEFAULT 0 AFTER rescheduled_count'
);
PREPARE stmt_add_is_follow_up FROM @add_is_follow_up_sql;
EXECUTE stmt_add_is_follow_up;
DEALLOCATE PREPARE stmt_add_is_follow_up;

-- appointments.original_datetime
SET @has_original_datetime = (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = @db_name
    AND table_name = 'appointments'
    AND column_name = 'original_datetime'
);

SET @add_original_datetime_sql = IF(
  @has_original_datetime > 0,
  'SELECT ''skip add appointments.original_datetime''',
  'ALTER TABLE appointments ADD COLUMN original_datetime DATETIME NULL AFTER is_follow_up'
);
PREPARE stmt_add_original_datetime FROM @add_original_datetime_sql;
EXECUTE stmt_add_original_datetime;
DEALLOCATE PREPARE stmt_add_original_datetime;
