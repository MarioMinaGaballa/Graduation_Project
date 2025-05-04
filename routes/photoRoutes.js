const express = require('express');
const router = express.Router();
const upload = require('../utils/uploadImage');
const  uploadImage  = require('../Controllers/photo.Controller');
const  connection  = require('../Schema/databasMySql');

router.get('/', (req, res) => {
    res.send("Welcome to upload photo");
});

router.post('/upload', upload.single('image'), uploadImage.uploadImage);
router.get('/images', uploadImage.getImage);

module.exports = router;