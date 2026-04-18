-- iDENTify-Web migration: tenant foundation + first-login password policy
-- Date: 2026-04-18

SET @db_name = DATABASE();

-- 1) Core tenant tables (safe to run multiple times)
CREATE TABLE IF NOT EXISTS clinics (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(64) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_clinics_name (name)
);

CREATE TABLE IF NOT EXISTS clinic_branches (
  id INT AUTO_INCREMENT PRIMARY KEY,
  clinic_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(64) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_clinic_branch_name (clinic_id, name),
  INDEX idx_branch_clinic (clinic_id),
  CONSTRAINT fk_clinic_branches_clinic
    FOREIGN KEY (clinic_id) REFERENCES clinics(id)
    ON DELETE CASCADE
);

-- 2) Users table guard
SET @users_table_exists = (
  SELECT COUNT(*)
  FROM information_schema.tables
  WHERE table_schema = @db_name
    AND table_name = 'users'
);

-- 3) Add users.password_change_required if missing
SET @has_password_change_required = (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = @db_name
    AND table_name = 'users'
    AND column_name = 'password_change_required'
);

SET @add_password_change_required_sql = IF(
  @users_table_exists = 0 OR @has_password_change_required > 0,
  'SELECT ''skip add users.password_change_required''',
  'ALTER TABLE users ADD COLUMN password_change_required TINYINT(1) NOT NULL DEFAULT 0 AFTER password_hash'
);
PREPARE stmt_add_password_change_required FROM @add_password_change_required_sql;
EXECUTE stmt_add_password_change_required;
DEALLOCATE PREPARE stmt_add_password_change_required;

-- 4) Add users.clinic_id if missing
SET @has_users_clinic_id = (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = @db_name
    AND table_name = 'users'
    AND column_name = 'clinic_id'
);

SET @add_users_clinic_id_sql = IF(
  @users_table_exists = 0 OR @has_users_clinic_id > 0,
  'SELECT ''skip add users.clinic_id''',
  'ALTER TABLE users ADD COLUMN clinic_id INT NULL AFTER dentist_id'
);
PREPARE stmt_add_users_clinic_id FROM @add_users_clinic_id_sql;
EXECUTE stmt_add_users_clinic_id;
DEALLOCATE PREPARE stmt_add_users_clinic_id;

-- 5) Add users.branch_id if missing
SET @has_users_branch_id = (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = @db_name
    AND table_name = 'users'
    AND column_name = 'branch_id'
);

SET @add_users_branch_id_sql = IF(
  @users_table_exists = 0 OR @has_users_branch_id > 0,
  'SELECT ''skip add users.branch_id''',
  'ALTER TABLE users ADD COLUMN branch_id INT NULL AFTER clinic_id'
);
PREPARE stmt_add_users_branch_id FROM @add_users_branch_id_sql;
EXECUTE stmt_add_users_branch_id;
DEALLOCATE PREPARE stmt_add_users_branch_id;

-- 6) Add users.clinic_id index if needed
SET @has_users_clinic_idx = (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = @db_name
    AND table_name = 'users'
    AND index_name = 'idx_users_clinic_id'
);

SET @add_users_clinic_idx_sql = IF(
  @users_table_exists = 0 OR @has_users_clinic_idx > 0 OR @has_users_clinic_id = 0,
  'SELECT ''skip add idx_users_clinic_id''',
  'ALTER TABLE users ADD INDEX idx_users_clinic_id (clinic_id)'
);
PREPARE stmt_add_users_clinic_idx FROM @add_users_clinic_idx_sql;
EXECUTE stmt_add_users_clinic_idx;
DEALLOCATE PREPARE stmt_add_users_clinic_idx;

-- 7) Add users.branch_id index if needed
SET @has_users_branch_idx = (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = @db_name
    AND table_name = 'users'
    AND index_name = 'idx_users_branch_id'
);

SET @add_users_branch_idx_sql = IF(
  @users_table_exists = 0 OR @has_users_branch_idx > 0 OR @has_users_branch_id = 0,
  'SELECT ''skip add idx_users_branch_id''',
  'ALTER TABLE users ADD INDEX idx_users_branch_id (branch_id)'
);
PREPARE stmt_add_users_branch_idx FROM @add_users_branch_idx_sql;
EXECUTE stmt_add_users_branch_idx;
DEALLOCATE PREPARE stmt_add_users_branch_idx;

-- 8) Add users -> clinics FK when possible
SET @has_fk_users_clinic = (
  SELECT COUNT(*)
  FROM information_schema.referential_constraints
  WHERE constraint_schema = @db_name
    AND table_name = 'users'
    AND constraint_name = 'fk_users_clinic_id'
);

SET @add_fk_users_clinic_sql = IF(
  @users_table_exists = 0 OR @has_users_clinic_id = 0 OR @has_fk_users_clinic > 0,
  'SELECT ''skip add fk_users_clinic_id''',
  'ALTER TABLE users ADD CONSTRAINT fk_users_clinic_id FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE SET NULL'
);
PREPARE stmt_add_fk_users_clinic FROM @add_fk_users_clinic_sql;
EXECUTE stmt_add_fk_users_clinic;
DEALLOCATE PREPARE stmt_add_fk_users_clinic;

-- 9) Add users -> clinic_branches FK when possible
SET @has_fk_users_branch = (
  SELECT COUNT(*)
  FROM information_schema.referential_constraints
  WHERE constraint_schema = @db_name
    AND table_name = 'users'
    AND constraint_name = 'fk_users_branch_id'
);

SET @add_fk_users_branch_sql = IF(
  @users_table_exists = 0 OR @has_users_branch_id = 0 OR @has_fk_users_branch > 0,
  'SELECT ''skip add fk_users_branch_id''',
  'ALTER TABLE users ADD CONSTRAINT fk_users_branch_id FOREIGN KEY (branch_id) REFERENCES clinic_branches(id) ON DELETE SET NULL'
);
PREPARE stmt_add_fk_users_branch FROM @add_fk_users_branch_sql;
EXECUTE stmt_add_fk_users_branch;
DEALLOCATE PREPARE stmt_add_fk_users_branch;

-- 10) Verification snapshot
SELECT
  table_name,
  column_name,
  column_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = @db_name
  AND table_name = 'users'
  AND column_name IN ('password_change_required', 'clinic_id', 'branch_id')
ORDER BY ordinal_position;

SELECT
  c.id,
  c.name,
  c.is_active,
  COUNT(cb.id) AS branch_count
FROM clinics c
LEFT JOIN clinic_branches cb ON cb.clinic_id = c.id
GROUP BY c.id, c.name, c.is_active
ORDER BY c.name ASC;
