const asyncMiddleware = require("../middleware/async.middleware");
const httpStatusText = require("../utils/http.status.text");
const appError = require("../utils/appError");
const bcrypt = require("bcrypt");
const genrateToken = require("../utils/genrateJWT");
const userSql = require("../Schema/databasMySql");
const nodemailer = require('nodemailer');


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
    letters,
    plate_number,
    car_color,
    car_model
  } = req.body;

  // Validate required fields
  if (
    !firstName ||
    !lastName ||
    !phone ||
    !email ||
    !password ||
    !plate_number ||
    !car_color ||
    !car_model
  ) {
    return res.status(400).json({
      status: httpStatusText.FAIL,
      message: "All fields are required"
    });
  }

  try {
    // Check if user exists
    const [existingUser] = await userSql.query(
      "SELECT email FROM users WHERE email = ?",
      [email]
    );
    if (existingUser.length > 0) {
      return res.status(400).json({
        status: httpStatusText.FAIL,
        message: `Email ${email} is already registered. Please use a different email or login.`
      });
    }

    // Check if plate number already exists
    const [existingPlate] = await userSql.query(
      'SELECT id FROM car_settings WHERE plate_number = ?',
      [plate_number]
    );

    if (existingPlate.length > 0) {
      return res.status(400).json({
        status: httpStatusText.FAIL,
        message: `Plate number ${plate_number} is already registered. Please use a different plate number.`
      });
    }

    const hashedPassword = await bcrypt.hash(password, 8);

    // Start transaction
    await userSql.query('START TRANSACTION');

    try {
      // Insert user
      const [userResult] = await userSql.query(
        "INSERT INTO users (first_name, last_name, email, phone, password) VALUES (?, ?, ?, ?, ?)",
        [firstName, lastName, email, phone, hashedPassword]
      );

      const userId = userResult.insertId;

      // Insert car settings
      const [carResult] = await userSql.query(
        `INSERT INTO car_settings 
        (letters, plate_number, car_color, car_model) 
        VALUES (?, ?, ?, ?)`,
        [letters, plate_number, car_color, car_model]
      );

      // Commit transaction
      await userSql.query('COMMIT');

      const token = await genrateToken({ email, id: userId });

      // Send welcome email
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Welcome to Our Application',
        html: `
          <h2>Welcome ${firstName} ${lastName}!</h2>
          <p>Thank you for registering with us.</p>
          <p>Your account has been successfully created with the following details:</p>
          <ul>
            <li>Email: ${email}</li>
            <li>Phone: ${phone}</li>
            <li>Car Details: ${letters} ${plate_number}</li>
            <li>Car Color: ${car_color}</li>
            <li>Car Model: ${car_model}</li>
          </ul>
          <p>You can now login to your account using your email and password.</p>
          <p>If you have any questions, please don't hesitate to contact our support team at <a href="mailto:roadhelper200@gmail.com">roadhelper200@gmail.com</a>.</p>
          <p>Best regards,<br>Your Application Team</p>
        `
      };

      await transporter.sendMail(mailOptions);

      return res.status(200).json({
        status: httpStatusText.SUCCESS,
        data: {
          user: {
            id: userId,
            firstName,
            lastName,
            email,
            phone,
            token,
          },
          car: {
            id: carResult.insertId,
            letters,
            plate_number,
            car_color,
            car_model
          }
        },
        message: "Registration successful. A welcome email has been sent to your email address."
      });
    } catch (err) {
      // Rollback transaction if any error occurs
      await userSql.query('ROLLBACK');
      throw err;
    }
  } catch (err) {
    console.error("Error during registration:", err);
    return res.status(500).json({
      status: httpStatusText.FAIL,
      message: "An error occurred during registration. Please try again later."
    });
  }
});

const Login = asyncMiddleware(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    const error = appError.create(
      "Email and password are required",
      400,
      httpStatusText.FAIL
    );
    return next(error);
  }

  try {
    const [userRows] = await userSql.query(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );

    if (userRows.length === 0) {
      const error = appError.create("User Not Found", 400, httpStatusText.FAIL);
      return next(error);
    }

    const user = userRows[0]; 

    const matchedPassword = await bcrypt.compare(password, user.password);

    if (matchedPassword) {
      const token = await genrateToken({ email: user.email, id: user.User_id }); // Assuming `Usre_id` is the primary key
      return res
        .status(200)
        .json({ status: httpStatusText.SUCCESS, data: { token } });
    } else {
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

const postResetPassword = asyncMiddleware(async (req, res, next) => {
  const { email, password } = req.body;

  // Validate required fields
  if (!email || !password) {
    return res.status(400).json({
      status: httpStatusText.FAIL,
      message: "Email and password are required"
    });
  }

  // Validate password strength
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  if (!passwordRegex.test(password)) {
    return res.status(400).json({
      status: httpStatusText.FAIL,
      message: "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character"
    });
  }

  try {
    // Check if user exists
    const [userRows] = await userSql.query("SELECT * FROM users WHERE email = ?", [email]);
    if (!userRows || userRows.length === 0) {
      return res.status(404).json({
        status: httpStatusText.FAIL,
        message: "User not found"
      });
    }

    const user = userRows[0];
    
    // Check if new password is different from old password
    const isSamePassword = await bcrypt.compare(password, user.password);
    if (isSamePassword) {
      return res.status(400).json({
        status: httpStatusText.FAIL,
        message: "New password must be different from old password"
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    await userSql.query("UPDATE users SET password = ? WHERE email = ?", [hashedPassword, email]);

    // Send confirmation email
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Password Changed Successfully',
      html: `
        <h2>Password Update Confirmation</h2>
        <p>Dear ${user.first_name} ${user.last_name},</p>
        <p>Your password has been successfully changed.</p>
        <p>If you did not make this change, please contact our support team immediately at <a href="mailto:roadhelper200@gmail.com">roadhelper200@gmail.com</a>.</p>
        <p>Best regards,<br>Your Application Team</p>
      `
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({
      status: httpStatusText.SUCCESS,
      message: "Password updated successfully. A confirmation email has been sent to your email address."
    });
  } catch (err) {
    console.error("Password update error:", err);
    return res.status(500).json({
      status: httpStatusText.FAIL,
      message: "An error occurred while updating the password. Please try again later."
    });
  }
});



module.exports = {
  getAllUsers,
  register,
  Login,
  updateUser,
  postResetPassword
};