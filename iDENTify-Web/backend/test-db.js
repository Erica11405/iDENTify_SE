require("dotenv").config();
const mysql = require("mysql2/promise");

function normalizeDatabaseUrl(rawValue) {
  const value = String(rawValue || "").trim();
  if (!value) return "";

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1).trim();
  }

  return value;
}

function resolveConnectionConfig() {
  const forceIndividualDbConfig =
    process.env.DB_FORCE_INDIVIDUAL === "1" ||
    process.env.DB_USE_LOCAL_DB === "1";

  const hasDbEnvConfig = Boolean(
    process.env.DB_HOST ||
    process.env.DB_PORT ||
    process.env.DB_USER ||
    process.env.DB_PASSWORD ||
    process.env.DB_PASS ||
    process.env.DB_NAME
  );

  const normalizedDatabaseUrl = normalizeDatabaseUrl(process.env.DATABASE_URL);

  if (!forceIndividualDbConfig && normalizedDatabaseUrl) {
    const dbUrl = new URL(normalizedDatabaseUrl);
    return {
      host: dbUrl.hostname,
      port: Number(dbUrl.port || 25060),
      user: decodeURIComponent(dbUrl.username),
      password: decodeURIComponent(dbUrl.password),
      database: dbUrl.pathname.replace("/", "") || "defaultdb",
      ssl: { rejectUnauthorized: false },
    };
  }

  if (hasDbEnvConfig) {
    const host = process.env.DB_HOST || "localhost";
    const config = {
      host,
      port: Number(process.env.DB_PORT || (host !== "localhost" && host !== "127.0.0.1" ? 25060 : 3306)),
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || process.env.DB_PASS || "",
      database: process.env.DB_NAME || "identify_app",
    };

    if (host !== "localhost" && host !== "127.0.0.1") {
      config.ssl = { rejectUnauthorized: false };
    }

    return config;
  }

  return {
    host: "localhost",
    port: 3306,
    user: "root",
    password: "",
    database: "identify_app",
  };
}

async function testConnection() {
  try {
    const connection = await mysql.createConnection(resolveConnectionConfig());
    console.log("Successfully connected to the database.");
    await connection.end();
  } catch (error) {
    console.error("Error connecting to the database:", error);
  }
}

testConnection();
