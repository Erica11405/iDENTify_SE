require("dotenv").config();
const mysql = require("mysql2/promise");

function resolveConnectionConfig() {
  const hasDbEnvConfig = Boolean(
    process.env.DB_HOST ||
    process.env.DB_PORT ||
    process.env.DB_USER ||
    process.env.DB_PASSWORD ||
    process.env.DB_PASS ||
    process.env.DB_NAME
  );

  if (process.env.DATABASE_URL) {
    const dbUrl = new URL(process.env.DATABASE_URL);
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
