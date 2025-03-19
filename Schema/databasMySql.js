const mysql = require('mysql2/promise');

// Create a connection pool
const pool = mysql.createPool({
    host:process.env.DB_HOST, // Database host
    user: process.env.DB_USER,      // Database username
    password: process.env.DB_PASSWORD, // Database password
    database: process.env.DB_NAME,  // Database name
    waitForConnections: true,
    connectionLimit: 10, // Maximum number of connections
    queueLimit: 0        // Unlimited queued requests
});

(async () => {
    try {
        const connection = await pool.getConnection(); // Get a connection from the pool
        console.log('Connected successfully to the database!');
        connection.release(); // Release the connection back to the pool
    } catch (err) {
        console.error('Error connecting to the database:', err.message);
    }
})();

module.exports = pool;
