const UserModel = require('../models/userModel');
const { generateToken } = require('../utils/jwt');

class UserController {
    static async googleSignIn(req, res) {
        try {
            const { email, firstName, lastName, profilePicture, googleId } = req.body;

            // Check if user already exists
            let user = await UserModel.findByEmail(email);

            if (!user) {
                // User doesn't exist, redirect to signup
                return res.status(400).json({
                    status: 'error',
                    message: 'User not found. Please sign up first.',
                    redirect: '/signup'
                });
            }

            // Generate JWT token
            const token = generateToken({ userId: user.id, email: user.email });

            res.status(200).json({
                status: 'success',
                data: {
                    token,
                    user: {
                        id: user.id,
                        email: user.email,
                        firstName: user.first_name,
                        lastName: user.last_name,
                        profilePicture: user.profile_picture
                    }
                }
            });
        } catch (error) {
            console.error('Google Sign In Error:', error);
            res.status(500).json({
                status: 'error',
                message: 'Internal server error'
            });
        }
    }
}

module.exports = UserController; 