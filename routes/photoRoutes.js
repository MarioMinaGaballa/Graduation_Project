const express = require('express');
const router = express.Router();
const upload = require('../utils/uploadImage');
const  uploadImage  = require('../Controllers/photo.Controller');
const  connection  = require('../Schema/databasMySql');

router.get('/', (req, res) => {
    res.send("Welcome to upload photo");
});

router.post('/upload/:user_id', upload.single('image'), uploadImage.uploadImage);
router.get('/images/:user_id', uploadImage.getImage);

module.exports = router;