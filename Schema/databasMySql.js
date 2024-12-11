const mysql = require('mysql2/promise');

// Create a connection pool
const pool = mysql.createPool({
    host: 'localhost', // Database host
    user: 'root',      // Database username
    password: '1272003', // Database password
    database: 'myapp',  // Database name
    waitForConnections: true,
    connectionLimit: 10, // Maximum number of connections
    queueLimit: 0        // Unlimited queued requests
});

// Test the connection (optional)
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
