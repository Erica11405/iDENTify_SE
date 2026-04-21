require('dotenv').config();
const mysql = require('mysql2/promise');

async function testConnection() {
  const host = process.env.DB_HOST || 'localhost';
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || process.env.DB_PASS || '';
  const database = process.env.DB_NAME || 'identify_app';
  const port = Number(process.env.DB_PORT || (host !== 'localhost' && host !== '127.0.0.1' ? 25060 : 3306));

  // Constructing a DB URL for logging as requested
  const maskedPassword = password ? '****' : '';
  const dbUrl = `mysql://${user}:${maskedPassword}@${host}:${port}/${database}`;

  console.log(`Testing connection to: ${dbUrl}`);

  const config = {
    host,
    user,
    password,
    database,
    port,
  };

  // Add SSL if not localhost (following db.js logic)
  if (host !== 'localhost' && host !== '127.0.0.1') {
    config.ssl = { rejectUnauthorized: false };
    console.log('SSL enabled for connection');
  }

  try {
    const connection = await mysql.createConnection(config);
    console.log('✅ Connection successful!');
    
    const [rows] = await connection.execute('SELECT NOW() AS currentTime');
    console.log('Database time:', rows[0].currentTime);

    await connection.end();
    console.log('Connection closed.');
  } catch (error) {
    console.error('❌ Connection failed:');
    console.error(error.message);
    process.exit(1);
  }
}

testConnection();
