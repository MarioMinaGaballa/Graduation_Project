require("dotenv").config()
const express = require('express');
const cors = require('cors');
const compression = require('compression')
const httpStatusText = require('./utils/http.status.text');
const path = require('path');

const app = express();
const port = process.env.PORT || 3001;

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));



// Middleware
app.use(express.json());
app.use(cors());
app.use(compression());
app.use(express.urlencoded({ extended: true }));

// Routes
const otpRoutes = require('./routes/otpRoutes');
const user = require('./routes/users');



// API Routes
app.use('/api', user);
app.use('/otp', otpRoutes);
// Add API routes

// OTP verification
app.post('/verify-otp', (req, res) => {
    const userOtp = req.body.otp; 
    if (userOtp === otp) {
        res.send('OTP verified successfully.');
    } else {
        res.send('Invalid OTP.');
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.statusCode || 500).json({
        status: httpStatusText.ERROR,
        message: err.message || 'Something went wrong!',
        code: err.statusCode || 500,
        data: null
    });
});

// Handle 404
app.use((req, res) => {
    console.log('404 Not Found:', req.url);
    res.status(404).json({
        status: httpStatusText.ERROR,
        message: 'Route not found'
    });
});

// Start server with automatic port finding
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

