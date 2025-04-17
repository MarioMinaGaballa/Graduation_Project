const express = require('express');
const router = express.Router();
const otpController = require('../Controllers/otpController');
router.post('/send', otpController.sendOtp);
router.post('/send-without-verification', otpController.sendOtpWithoutVerification);
router.post('/verify', otpController.verifyOtp);

module.exports = router;
