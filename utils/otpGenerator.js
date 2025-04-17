const crypto = require('crypto');
exports.generateOtp = (length = 6) => {
  const otp = crypto.randomBytes(Math.ceil(length / 2))
    .toString('hex') 
    .slice(0, length); 
  const numericOtp = otp.replace(/[^0-9]/g, '0');

  return numericOtp;
};
