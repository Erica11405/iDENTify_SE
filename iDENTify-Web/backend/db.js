// // // // const mysql = require("mysql2/promise");
// // // // require("dotenv").config();

// // // // // DigitalOcean injects this automatically when you attach the database component
// // // // const connectionString = process.env.DATABASE_URL;
// // // // let pool;

// // // // if (connectionString) {
// // // //   console.log("-> Connecting to DigitalOcean managed database...");
  
// // // //   // Use Node's built-in URL parser to handle special characters (like @ or #) in passwords
// // // //   const dbUrl = new URL(connectionString);
  
// // // //   pool = mysql.createPool({
// // // //     host: dbUrl.hostname,
// // // //     port: dbUrl.port || 25060,
// // // //     user: decodeURIComponent(dbUrl.username),
// // // //     password: decodeURIComponent(dbUrl.password),
// // // //     // Grabs the database name (e.g., 'defaultdb') and removes the leading slash
// // // //     database: dbUrl.pathname.replace('/', '') || 'defaultdb', 
// // // //     ssl: {
// // // //       rejectUnauthorized: false
// // // //     },
// // // //     waitForConnections: true,
// // // //     connectionLimit: 10,
// // // //     queueLimit: 0
// // // //   });
// // // // } else {
// // // //   // Fallback for local development using XAMPP or local MySQL
// // // //   console.log("-> Using local environment variables...");
// // // //   pool = mysql.createPool({
// // // //     host: process.env.DB_HOST || 'localhost',
// // // //     user: process.env.DB_USER || 'root',
// // // //     password: process.env.DB_PASS || '',
// // // //     database: process.env.DB_NAME || 'identify_app',
// // // //     waitForConnections: true,
// // // //     connectionLimit: 10,
// // // //     queueLimit: 0
// // // //   });
// // // // }

// // // // // Immediate connection test to verify setup in deployment logs
// // // // pool.getConnection()
// // // //   .then(connection => {
// // // //     console.log("Successfully connected to the database!");
// // // //     connection.release();
// // // //   })
// // // //   .catch(error => {
// // // //     console.error("Error connecting to the database:", error);
// // // //   });

// // // // // Error listener to catch connection drops
// // // // pool.on('error', (err) => {
// // // //   console.error('Database pool error:', err);
// // // // });

// // // // module.exports = pool;

// // // const mysql = require("mysql2");
// // // require("dotenv").config();

// // // // Create a connection pool for production stability
// // // const pool = mysql.createPool({
// // //   host: process.env.DB_HOST,
// // //   user: process.env.DB_USER,
// // //   password: process.env.DB_PASSWORD,
// // //   database: process.env.DB_NAME,
// // //   waitForConnections: true,
// // //   connectionLimit: 10,
// // //   queueLimit: 0
// // // });

// // // // Use the promise wrapper for async/await support
// // // module.exports = pool.promise();

// // const mysql = require("mysql2");
// // require("dotenv").config();

// // const pool = mysql.createPool({
// //   host: process.env.DB_HOST,
// //   user: process.env.DB_USER,
// //   password: process.env.DB_PASSWORD, // Ensure your .env matches this exactly
// //   database: process.env.DB_NAME,
// //   port: process.env.DB_PORT || 25060, // DO Managed DBs typically use 25060
// //   ssl: {
// //       rejectUnauthorized: false // CRITICAL: Required for DigitalOcean databases
// //   },
// //   waitForConnections: true,
// //   connectionLimit: 10,
// //   queueLimit: 0
// // });

// // module.exports = pool.promise();


// const mysql = require("mysql2");
// require("dotenv").config();

// let poolConfig = {};

// if (process.env.DATABASE_URL) {
//   // Production: DigitalOcean uses a single connection string
//   console.log("-> Connecting to DigitalOcean managed database...");
//   const dbUrl = new URL(process.env.DATABASE_URL);
  
//   poolConfig = {
//     host: dbUrl.hostname,
//     port: dbUrl.port || 25060,
//     user: decodeURIComponent(dbUrl.username),
//     password: decodeURIComponent(dbUrl.password),
//     database: dbUrl.pathname.replace('/', '') || 'defaultdb', 
//     ssl: { rejectUnauthorized: false },
//     waitForConnections: true,
//     connectionLimit: 10,
//     queueLimit: 0
//   };
// } else {
//   // Local Development (XAMPP / localhost)
//   console.log("-> Using local environment variables...");
//   poolConfig = {
//     host: process.env.DB_HOST || 'localhost',
//     user: process.env.DB_USER || 'root',
//     password: process.env.DB_PASS || '', // Matches your old local setup
//     database: process.env.DB_NAME || 'identify_app',
//     waitForConnections: true,
//     connectionLimit: 10,
//     queueLimit: 0
//   };
// }

// const pool = mysql.createPool(poolConfig);

// // Catch connection errors
// pool.on('error', (err) => {
//   console.error('Database pool error:', err);
// });

// module.exports = pool.promise();


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