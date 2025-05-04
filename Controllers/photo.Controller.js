const asyncMiddleware = require('../middleware/async.middleware');
const connection = require('../Schema/databasMySql');
const appError = require('../utils/appError');
const httpStatusText = require('../utils/http.status.text'); 
const path =require('path')
const fs = require('fs');

// ... existing code ...
const uploadImage = asyncMiddleware(async (req, res, next) => {
  if (!req.file) {
    return next(
      appError.create("No file uploaded.", 400, httpStatusText.FAIL)
    );
  }

  // استقبل البريد الإلكتروني من body أو form-data
  const email = req.body.email;
  if (!email) {
    return next(
      appError.create("Email is required.", 400, httpStatusText.FAIL)
    );
  }

  // جلب user_id
  const userQuery = 'SELECT user_id FROM users WHERE email = ?';
  const [userResults] = await connection.execute(userQuery, [email]);
  if (userResults.length === 0) {
    return next(
      appError.create("No user found with this email.", 404, httpStatusText.FAIL)
    );
  }
  const user_id = userResults[0].user_id;

  // جلب الصورة القديمة (إن وجدت)
  const oldImageQuery = 'SELECT * FROM images WHERE user_id = ?';
  const [oldImages] = await connection.execute(oldImageQuery, [user_id]);
  if (oldImages.length > 0) {
    // حذف الصورة من السيرفر
    const oldFilePath = oldImages[0].filepath;
    if (fs.existsSync(oldFilePath)) {
      fs.unlinkSync(oldFilePath);
    }
    // حذف السجل من قاعدة البيانات
    await connection.execute('DELETE FROM images WHERE user_id = ?', [user_id]);
  }

  // حفظ الصورة الجديدة
  const imageData = {
    filename: req.file.originalname,
    filepath: req.file.path,
    mimetype: req.file.mimetype,
    user_id
  };

  try {
    const query = 'INSERT INTO images (filename, filepath, mimetype, user_id) VALUES (?, ?, ?, ?)';
    const values = [imageData.filename, imageData.filepath, imageData.mimetype, imageData.user_id];
    await connection.execute(query, values);

    res.status(200).json({
      status: httpStatusText.SUCCESS,
      message: 'Image uploaded successfully!'
    });
  } catch (error) {
    console.error('Error details:', error);
    return next(
      appError.create("Error saving image: " + error.message, 500, httpStatusText.FAIL)
    );
  }
});
// ... existing code ...


const getImage = asyncMiddleware(async (req, res, next) => {
  if (!req.body.email) {
    return next(
      appError.create("Email is required.", 400, httpStatusText.FAIL)
    );
  }

  try {
    // استخدم User_id بحرف كبير
    const userQuery = 'SELECT User_id FROM users WHERE email = ?';
    const [userResults] = await connection.execute(userQuery, [req.body.email]);

    if (userResults.length === 0) {
      return res.status(200).json({
        status: httpStatusText.SUCCESS,
        message: 'No user found with this email.',
        images: []
      });
    }

    const userId = userResults[0].User_id;

    // جلب الصور الخاصة بالمستخدم
    const imageQuery = 'SELECT * FROM images WHERE user_id = ?';
    const [imageResults] = await connection.execute(imageQuery, [userId]);

    // بناء رابط الصورة
    const imagesWithUrls = imageResults.map(image => {
      const filename = image.filepath.split(/[/\\]/).pop();
      return {
        ...image,
        imageUrl: `http://localhost:3001/uploads/${filename}`
      };
    });

    if (imagesWithUrls.length === 0) {
      return res.status(200).json({
        status: httpStatusText.SUCCESS,
        message: 'No images found for this user.',
        images: []
      });
    }

    res.status(200).json({
      status: httpStatusText.SUCCESS,
      message: 'Images retrieved successfully!',
      images: imagesWithUrls
    });
  } catch (error) {
    console.error('Error fetching images:', error);
    return next(
      appError.create("Error fetching images: " + error.message, 500, httpStatusText.FAIL)
    );
  }
});
module.exports = { uploadImage, getImage };