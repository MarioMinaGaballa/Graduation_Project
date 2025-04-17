require('dotenv').config();
module.exports = {
    emailService: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
};
