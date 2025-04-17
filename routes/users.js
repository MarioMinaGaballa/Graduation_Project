const express = require("express");
const router = express.Router();
const appError = require("../utils/appError");
const userController = require("../Controllers/Users.Controller");
const verifyToken = require("../middleware/verifyToken");
const otpController = require("../Controllers/otpController");
//get all users
//register
//login
//update User
// reset password

router.route("/").get(verifyToken, userController.getAllUsers);

router.route("/register").post(userController.register, verifyToken);

router.route("/login").post(userController.Login, verifyToken);

router.route("/updateuser/:id").put(userController.updateUser);


// Reset password routes
router.route("/request-reset-password").post(otpController.sendOtp);
router.route("/verify-reset-password").post(otpController.verifyOtp);
router.route("/reset-password").post(userController.postResetPassword);
  
  






module.exports = router;
