#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const mysql = require('mysql2/promise');
require('dotenv').config();

const args = new Set(process.argv.slice(2));
const showStatusOnly = args.has('--status');
const DB_TIMEZONE = process.env.DB_TIMEZONE || '+08:00';

function buildDbConfig() {
  const forceIndividualDbConfig =
    process.env.DB_FORCE_INDIVIDUAL === '1' ||
    process.env.DB_USE_LOCAL_DB === '1';
  const forceEmptyDbPassword = process.env.DB_FORCE_EMPTY_PASSWORD === '1';

  const hasDbEnvConfig = Boolean(
    process.env.DB_HOST ||
      process.env.DB_PORT ||
      process.env.DB_USER ||
      process.env.DB_PASSWORD ||
      process.env.DB_PASS ||
      process.env.DB_NAME
  );

  if (!forceIndividualDbConfig && process.env.DATABASE_URL) {
    const dbUrl = new URL(process.env.DATABASE_URL);
    return {
      host: dbUrl.hostname,
      port: Number(dbUrl.port || 25060),
      user: decodeURIComponent(dbUrl.username),
      password: decodeURIComponent(dbUrl.password),
      database: dbUrl.pathname.replace('/', '') || 'defaultdb',
      ssl: { rejectUnauthorized: false },
      timezone: DB_TIMEZONE,
      multipleStatements: true,
    };
  }

  if (hasDbEnvConfig) {
    const host = process.env.DB_HOST || 'localhost';
    const dbPassword = forceEmptyDbPassword
      ? ''
      : process.env.DB_PASSWORD || process.env.DB_PASS || '';

    const config = {
      host,
      user: process.env.DB_USER || 'root',
      password: dbPassword,
      database: process.env.DB_NAME || 'identify_app',
      port: Number(
        process.env.DB_PORT ||
          (host !== 'localhost' && host !== '127.0.0.1' ? 25060 : 3306)
      ),
      timezone: DB_TIMEZONE,
      multipleStatements: true,
    };

    if (host !== 'localhost' && host !== '127.0.0.1') {
      config.ssl = { rejectUnauthorized: false };
    }

    return config;
  }

  return {
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '',
    database: 'identify_app',
    timezone: DB_TIMEZONE,
    multipleStatements: true,
  };
}

function getSqlFiles(sqlDir) {
  return fs
    .readdirSync(sqlDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.sql'))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
}

function sha256(input) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

async function ensureMigrationsTable(connection) {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      filename VARCHAR(255) NOT NULL UNIQUE,
      checksum VARCHAR(64) NOT NULL,
      applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

async function getAppliedMigrations(connection) {
  const [rows] = await connection.query(
    'SELECT filename, checksum, applied_at FROM schema_migrations ORDER BY filename ASC'
  );

  const byFilename = new Map();
  rows.forEach((row) => {
    byFilename.set(String(row.filename || ''), {
      checksum: String(row.checksum || ''),
      appliedAt: row.applied_at || null,
    });
  });

  return byFilename;
}

async function printStatus(sqlFiles, appliedMap) {
  const applied = [];
  const pending = [];
  const changed = [];

  sqlFiles.forEach((filename) => {
    const filePath = path.join(__dirname, '..', 'sql', filename);
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const checksum = sha256(fileContent);
    const appliedRecord = appliedMap.get(filename);

    if (!appliedRecord) {
      pending.push(filename);
      return;
    }

    if (appliedRecord.checksum !== checksum) {
      changed.push(filename);
      return;
    }

    applied.push(filename);
  });

  console.log('\nMigration status');
  console.log('----------------');
  console.log(`Applied: ${applied.length}`);
  applied.forEach((name) => console.log(`  - ${name}`));

  console.log(`\nPending: ${pending.length}`);
  pending.forEach((name) => console.log(`  - ${name}`));

  console.log(`\nChanged after apply: ${changed.length}`);
  changed.forEach((name) => console.log(`  - ${name}`));

  if (changed.length > 0) {
    throw new Error(
      'One or more already-applied migration files were modified. Create a new migration instead of editing old ones.'
    );
  }
}

async function run() {
  const sqlDir = path.join(__dirname, '..', 'sql');
  if (!fs.existsSync(sqlDir)) {
    throw new Error(`SQL directory not found: ${sqlDir}`);
  }

  const sqlFiles = getSqlFiles(sqlDir);
  if (sqlFiles.length === 0) {
    console.log('No SQL migration files found.');
    return;
  }

  const dbConfig = buildDbConfig();
  console.log(`Connecting to ${dbConfig.host}:${dbConfig.port}/${dbConfig.database} ...`);

  const connection = await mysql.createConnection(dbConfig);

  try {
    await connection.query('SET time_zone = ?', [DB_TIMEZONE]);
    await ensureMigrationsTable(connection);

    const appliedMap = await getAppliedMigrations(connection);

    if (showStatusOnly) {
      await printStatus(sqlFiles, appliedMap);
      return;
    }

    let appliedCount = 0;

    for (const filename of sqlFiles) {
      const filePath = path.join(sqlDir, filename);
      const sql = fs.readFileSync(filePath, 'utf8');
      const checksum = sha256(sql);
      const applied = appliedMap.get(filename);

      if (applied) {
        if (applied.checksum !== checksum) {
          throw new Error(
            `Migration file changed after apply: ${filename}. Create a new migration file instead.`
          );
        }
        console.log(`Skip ${filename} (already applied).`);
        continue;
      }

      console.log(`Apply ${filename} ...`);
      await connection.query(sql);
      await connection.query(
        'INSERT INTO schema_migrations (filename, checksum) VALUES (?, ?)',
        [filename, checksum]
      );
      appliedCount += 1;
      console.log(`Applied ${filename}.`);
    }

    console.log(`\nDone. Newly applied migrations: ${appliedCount}`);
  } finally {
    await connection.end();
  }
}

run().catch((error) => {
  console.error('\nMigration failed:', error.message || error);
  process.exitCode = 1;
});
