const mysql = require("mysql2");
require("dotenv").config();

let poolConfig = {};
const DB_TIMEZONE = process.env.DB_TIMEZONE || "+08:00";

const forceIndividualDbConfig =
  process.env.DB_FORCE_INDIVIDUAL === "1" ||
  process.env.DB_USE_LOCAL_DB === "1";
const forceEmptyDbPassword = process.env.DB_FORCE_EMPTY_PASSWORD === "1";

const hasDbEnvConfig = Boolean(
  process.env.DB_HOST ||
  process.env.DB_PORT ||
  process.env.DB_USER ||
  process.env.DB_PASSWORD ||
  process.env.DB_PASS ||
  process.env.DB_NAME
);

function normalizeDatabaseUrl(rawValue) {
  const value = String(rawValue || '').trim();
  if (!value) return '';

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1).trim();
  }

  return value;
}

const normalizedDatabaseUrl = normalizeDatabaseUrl(process.env.DATABASE_URL);

if (!forceIndividualDbConfig && normalizedDatabaseUrl) {
  console.log("-> Connecting using DATABASE_URL...");
  const dbUrl = new URL(normalizedDatabaseUrl);
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
  if (forceIndividualDbConfig) {
    console.log("-> DB_FORCE_INDIVIDUAL enabled, using DB_ environment variables...");
  } else {
    console.log("-> Using individual DB_ environment variables...");
  }
  const host = process.env.DB_HOST || "localhost";
  const dbPassword = forceEmptyDbPassword
    ? ""
    : (process.env.DB_PASSWORD || process.env.DB_PASS || "");
  poolConfig = {
    host,
    user: process.env.DB_USER || "root",
    password: dbPassword,
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

poolConfig.timezone = DB_TIMEZONE;
const pool = mysql.createPool(poolConfig);

pool.on('error', (err) => {
  console.error('Database pool error:', err);
});

pool.on('connection', (connection) => {
  connection.query("SET time_zone = ?", [DB_TIMEZONE], (error) => {
    if (error) {
      console.error("Failed to set DB session timezone:", error.message || error);
    }
  });
});

module.exports = pool.promise();