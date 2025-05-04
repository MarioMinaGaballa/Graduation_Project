const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const UserModel = require('../models/userModel');
require('dotenv').config();

// For debugging - remove in production
console.log('Google OAuth Config:', {
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL
});

// Google OAuth Strategy for Signup
passport.use('google-signup', new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL 
}, async (accessToken, refreshToken, profile, done) => {
    try {
        console.log('Google signup callback received with profile:', {
            id: profile.id,
            email: profile.emails[0].value,
            name: profile.displayName
        });

        // Instead of creating a user, just return the profile data
        const userData = {
            googleId: profile.id,
            email: profile.emails[0].value,
            firstName: profile.name.givenName,
            lastName: profile.name.familyName,
            profilePicture: profile.photos ? profile.photos[0].value : null
        };

        return done(null, userData);
    } catch (error) {
        console.error('Passport Google Signup Error:', error);
        return done(error);
    }
}));

// Google OAuth Strategy for Login
passport.use('google-login', new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL 
}, async (accessToken, refreshToken, profile, done) => {
    try {
        const email = profile.emails[0].value;
        console.log('Searching for user with email:', email);
        
        // Search for user by email
        const user = await UserModel.findByEmail(email);

        if (!user) {
            console.log('User not found with email:', email);
            return done(null, false);
        }

        console.log('User found:', user);
        return done(null, user);
    } catch (error) {
        console.error('Passport Google Login Error:', error);
        return done(error);
    }
}));

// Serialize user for the session
passport.serializeUser((user, done) => {
    console.log('Serializing user:', user);
    // Store the entire user object in the session
    done(null, user);
});

// Deserialize user from the session
passport.deserializeUser((user, done) => {
    try {
        console.log('Deserializing user:', user);
        // The user object is already complete, just return it
        done(null, user);
    } catch (error) {
        console.error('Deserialize error:', error);
        done(error, null);
    }
});

module.exports = passport; 