const multer = require('multer');
const fs = require('fs');
const path = require('path');

const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir); // لو مجلد uploads مش موجود، هنعمله
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname); // اسم الملف هيكون التاريخ + الاسم الأصلي
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 1024 * 1024 * 15 }, // الحد الأقصى 15 ميجا
    fileFilter: (req, file, cb) => {
        console.log('mimetype:', file.mimetype);
        if (file.mimetype && file.mimetype.startsWith('image/')) {
            cb(null, true); // نقبل الصور بس
        } else {
            cb(new Error('ممنوع غير الصور'), false);
        }
    }
});

module.exports = upload;