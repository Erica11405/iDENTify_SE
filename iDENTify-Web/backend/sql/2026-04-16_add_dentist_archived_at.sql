-- iDENTify-Web migration: add archived_at tracking for dentists
-- Date: 2026-04-16

SET @db_name = DATABASE();

-- 1) Add dentists.is_archived if missing
SET @has_is_archived = (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = @db_name
    AND table_name = 'dentists'
    AND column_name = 'is_archived'
);

SET @add_is_archived_sql = IF(
  @has_is_archived > 0,
  'SELECT ''skip add dentists.is_archived''',
  'ALTER TABLE dentists ADD COLUMN is_archived TINYINT(1) NOT NULL DEFAULT 0 AFTER status'
);
PREPARE stmt_add_is_archived FROM @add_is_archived_sql;
EXECUTE stmt_add_is_archived;
DEALLOCATE PREPARE stmt_add_is_archived;

-- 2) Add dentists.archived_at if missing
SET @has_archived_at = (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = @db_name
    AND table_name = 'dentists'
    AND column_name = 'archived_at'
);

SET @add_archived_at_sql = IF(
  @has_archived_at > 0,
  'SELECT ''skip add dentists.archived_at''',
  'ALTER TABLE dentists ADD COLUMN archived_at DATETIME NULL AFTER is_archived'
);
PREPARE stmt_add_archived_at FROM @add_archived_at_sql;
EXECUTE stmt_add_archived_at;
DEALLOCATE PREPARE stmt_add_archived_at;

-- 3) Backfill archived_at for currently archived dentists if both columns are present
SET @has_is_archived = (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = @db_name
    AND table_name = 'dentists'
    AND column_name = 'is_archived'
);

SET @has_archived_at = (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = @db_name
    AND table_name = 'dentists'
    AND column_name = 'archived_at'
);

SET @backfill_archived_at_sql = IF(
  @has_is_archived > 0 AND @has_archived_at > 0,
  'UPDATE dentists SET archived_at = COALESCE(archived_at, NOW()) WHERE COALESCE(is_archived, 0) = 1',
  'SELECT ''skip backfill dentists.archived_at'''
);
PREPARE stmt_backfill_archived_at FROM @backfill_archived_at_sql;
EXECUTE stmt_backfill_archived_at;
DEALLOCATE PREPARE stmt_backfill_archived_at;

-- 4) Verify columns and archived state snapshot
SELECT
  c.column_name,
  c.column_type,
  c.is_nullable,
  c.column_default
FROM information_schema.columns c
WHERE c.table_schema = @db_name
  AND c.table_name = 'dentists'
  AND c.column_name IN ('is_archived', 'archived_at')
ORDER BY c.ordinal_position;

SELECT
  COUNT(*) AS total_dentists,
  SUM(CASE WHEN COALESCE(is_archived, 0) = 1 THEN 1 ELSE 0 END) AS archived_dentists,
  SUM(CASE WHEN COALESCE(is_archived, 0) = 1 AND archived_at IS NOT NULL THEN 1 ELSE 0 END) AS archived_with_timestamp
FROM dentists;