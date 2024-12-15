const asyncMiddleware = require("../middleware/async.middleware");
const httpStatusText = require("../utils/http.status.text");
const appError = require("../utils/appError");
const bcrypt = require("bcrypt");
const genrateToken = require("../utils/genrateJWT");
const jwt = require("jsonwebtoken");
const userSql = require("../Schema/databasMySql");
const nodemailer = require('nodemailer');
const smtpTransport = require('nodemailer-smtp-transport');

const getAllUsers = asyncMiddleware(async (req, res) => {
  const query = req.query;
  const limit = parseInt(query.limit) || 10; // Default limit is 10
  const page = parseInt(query.page) || 1; // Default page is 1
  const offset = (page - 1) * limit;

  try {
    // Fetch users with pagination
    const [users] = await userSql.query(
      "SELECT User_id, first_name, last_name, email, phone FROM users LIMIT ? OFFSET ?",
      [limit, offset]
    );

    res.json({ status: httpStatusText.SUCCESS, data: { users } });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ status: "error", message: "Internal Server Error" });
  }
});

const register = asyncMiddleware(async (req, res, next) => {
  const {
    firstName,
    lastName,
    email,
    phone,
    password,
    confirmPassword,
    isAdmin,
  } = req.body;

  // Validate required fields
  if (
    !firstName ||
    !lastName ||
    !phone ||
    !email ||
    !password ||
    !confirmPassword
  ) {
    return next(
      appError.create("All fields are required", 400, httpStatusText.FAIL)
    );
  }

  // Validate passwords match
  if (password.trim() !== confirmPassword.trim()) {
    return next(
      appError.create(
        "Password and confirm password do not match",
        400,
        httpStatusText.FAIL
      )
    );
  }

  try {
    // Check if the user already exists
    const [existingUser] = await userSql.query(
      "SELECT email FROM users WHERE email = ?",
      [email]
    );
    if (existingUser.length > 0) {
      return next(
        appError.create("User already exists", 400, httpStatusText.FAIL)
      );
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 8);

    // Insert new user into the database
    const [result] = await userSql.query(
      "INSERT INTO users (first_name, last_name, email, phone, password, isAdmin) VALUES (?, ?, ?, ?, ?, ?)",
      [firstName, lastName, email, phone, hashedPassword, isAdmin || 0] // Default to 0 if isAdmin is not provided
    );

    // Generate a token
    const token = await genrateToken({ email, id: result.insertId });

    // Send the response with the user data and token
    return res.status(200).json({
      status: httpStatusText.SUCCESS,
      data: {
        user: {
          id: result.insertId,
          firstName,
          lastName,
          email,
          phone,
          token,
        },
      },
    });
  } catch (err) {
    console.error("Error during registration:", err);
    return next(
      appError.create("Internal Server Error", 500, httpStatusText.FAIL)
    );
  }
});

const Login = asyncMiddleware(async (req, res, next) => {
  const { email, password } = req.body;

  // Validate required fields
  if (!email || !password) {
    const error = appError.create(
      "Email and password are required",
      400,
      httpStatusText.FAIL
    );
    return next(error);
  }

  try {
    // Query MySQL to check if the user exists
    const [userRows] = await userSql.query(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );

    // Check if user is found
    if (userRows.length === 0) {
      const error = appError.create("User Not Found", 400, httpStatusText.FAIL);
      return next(error);
    }

    const user = userRows[0]; // User is the first item in the result array

    // Compare the provided password with the stored hashed password
    const matchedPassword = await bcrypt.compare(password, user.password);

    if (matchedPassword) {
      // Generate token if password matches
      const token = await genrateToken({ email: user.email, id: user.User_id }); // Assuming `Usre_id` is the primary key
      return res
        .status(200)
        .json({ status: httpStatusText.SUCCESS, data: { token } });
    } else {
      // Password mismatch error
      const error = appError.create(
        "Email or Password is incorrect. Please try again.",
        400,
        httpStatusText.FAIL
      );
      return next(error);
    }
  } catch (err) {
    console.error("Error during login:", err);
    const error = appError.create(
      "Internal Server Error",
      500,
      httpStatusText.FAIL
    );
    return next(error);
  }
});

const updateUser = asyncMiddleware(async (req, res, next) => {
  const userId = req.params.id;
  const { firstName, lastName, email, phone } = req.body;

  if (!firstName || !lastName || !email || !phone) {
    return next(
      appError.create("All fields are required", 400, httpStatusText.FAIL)
    );
  }
  const userCheckQuery = "SELECT * FROM users WHERE User_id = ?";
  const [user] = await userSql.query(userCheckQuery, [userId]);

  if (user.length === 0) {
    return res.status(404).json({
      status: "error",
      message: `User with ID ${userId} not found`,
      code: 404,
      data: null,
    });
  }

  const updateQuery = `
    UPDATE users 
    SET first_name = ?, last_name = ?, email = ?, phone = ? 
    WHERE User_id = ?
  `;
  const values = [firstName, lastName, email, phone, userId];
  try {
    const [result] = await userSql.query(updateQuery, values);
    if (result.affectedRows === 0) {
      return res.status(404).json({
        status: "error",
        message: `User with ID ${userId} not found`,
        code: 404,
        data: null,
      });
    }
    res.status(200).json({ message: "The user has been updated successfully" });
  } catch (err) {
    console.error("Error during update:", err.message);
    return next(
      appError.create(
        "An error occurred while updating the user",
        500,
        httpStatusText.FAIL
      )
    );
  }
});

const getforgotPasswordView = asyncMiddleware(async (req, res, next) => {
  res.render("frogot-password");
});

const sendforgotPasswordLink = asyncMiddleware(async (req, res, next) => {
  const { email } = req.body;
  try {
    const [userRows] = await userSql.query(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );

    if (!userRows || userRows.length === 0) {
      const error = appError.create("User not found", 404, httpStatusText.FAIL);
      return next(error);
    }
    const user = userRows[0];
    const secret = process.env.JWT_SECRET_KEY + user.password;
    const token = jwt.sign({ email: user.email, id: user.User_id }, secret, {
      expiresIn: "10m",
    });
    const link = `http://localhost:5000/api/password/reset-password/${user.User_id}/${token}`;
     // Send Email
     let transporter = nodemailer.createTransport(
       smtpTransport({
         service: 'gmail',
         auth: {
           user: process.env.EMAIL_USER,
           pass: process.env.EMAIL_PASS
         }
       })
     );
     const mailOptions = {
      from: `"RoadHelper200@gmail.com" <${process.env.EMAIL_USER}>`,
      to:user.email,
      subject: 'Reset Password',
       html:`<div>
         <h4>Click on the link below to reset your password</h4>
         <p>${link}</p>
       </div>`
  }
  transporter.sendMail(mailOptions, (err, info) => {
    if (err) {
      console.error('Error sending email:', err);
    } else {
      console.log('Email sent:', info.response);
    }
  })
  res.render("link-send")

  } catch (err) {
    next(err);
  }
});

const getResetPasswordView = asyncMiddleware(async (req, res, next) => {
  const id = req.params.id;
  const token = req.params.token;

  try {
    const [userRows] = await userSql.query("SELECT * FROM users WHERE User_id = ?", [id]);

    if (!userRows || userRows.length === 0) {
      const error = appError.create("User not found", 404, httpStatusText.FAIL);
      return next(error);
    }

    const user = userRows[0];

    const secret = process.env.JWT_SECRET_KEY + user.password;
    const decoded = jwt.verify(token, secret);

    console.log("Token verified:", decoded);

    res.render("reset-password", { email: user.email });
  } catch (err) {
    console.error("Error rendering reset-password view:", err.message);

    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
      return res.status(400).json({ message: "Invalid or expired token." });
    }

    next(err); 
  }
});

const postResetPassword = asyncMiddleware(async (req, res, next) => {
  const { id, token } = req.params;
  const { password } = req.body;

  const [userRows] = await userSql.query("SELECT * FROM users WHERE User_id = ?", [id]);

  if (!userRows || userRows.length === 0) {
    const error = appError.create("User not found", 404, httpStatusText.FAIL);
    return next(error);
  }

  const user = userRows[0]; 

  const secret = process.env.JWT_SECRET_KEY + user.password;
  try {
    jwt.verify(token, secret); 

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    await userSql.query("UPDATE users SET password = ? WHERE User_id = ?", [hashedPassword, id]);

    res.render("success-password"); 
  } catch (err) {
    console.error("Password reset error:", err);
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
      return res.status(400).json({ message: "Invalid or expired token" });
    }
    next(err); 
  }
});


module.exports = {
  getAllUsers,
  register,
  Login,
  updateUser,
  sendforgotPasswordLink,
  getforgotPasswordView,
  getResetPasswordView,
  postResetPassword
};
