-- iDENTify-Web migration: superadmin approval workflow foundation
-- Date: 2026-04-19

SET @db_name = DATABASE();

SET @users_table_exists = (
  SELECT COUNT(*)
  FROM information_schema.tables
  WHERE table_schema = @db_name
    AND table_name = 'users'
);

-- users.approval_status
SET @has_users_approval_status = (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = @db_name
    AND table_name = 'users'
    AND column_name = 'approval_status'
);

SET @add_users_approval_status_sql = IF(
  @users_table_exists = 0 OR @has_users_approval_status > 0,
  'SELECT ''skip add users.approval_status''',
  "ALTER TABLE users ADD COLUMN approval_status VARCHAR(32) NOT NULL DEFAULT 'approved' AFTER is_archived"
);
PREPARE stmt_add_users_approval_status FROM @add_users_approval_status_sql;
EXECUTE stmt_add_users_approval_status;
DEALLOCATE PREPARE stmt_add_users_approval_status;

-- users.approved_at
SET @has_users_approved_at = (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = @db_name
    AND table_name = 'users'
    AND column_name = 'approved_at'
);

SET @add_users_approved_at_sql = IF(
  @users_table_exists = 0 OR @has_users_approved_at > 0,
  'SELECT ''skip add users.approved_at''',
  "ALTER TABLE users ADD COLUMN approved_at DATETIME NULL AFTER approval_status"
);
PREPARE stmt_add_users_approved_at FROM @add_users_approved_at_sql;
EXECUTE stmt_add_users_approved_at;
DEALLOCATE PREPARE stmt_add_users_approved_at;

-- users.approved_by_user_id
SET @has_users_approved_by_user_id = (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = @db_name
    AND table_name = 'users'
    AND column_name = 'approved_by_user_id'
);

SET @add_users_approved_by_user_id_sql = IF(
  @users_table_exists = 0 OR @has_users_approved_by_user_id > 0,
  'SELECT ''skip add users.approved_by_user_id''',
  "ALTER TABLE users ADD COLUMN approved_by_user_id INT NULL AFTER approved_at"
);
PREPARE stmt_add_users_approved_by_user_id FROM @add_users_approved_by_user_id_sql;
EXECUTE stmt_add_users_approved_by_user_id;
DEALLOCATE PREPARE stmt_add_users_approved_by_user_id;

-- users.declined_at
SET @has_users_declined_at = (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = @db_name
    AND table_name = 'users'
    AND column_name = 'declined_at'
);

SET @add_users_declined_at_sql = IF(
  @users_table_exists = 0 OR @has_users_declined_at > 0,
  'SELECT ''skip add users.declined_at''',
  "ALTER TABLE users ADD COLUMN declined_at DATETIME NULL AFTER approved_by_user_id"
);
PREPARE stmt_add_users_declined_at FROM @add_users_declined_at_sql;
EXECUTE stmt_add_users_declined_at;
DEALLOCATE PREPARE stmt_add_users_declined_at;

-- users.decline_reason
SET @has_users_decline_reason = (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = @db_name
    AND table_name = 'users'
    AND column_name = 'decline_reason'
);

SET @add_users_decline_reason_sql = IF(
  @users_table_exists = 0 OR @has_users_decline_reason > 0,
  'SELECT ''skip add users.decline_reason''',
  "ALTER TABLE users ADD COLUMN decline_reason VARCHAR(500) NULL AFTER declined_at"
);
PREPARE stmt_add_users_decline_reason FROM @add_users_decline_reason_sql;
EXECUTE stmt_add_users_decline_reason;
DEALLOCATE PREPARE stmt_add_users_decline_reason;

-- Backfill existing users to approved where missing.
SET @backfill_users_approval_status_sql = IF(
  @users_table_exists = 0,
  'SELECT ''skip backfill users.approval_status''',
  "UPDATE users
   SET approval_status = 'approved'
   WHERE approval_status IS NULL OR TRIM(approval_status) = ''"
);
PREPARE stmt_backfill_users_approval_status FROM @backfill_users_approval_status_sql;
EXECUTE stmt_backfill_users_approval_status;
DEALLOCATE PREPARE stmt_backfill_users_approval_status;

-- users.approval_status index
SET @has_users_approval_status_idx = (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = @db_name
    AND table_name = 'users'
    AND index_name = 'idx_users_approval_status'
);

SET @add_users_approval_status_idx_sql = IF(
  @users_table_exists = 0 OR @has_users_approval_status = 0 OR @has_users_approval_status_idx > 0,
  'SELECT ''skip add idx_users_approval_status''',
  'ALTER TABLE users ADD INDEX idx_users_approval_status (approval_status)'
);
PREPARE stmt_add_users_approval_status_idx FROM @add_users_approval_status_idx_sql;
EXECUTE stmt_add_users_approval_status_idx;
DEALLOCATE PREPARE stmt_add_users_approval_status_idx;

-- users.approved_by_user_id index
SET @has_users_approved_by_idx = (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = @db_name
    AND table_name = 'users'
    AND index_name = 'idx_users_approved_by_user_id'
);

SET @add_users_approved_by_idx_sql = IF(
  @users_table_exists = 0 OR @has_users_approved_by_user_id = 0 OR @has_users_approved_by_idx > 0,
  'SELECT ''skip add idx_users_approved_by_user_id''',
  'ALTER TABLE users ADD INDEX idx_users_approved_by_user_id (approved_by_user_id)'
);
PREPARE stmt_add_users_approved_by_idx FROM @add_users_approved_by_idx_sql;
EXECUTE stmt_add_users_approved_by_idx;
DEALLOCATE PREPARE stmt_add_users_approved_by_idx;

-- users.approved_by_user_id foreign key
SET @has_fk_users_approved_by = (
  SELECT COUNT(*)
  FROM information_schema.referential_constraints
  WHERE constraint_schema = @db_name
    AND table_name = 'users'
    AND constraint_name = 'fk_users_approved_by_user_id'
);

SET @add_fk_users_approved_by_sql = IF(
  @users_table_exists = 0 OR @has_users_approved_by_user_id = 0 OR @has_fk_users_approved_by > 0,
  'SELECT ''skip add fk_users_approved_by_user_id''',
  'ALTER TABLE users ADD CONSTRAINT fk_users_approved_by_user_id FOREIGN KEY (approved_by_user_id) REFERENCES users(id) ON DELETE SET NULL'
);
PREPARE stmt_add_fk_users_approved_by FROM @add_fk_users_approved_by_sql;
EXECUTE stmt_add_fk_users_approved_by;
DEALLOCATE PREPARE stmt_add_fk_users_approved_by;

-- superadmin_access_requests table
SET @superadmin_requests_table_exists = (
  SELECT COUNT(*)
  FROM information_schema.tables
  WHERE table_schema = @db_name
    AND table_name = 'superadmin_access_requests'
);

SET @create_superadmin_requests_sql = IF(
  @users_table_exists = 0 OR @superadmin_requests_table_exists > 0,
  'SELECT ''skip create superadmin_access_requests''',
  "CREATE TABLE superadmin_access_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    clinic_name VARCHAR(255) NOT NULL,
    branch_count INT NOT NULL DEFAULT 1,
    clinic_address TEXT NOT NULL,
    contact_phone VARCHAR(64) NOT NULL,
    business_permit_or_license_number VARCHAR(255) NOT NULL,
    owner_valid_id_name VARCHAR(255) NOT NULL,
    owner_valid_id_data LONGTEXT NOT NULL,
    doh_lto_number VARCHAR(255) NOT NULL,
    doh_lto_doc_name VARCHAR(255) NOT NULL,
    doh_lto_doc_data LONGTEXT NOT NULL,
    sec_dti_number VARCHAR(255) NOT NULL,
    sec_dti_doc_name VARCHAR(255) NOT NULL,
    sec_dti_doc_data LONGTEXT NOT NULL,
    bir_2303_number VARCHAR(255) NOT NULL,
    bir_2303_doc_name VARCHAR(255) NOT NULL,
    bir_2303_doc_data LONGTEXT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'pending_review',
    submitted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reviewed_at DATETIME NULL,
    reviewed_by_user_id INT NULL,
    review_notes VARCHAR(500) NULL,
    resubmission_count INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_superadmin_access_requests_user_id (user_id),
    INDEX idx_superadmin_access_requests_status (status),
    INDEX idx_superadmin_access_requests_submitted_at (submitted_at),
    INDEX idx_superadmin_access_requests_reviewed_by (reviewed_by_user_id),
    CONSTRAINT fk_superadmin_access_requests_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_superadmin_access_requests_reviewed_by FOREIGN KEY (reviewed_by_user_id) REFERENCES users(id) ON DELETE SET NULL
  )"
);
PREPARE stmt_create_superadmin_requests FROM @create_superadmin_requests_sql;
EXECUTE stmt_create_superadmin_requests;
DEALLOCATE PREPARE stmt_create_superadmin_requests;

-- Seed premade globaladmin account.
SET @has_password_change_required = (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = @db_name
    AND table_name = 'users'
    AND column_name = 'password_change_required'
);

SET @seed_globaladmin_sql = IF(
  @users_table_exists = 0,
  'SELECT ''skip seed globaladmin account''',
  IF(
    @has_password_change_required > 0,
    "INSERT INTO users (
      email,
      password_hash,
      full_name,
      last_name,
      role,
      is_verified,
      is_archived,
      password_change_required,
      approval_status,
      approved_at,
      approved_by_user_id,
      declined_at,
      decline_reason
    ) VALUES (
      'ericaaquino01145@gmail.com',
      '$2b$10$dIabtxsHVT2hq5VZXbUHMeO7lV6MhGlYZksompSzfdpqREwPH4Gqe',
      'System Global Admin',
      'Admin',
      'globaladmin',
      1,
      0,
      0,
      'approved',
      NOW(),
      NULL,
      NULL,
      NULL
    )
    ON DUPLICATE KEY UPDATE
      password_hash = VALUES(password_hash),
      full_name = VALUES(full_name),
      last_name = VALUES(last_name),
      role = 'globaladmin',
      is_verified = 1,
      is_archived = 0,
      password_change_required = 0,
      approval_status = 'approved',
      approved_at = NOW(),
      approved_by_user_id = NULL,
      declined_at = NULL,
      decline_reason = NULL",
    "INSERT INTO users (
      email,
      password_hash,
      full_name,
      last_name,
      role,
      is_verified,
      is_archived,
      approval_status,
      approved_at,
      approved_by_user_id,
      declined_at,
      decline_reason
    ) VALUES (
      'ericaaquino01145@gmail.com',
      '$2b$10$dIabtxsHVT2hq5VZXbUHMeO7lV6MhGlYZksompSzfdpqREwPH4Gqe',
      'System Global Admin',
      'Admin',
      'globaladmin',
      1,
      0,
      'approved',
      NOW(),
      NULL,
      NULL,
      NULL
    )
    ON DUPLICATE KEY UPDATE
      password_hash = VALUES(password_hash),
      full_name = VALUES(full_name),
      last_name = VALUES(last_name),
      role = 'globaladmin',
      is_verified = 1,
      is_archived = 0,
      approval_status = 'approved',
      approved_at = NOW(),
      approved_by_user_id = NULL,
      declined_at = NULL,
      decline_reason = NULL"
  )
);
PREPARE stmt_seed_globaladmin FROM @seed_globaladmin_sql;
EXECUTE stmt_seed_globaladmin;
DEALLOCATE PREPARE stmt_seed_globaladmin;

-- Verification snapshot
SELECT
  column_name,
  column_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = @db_name
  AND table_name = 'users'
  AND column_name IN ('approval_status', 'approved_at', 'approved_by_user_id', 'declined_at', 'decline_reason')
ORDER BY ordinal_position;

SELECT
  id,
  email,
  role,
  approval_status,
  is_archived,
  is_verified,
  approved_at
FROM users
WHERE email = 'ericaaquino01145@gmail.com'
LIMIT 1;

SELECT
  table_name,
  index_name,
  column_name
FROM information_schema.statistics
WHERE table_schema = @db_name
  AND table_name IN ('users', 'superadmin_access_requests')
  AND index_name IN (
    'idx_users_approval_status',
    'idx_users_approved_by_user_id',
    'idx_superadmin_access_requests_status',
    'idx_superadmin_access_requests_submitted_at',
    'idx_superadmin_access_requests_reviewed_by'
  )
ORDER BY table_name, index_name, seq_in_index;
