const pool = require("../Schema/databasMySql");

class License {
  static async findByEmail(email) {
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute(
        'SELECT * FROM user_licenses WHERE email = ?',
        [email]
      );
      return rows[0];
    } finally {
      connection.release();
    }
  }

  static async create(email, frontImageUrl, backImageUrl) {
    const connection = await pool.getConnection();
    try {
      const [result] = await connection.execute(
        'INSERT INTO user_licenses (email, front_image_url, back_image_url) VALUES (?, ?, ?)',
        [email, frontImageUrl, backImageUrl]
      );
      return result.insertId;
    } finally {
      connection.release();
    }
  }

  static async update(email, frontImageUrl, backImageUrl) {
    const connection = await pool.getConnection();
    try {
      await connection.execute(
        'UPDATE user_licenses SET front_image_url = ?, back_image_url = ? WHERE email = ?',
        [frontImageUrl, backImageUrl, email]
      );
    } finally {
      connection.release();
    }
  }
}

module.exports = License; 