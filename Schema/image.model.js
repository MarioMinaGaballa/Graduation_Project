// Schema/image.model.js
const db = require('./databasMySql');

const Image = {
    create: (imageData) => {
        return new Promise((resolve, reject) => {
            const query = 'INSERT INTO images (filename, filepath, mimetype, user_id) VALUES (?, ?, ?, ?)';
            db.query(
                query,
                [imageData.filename, imageData.filepath, imageData.mimetype, imageData.user_id],
                (error, results) => {
                    if (error) reject(error);
                    resolve(results);
                }
            );
        });
    },

    getByUserId: (userId) => {
        return new Promise((resolve, reject) => {
            const query = 'SELECT * FROM images WHERE user_id = ?';
            db.query(query, [userId], (error, results) => {
                if (error) reject(error);
                resolve(results);
            });
        });
    },

    getAll: () => {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT images.*, users.first_name as user_name 
                FROM images 
                JOIN users ON images.user_id = users.id
            `;
            db.query(query, (error, results) => {
                if (error) reject(error);
                resolve(results);
            });
        });
    }
};

module.exports = Image;