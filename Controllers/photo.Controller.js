const asyncMiddleware = require('../middleware/async.middleware');
const connection = require('../Schema/databasMySql');
const appError = require('../utils/appError');
const httpStatusText = require('../utils/http.status.text'); 
const path =require('path')

const uploadImage = asyncMiddleware(async (req, res, next) => {
  if (!req.file) {
    return next(
      appError.create("No file uploaded.", 400, httpStatusText.FAIL)
    );
  }

  if (!req.params.user_id) {
    return next(
      appError.create("User ID is required.", 400, httpStatusText.FAIL)
    );
  }

  const imageData = {
    filename: req.file.originalname,
    filepath: req.file.path,
    mimetype: req.file.mimetype,
    user_id: req.params.user_id 
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


const getImage = asyncMiddleware(async (req, res, next) => {
  // Check if user_id is provided in the path
  if (!req.params.user_id) {
    return next(
      appError.create("User ID is required.", 400, httpStatusText.FAIL)
    );
  }

  try {
    const query = 'SELECT * FROM images WHERE user_id = ?';
    const [results] = await connection.execute(query, [req.params.user_id]);

    // Construct image URLs for each result
    const imagesWithUrls = results.map(image => ({
      ...image,
      imageUrl: `http://localhost:5000/uploads/${path.basename(image.filepath)}` // Extract filename from filepath
    }));

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