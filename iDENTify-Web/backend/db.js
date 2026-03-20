const mysql = require("mysql2");
require("dotenv").config();

let poolConfig = {};

if (process.env.DATABASE_URL) {
  console.log("-> Connecting using DATABASE_URL...");
  const dbUrl = new URL(process.env.DATABASE_URL);
  poolConfig = {
    host: dbUrl.hostname,
    port: dbUrl.port || 25060,
    user: decodeURIComponent(dbUrl.username),
    password: decodeURIComponent(dbUrl.password),
    database: dbUrl.pathname.replace('/', '') || 'defaultdb',
    ssl: { rejectUnauthorized: false }, // REQUIRED FOR DO
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  };
} else {
  console.log("-> Using individual DB_ environment variables...");
  poolConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'identify_app',
    // Auto-detect DigitalOcean port if not localhost
    port: process.env.DB_PORT || (process.env.DB_HOST !== 'localhost' ? 25060 : 3306),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  };

  // CRITICAL: Force SSL if connecting to a remote host (like DigitalOcean)
  if (poolConfig.host !== 'localhost' && poolConfig.host !== '127.0.0.1') {
      poolConfig.ssl = { rejectUnauthorized: false };
  }
}

const pool = mysql.createPool(poolConfig);

pool.on('error', (err) => {
  console.error('Database pool error:', err);
});

module.exports = pool.promise();