// const mysql = require('mysql2/promise');
// require('dotenv').config();

// console.log('Database Configuration:', {
//     host: process.env.DB_HOST,
//     user: process.env.DB_USER,
//     database: process.env.DB_NAME,
//     password: process.env.DB_PASSWORD ? 'Set' : 'Not Set'
// });

// const pool = mysql.createPool({
//     host: process.env.DB_HOST,
//     user: process.env.DB_USER,
//     password: process.env.DB_PASSWORD,
//     database: process.env.DB_NAME,
//     waitForConnections: true,
//     connectionLimit: 10,
//     queueLimit: 0
// });

// // Initialize tables
// const initializeTables = async () => {
//     try {
//         // Create UsersGmail table if it doesn't exist
//         await pool.query(`
//             CREATE TABLE IF NOT EXISTS UsersGmail (
//                 User_id INT PRIMARY KEY AUTO_INCREMENT,
//                 google_id VARCHAR(255) UNIQUE,
//                 email VARCHAR(255) UNIQUE NOT NULL,
//                 first_name VARCHAR(255) NOT NULL,
//                 last_name VARCHAR(255) NOT NULL,
//                 phone VARCHAR(20),
//                 profile_picture TEXT,
//                 password VARCHAR(255),
//                 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//                 updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
//             )
//         `);

//         // Create car_settings table if it doesn't exist
//         await pool.query(`
//             CREATE TABLE IF NOT EXISTS car_settings (
//                 id INT PRIMARY KEY AUTO_INCREMENT,
//                 user_id INT NOT NULL,
//                 number_type VARCHAR(50),
//                 letters VARCHAR(10) NOT NULL,
//                 plate_number VARCHAR(20) NOT NULL,
//                 car_color VARCHAR(50) NOT NULL,
//                 car_model VARCHAR(100) NOT NULL,
//                 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//                 updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
//             )
//         `);

//     } catch (error) {
//         console.error('Error initializing database tables:', error);
//     }
// };

// // Initialize tables when the application starts
// initializeTables();

// module.exports = pool; 