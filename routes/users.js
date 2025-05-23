const express = require("express");
const router = express.Router();
const appError = require("../utils/appError");
const userController = require("../Controllers/Users.Controller");
const verifyToken = require("../middleware/verifyToken");
const otpController = require("../Controllers/otpController");
const upload = require('../utils/uploadImage');
const  uploadImage  = require('../Controllers/photo.Controller');


// Logout route
router.get('/logout', (req, res) => {
    req.logout((err) => {
        if (err) {
            return next(err);
        }
        res.redirect('/login');
    });
});

//get all users
//register
//login
//update User
// reset password

router.route("/").get(verifyToken, userController.getAllUsers);

router.route("/register").post(userController.register, verifyToken);

router.route("/login").post(userController.Login, verifyToken);

router.route("/updateuser").put(userController.updateUserAndCar);

// Reset password routes
router.route("/request-reset-password").post(otpController.sendOtp);
router.route("/verify-reset-password").post(otpController.verifyOtp);
router.route("/reset-password").post(userController.postResetPassword);

// Get user data by email
router.post("/data", userController.getUserData);




router.post('/upload', upload.single('image'), uploadImage.uploadImage);
router.get('/images', uploadImage.getImage);

module.exports = router;


