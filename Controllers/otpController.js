
const otpGenerator = require('../utils/otpGenerator');
const emailService = require('../middleware/emailService');

let otpData = {}; 

exports.sendOtp = async (req, res) => {
    const email = req.body.email; 
    const otp = otpGenerator.generateOtp(6);
    const expirationTime = Date.now() +  60 * 1000; 

    otpData[email] = { otp, expirationTime };

    await emailService.sendEmail(email, otp);

    console.log("OTP generated and sent: ", otp); 

    res.status(200).json({ message: 'OTP sent successfully' });
};

exports.verifyOtp = (req, res) => {
  const { email, otp } = req.body; 
  const data = otpData[email];

  if (!data) {
      console.log("No OTP found for this email.");
      return res.status(400).json({ message: 'No OTP found for this email.' });
  }

  const isOtpValid = data.otp === otp;
  const isOtpExpired = Date.now() > data.expirationTime;

  if (isOtpExpired) {
      delete otpData[email];
      console.log("OTP expired.");
      return res.status(400).json({ message: 'OTP expired.' });
  }

  if (isOtpValid) {
      console.log("OTP is valid.");
      delete otpData[email];
      return res.status(200).json({ message: 'OTP is valid.' });
  } else {
      console.log("OTP is invalid.");
      return res.status(400).json({ message: 'Invalid OTP.' });
  }
};

