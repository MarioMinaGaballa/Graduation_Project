const nodemailer = require('nodemailer');
const smtpTransport = require('nodemailer-smtp-transport');
const { generateOtp} = require('../utils/otpGenerator');
const otp = generateOtp(6); 
let transporter = nodemailer.createTransport(
  smtpTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  })
);

exports.sendEmail = async (to, otp) => {
    const mailOptions = {
        from: `"RoadHelper200@gmail.com" <${process.env.EMAIL_USER}>`,
        to,
        subject: 'Your OTP Code',
        text: `Your OTP is ${otp} Thank You For Register🥰`,
    };
    transporter.sendMail(mailOptions, (err, info) => {
        if (err) {
          console.error('Error sending email:', err);
        } else {
          console.log('Email sent:', info.response);
        }
      });
      
};








