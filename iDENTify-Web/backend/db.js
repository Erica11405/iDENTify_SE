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


const mysql = require("mysql2/promise");
require("dotenv").config();

// Determine connection settings based on environment
let dbConfig;

if (process.env.DATABASE_URL) {
  // If we have a DATABASE_URL (DigitalOcean), use it and ADD the required SSL config
  dbConfig = {
    uri: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false // This allows connection to the managed DO database
    }
  };
} else {
  // Local development fallback
  dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
  };
}

const pool = mysql.createPool(dbConfig);

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