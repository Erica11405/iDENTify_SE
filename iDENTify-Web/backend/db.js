const mysql = require("mysql2");
require("dotenv").config();

let poolConfig = {};

const hasDbEnvConfig = Boolean(
  process.env.DB_HOST ||
  process.env.DB_PORT ||
  process.env.DB_USER ||
  process.env.DB_PASSWORD ||
  process.env.DB_PASS ||
  process.env.DB_NAME
);

if (process.env.DATABASE_URL) {
  console.log("-> Connecting using DATABASE_URL...");
  const dbUrl = new URL(process.env.DATABASE_URL);
  poolConfig = {
    host: dbUrl.hostname,
    port: Number(dbUrl.port || 25060),
    user: decodeURIComponent(dbUrl.username),
    password: decodeURIComponent(dbUrl.password),
    database: dbUrl.pathname.replace("/", "") || "defaultdb",
    ssl: { rejectUnauthorized: false },
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  };
} else if (hasDbEnvConfig) {
  console.log("-> Using individual DB_ environment variables...");
  const host = process.env.DB_HOST || "localhost";
  poolConfig = {
    host,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || process.env.DB_PASS || "",
    database: process.env.DB_NAME || "identify_app",
    port: Number(process.env.DB_PORT || (host !== "localhost" && host !== "127.0.0.1" ? 25060 : 3306)),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  };

  if (host !== "localhost" && host !== "127.0.0.1") {
    poolConfig.ssl = { rejectUnauthorized: false };
  }
} else {
  console.log("-> No DB env found, using localhost defaults...");
  poolConfig = {
    host: "localhost",
    port: 3306,
    user: "root",
    password: "",
    database: "identify_app",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  };
}

const pool = mysql.createPool(poolConfig);

pool.on('error', (err) => {
  console.error('Database pool error:', err);
});

module.exports = pool.promise();