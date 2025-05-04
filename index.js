require("dotenv").config()
const express = require('express');
const cors = require('cors');
const compression = require('compression')
const httpStatusText = require('./utils/http.status.text');
const session = require('express-session');
const passport = require('./config/passport');
const path = require('path');

const app = express();
const port = process.env.PORT || 3001;

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


// For debugging - remove in production
console.log('Server Configuration:', {
    port: process.env.PORT,
    callbackURL: process.env.GOOGLE_CALLBACK_URL,
    clientID: process.env.GOOGLE_CLIENT_ID ? 'Set' : 'Not Set',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ? 'Set' : 'Not Set'
});

// Middleware
app.use(express.json());
app.use(cors());
app.use(compression());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'your_secret_key',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Initialize Passport and restore authentication state from session
app.use(passport.initialize());
app.use(passport.session());

// Routes
const otpRoutes = require('./routes/otpRoutes');
const user = require('./routes/users');

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'view.html'));
})
// Google Signup Routes
app.get('/auth/google/signup',
    (req, res, next) => {
        console.log('Starting Google signup...');
        req.session.authType = 'signup';
        next();
    },
    passport.authenticate('google-signup', { 
        scope: ['profile', 'email'],
        prompt: 'select_account'
    })
);

// Google Login Routes
app.get('/auth/google/login',
    (req, res, next) => {
        console.log('Starting Google login...');
        req.session.authType = 'login';
        next();
    },
    passport.authenticate('google-login', { 
        scope: ['profile', 'email'],
        prompt: 'select_account'
    })
);


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

