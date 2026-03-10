// const mysql = require("mysql2/promise");
// require("dotenv").config();

// const pool = mysql.createPool({
//   host: process.env.DB_HOST,
//   user: process.env.DB_USER,
//   password: process.env.DB_PASS,
//   database: process.env.DB_NAME,
// });

// pool.getConnection()
//   .then(connection => {
//     console.log("Successfully connected to the database.");
//     connection.release();
//   })
//   .catch(error => {
//     console.error("Error connecting to the database:", error);
//   });

// pool.on('error', (err) => {
//   console.error('Database pool error:', err);
// });

// module.exports = pool;


// <========== For Deployment ==========>
// require('dotenv').config({ path: __dirname + '/.env' });
// const mysql = require('mysql2');

// // Now process.env.DATABASE_URL will successfully pull the string from your .env file!
// const connection = mysql.createConnection(process.env.DATABASE_URL);

// connection.connect((err) => {
//   if (err) {
//     console.error('Error connecting to the database:', err);
//     return;
//   }
//   console.log('Successfully connected to the database!');
// });

// module.exports = connection;



// const mysql = require("mysql2/promise");
// require("dotenv").config();

// // Check if DigitalOcean provided a DATABASE_URL, otherwise use local variables
// const dbConfig = process.env.DATABASE_URL 
//   ? process.env.DATABASE_URL 
//   : {
//       host: process.env.DB_HOST,
//       user: process.env.DB_USER,
//       password: process.env.DB_PASS,
//       database: process.env.DB_NAME,
//     };

// const pool = mysql.createPool(dbConfig);

// pool.getConnection()
//   .then(connection => {
//     console.log("Successfully connected to the database!");
//     connection.release();
//   })
//   .catch(error => {
//     console.error("Error connecting to the database:", error);
//   });

// pool.on('error', (err) => {
//   console.error('Database pool error:', err);
// });

// module.exports = pool;


// const mysql = require("mysql2/promise");
// require("dotenv").config();

// let dbConfig;

// // Look for our new private URL first, then fallback to the standard one
// const connectionString = process.env.PRIVATE_DB_URL || process.env.DATABASE_URL;

// if (connectionString) {
//   const dbUrl = new URL(connectionString);
  
//   dbConfig = {
//     host: dbUrl.hostname,
//     port: dbUrl.port || 25060,
//     user: dbUrl.username,
//     password: dbUrl.password,
//     database: dbUrl.pathname.replace('/', '').split('?')[0], 
//     ssl: {
//       rejectUnauthorized: false
//     }
//   };
//   console.log("-> Trying to connect to DB at Host:", dbConfig.host, "| Port:", dbConfig.port);
// } else {
//   // Local development fallback
//   dbConfig = {
//     host: process.env.DB_HOST,
//     user: process.env.DB_USER,
//     password: process.env.DB_PASS,
//     database: process.env.DB_NAME,
//   };
// }

// const pool = mysql.createPool(dbConfig);

// pool.getConnection()
//   .then(connection => {
//     console.log("Successfully connected to the database!");
//     connection.release();
//   })
//   .catch(error => {
//     console.error("Error connecting to the database:", error);
//   });

// pool.on('error', (err) => {
//   console.error('Database pool error:', err);
// });

// module.exports = pool;





// const mysql = require("mysql2/promise");
// require("dotenv").config();

// let dbConfig;

// const connectionString = process.env.PRIVATE_DB_URL || process.env.DATABASE_URL;

// if (connectionString) {
//   const dbUrl = new URL(connectionString);
  
//   dbConfig = {
//     host: dbUrl.hostname,
//     port: dbUrl.port || 25060,
//     // THE FIX: Decode the username and password!
//     user: decodeURIComponent(dbUrl.username),
//     password: decodeURIComponent(dbUrl.password),
//     database: dbUrl.pathname.replace('/', '').split('?')[0], 
//     ssl: {
//       rejectUnauthorized: false
//     }
//   };
//   console.log("-> Trying to connect to DB at Host:", dbConfig.host, "| Port:", dbConfig.port);
// } else {
//   // Local development fallback
//   dbConfig = {
//     host: process.env.DB_HOST,
//     user: process.env.DB_USER,
//     password: process.env.DB_PASS,
//     database: process.env.DB_NAME,
//   };
// }

// const pool = mysql.createPool(dbConfig);

// pool.getConnection()
//   .then(connection => {
//     console.log("Successfully connected to the database!");
//     connection.release();
//   })
//   .catch(error => {
//     console.error("Error connecting to the database:", error);
//   });

// pool.on('error', (err) => {
//   console.error('Database pool error:', err);
// });

// module.exports = pool;


const mysql = require("mysql2/promise");
require("dotenv").config();

// DigitalOcean injects this automatically now!
const connectionString = process.env.DATABASE_URL;
let pool;

if (connectionString) {
  console.log("-> Connecting to DigitalOcean managed database...");
  
  // Use Node's built-in URL parser to handle special characters perfectly
  const dbUrl = new URL(connectionString);
  
  pool = mysql.createPool({
    host: dbUrl.hostname,
    port: dbUrl.port || 25060,
    user: decodeURIComponent(dbUrl.username),
    password: decodeURIComponent(dbUrl.password),
    // Grabs the database name (e.g., 'defaultdb') and removes the leading slash
    database: dbUrl.pathname.replace('/', '') || 'defaultdb', 
    ssl: {
      rejectUnauthorized: false
    }
  });
} else {
  console.log("-> Using local environment variables...");
  pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
  });
}

pool.getConnection()
  .then(connection => {
    console.log("Successfully connected to the database!");
    connection.release();
  })
  .catch(error => {
    console.error("Error connecting to the database:", error);
  });

pool.on('error', (err) => {
  console.error('Database pool error:', err);
});

module.exports = pool;