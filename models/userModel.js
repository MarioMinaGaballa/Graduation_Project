const db = require('../config/database');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

class UserModel {
    static async findByEmail(email) {
        try {
            console.log('Searching for user by email:', email);
            const [rows] = await db.query('SELECT * FROM UsersGmail WHERE email = ?', [email]);
            console.log('Found user by email:', rows[0]);
            return rows[0];
        } catch (error) {
            console.error('Error finding user by email:', error);
            throw error;
        }
    }

    static async findByGoogleId(googleId) {
        try {
            console.log('Searching for user by Google ID:', googleId);
            const [rows] = await db.query('SELECT * FROM UsersGmail WHERE google_id = ?', [googleId]);
            console.log('Found user by Google ID:', rows[0]);
            return rows[0];
        } catch (error) {
            console.error('Error finding user by Google ID:', error);
            throw error;
        }
    }

    static async createGoogleUser(profile) {
        try {
            console.log('Creating new Google user with profile:', {
                id: profile.id,
                email: profile.emails[0].value,
                firstName: profile.name.givenName,
                lastName: profile.name.familyName,
                photo: profile.photos ? profile.photos[0].value : null
            });
            
            // Check if user already exists first
            const existingUser = await this.findByEmail(profile.emails[0].value);
            if (existingUser) {
                console.log('User already exists with this email');
                return existingUser.id;
            }

            // Prepare the query and values
            const query = 'INSERT INTO UsersGmail (google_id, email, first_name, last_name, profile_picture) VALUES (?, ?, ?, ?, ?)';
            const values = [
                profile.id,
                profile.emails[0].value,
                profile.name.givenName,
                profile.name.familyName,
                profile.photos ? profile.photos[0].value : null
            ];

            console.log('Executing query:', query);
            console.log('With values:', values);

            const [result] = await db.query(query, values);
            
            console.log('Insert result:', result);
            console.log('User created successfully with ID:', result.insertId);
            
            // Verify the user was created
            const newUser = await this.findById(result.insertId);
            console.log('Verified new user:', newUser);
            
            return result.insertId;
        } catch (error) {
            console.error('Detailed error creating user:', {
                message: error.message,
                code: error.code,
                sqlState: error.sqlState,
                sqlMessage: error.sqlMessage
            });
            throw error;
        }
    }

    static async findById(id) {
        try {
            console.log('Searching for user by ID:', id);
            const [rows] = await db.query('SELECT * FROM UsersGmail WHERE id = ?', [id]);
            console.log('Found user by ID:', rows[0]);
            return rows[0];
        } catch (error) {
            console.error('Error finding user by ID:', error);
            throw error;
        }
    }

    static async updateUser(userId, userData) {
        try {
            console.log('Updating user:', userId, 'with data:', userData);
            const [result] = await db.query(
                'UPDATE UsersGmail SET email = ?, first_name = ?, last_name = ?, profile_picture = ? WHERE id = ?',
                [userData.email, userData.firstName, userData.lastName, userData.profilePicture, userId]
            );
            console.log('Update result:', result);
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error updating user:', error);
            throw error;
        }
    }

    static async createCarSettings(userId, carData) {
        try {
            console.log('Creating car settings for user:', userId);
            console.log('Car data:', carData);

            const query = `
                INSERT INTO car_settings 
                (user_id, number_type, letters, plate_number, car_color, car_model) 
                VALUES (?, ?, ?, ?, ?, ?)
            `;
            
            const values = [
                userId,
                carData.number_type || 'private',
                carData.letters,
                carData.plate_number,
                carData.car_color,
                carData.car_model
            ];

            console.log('Executing query:', query, 'with values:', values);

            const [result] = await db.query(query, values);
            console.log('Car settings created successfully:', result);
            
            return result.insertId;
        } catch (error) {
            console.error('Error creating car settings:', error);
            throw error;
        }
    }
}

module.exports = UserModel; 