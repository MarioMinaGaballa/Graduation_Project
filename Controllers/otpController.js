const otpGenerator = require('../utils/otpGenerator');
const emailService = require('../middleware/emailService');
const userSql = require('../Schema/databasMySql');
const httpStatusText = require('../utils/http.status.text');
const appError = require('../utils/appError');
const asyncMiddleware = require('../middleware/async.middleware');

let otpData = {}; 

exports.sendOtp = async (req, res) => {
    try {
        const email = req.body.email; 

        if (!email) {
            return res.status(400).json({
                status: httpStatusText.FAIL,
                message: "Email is required"
            });
        }

        // Check if email exists in database
        const [users] = await userSql.query('SELECT * FROM users WHERE email = ?', [email]);
        
        if (users.length === 0) {
            return res.status(404).json({
                status: httpStatusText.FAIL,
                message: "Email not found in our database"
            });
        }

        const otp = otpGenerator.generateOtp(6);
        const expirationTime = Date.now() + 60 * 1000; 

        otpData[email] = { otp, expirationTime };

        await emailService.sendEmail(email, otp);

        console.log("OTP generated and sent: ", otp); 

        res.status(200).json({ 
            status: httpStatusText.SUCCESS,
            message: 'OTP sent to your email' 
        });
    } catch (error) {
        console.error('Error sending OTP:', error);
        res.status(500).json({
            status: httpStatusText.FAIL,
            message: 'Error sending OTP'
        });
    }
};

exports.verifyOtp = async (req, res) => {
    try {
        const { email, otp } = req.body; 

        if (!email || !otp) {
            return res.status(400).json({
                status: httpStatusText.FAIL,
                message: "Email and OTP are required"
            });
        }

        const data = otpData[email];

        if (!data) {
            return res.status(400).json({
                status: httpStatusText.FAIL,
                message: "OTP not found for this email"
            });
        }

        const isOtpValid = data.otp === otp;
        const isOtpExpired = Date.now() > data.expirationTime;

        if (isOtpExpired) {
            delete otpData[email];
            return res.status(400).json({
                status: httpStatusText.FAIL,
                message: "OTP expired"
            });
        }

        if (isOtpValid) {
            delete otpData[email];
            res.status(200).json({ 
                status: httpStatusText.SUCCESS,
                message: 'OTP is valid' 
            });
        } else {
            return res.status(400).json({
                status: httpStatusText.FAIL,
                message: "OTP is invalid"
            });
        }
    } catch (error) {
        console.error('Error verifying OTP:', error);
        res.status(500).json({
            status: httpStatusText.FAIL,
            message: 'Error verifying OTP'
        });
    }
};

exports.sendOtpWithoutVerification = async (req, res) => {
    try {
        const email = req.body.email; 

        if (!email) {
            return res.status(400).json({
                status: httpStatusText.FAIL,
                message: "Email is required"
            });
        }

        const otp = otpGenerator.generateOtp(6);
        const expirationTime = Date.now() + 60 * 1000; 

        otpData[email] = { otp, expirationTime };

        await emailService.sendEmail(email, otp);

        console.log("OTP generated and sent: ", otp); 

        res.status(200).json({ 
            status: httpStatusText.SUCCESS,
            message: 'OTP sent to your email' 
        });
    } catch (error) {
        console.error('Error sending OTP:', error);
        res.status(500).json({
            status: httpStatusText.FAIL,
            message: 'Error sending OTP'
        });
    }
};
