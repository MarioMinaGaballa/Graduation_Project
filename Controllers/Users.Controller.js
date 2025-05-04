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
      console.log('New user created with ID:', userId);

      // Insert car settings with user_id
      const [carResult] = await userSql.query(
        `INSERT INTO car_settings 
        (user_id, letters, plate_number, car_color, car_model) 
        VALUES (?, ?, ?, ?, ?)`,
        [userId, letters, plate_number, car_color, car_model]
      );

      console.log('Car settings created for user:', userId);

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
      console.error('Error during registration transaction:', err);
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
    // Check if user exists
    const [userRows] = await userSql.query(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );

    if (userRows.length === 0) {
      // User doesn't exist, redirect to signup
      return res.status(400).json({
        status: httpStatusText.FAIL,
        message: "User not found. Please sign up first.",
        redirect: "/signup"
      });
    }

    const user = userRows[0]; 

    const matchedPassword = await bcrypt.compare(password, user.password);

    if (matchedPassword) {
      const token = await genrateToken({ email: user.email, id: user.User_id });
      return res
        .status(200)
        .json({ 
          status: httpStatusText.SUCCESS, 
          data: { token },
          message: "Login successful"
        });
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

const updateUserAndCar = asyncMiddleware(async (req, res, next) => {
  const { email, firstName, lastName, phone, letters, plate_number, car_color, car_model } = req.body;

  // تحقق من وجود المستخدم أولاً
  const userCheckQuery = "SELECT User_id, first_name, last_name, phone FROM users WHERE email = ?";
  const [userRows] = await userSql.query(userCheckQuery, [email]);
  if (userRows.length === 0) {
    return res.status(404).json({ status: "error", message: "User not found" });
  }
  const userId = userRows[0].User_id;

  // جلب بيانات السيارة القديمة
  const carCheckQuery = "SELECT letters, plate_number, car_color, car_model FROM car_settings WHERE user_id = ?";
  const [carRows] = await userSql.query(carCheckQuery, [userId]);
  const oldCar = carRows[0] || {};

  // استخدم القيم القديمة لو القيم الجديدة فاضية أو undefined أو null
  function keepOld(newValue, oldValue) {
    return (newValue !== undefined && newValue !== null && newValue !== "") ? newValue : oldValue;
  }

  const updatedFirstName = keepOld(firstName, userRows[0].first_name);
  const updatedLastName = keepOld(lastName, userRows[0].last_name);
  const updatedPhone = keepOld(phone, userRows[0].phone);

  const updateUserQuery = `
    UPDATE users 
    SET first_name = ?, last_name = ?, phone = ?
    WHERE email = ?
  `;
  await userSql.query(updateUserQuery, [updatedFirstName, updatedLastName, updatedPhone, email]);

  const updatedLetters = keepOld(letters, oldCar.letters);
  const updatedPlateNumber = keepOld(plate_number, oldCar.plate_number);
  const updatedCarColor = keepOld(car_color, oldCar.car_color);
  const updatedCarModel = keepOld(car_model, oldCar.car_model);

  const updateCarQuery = `
    UPDATE car_settings
    SET letters = ?, plate_number = ?, car_color = ?, car_model = ?
    WHERE user_id = ?
  `;
  await userSql.query(updateCarQuery, [updatedLetters, updatedPlateNumber, updatedCarColor, updatedCarModel, userId]);

  // إرجاع القيم النهائية (المحدثة أو القديمة)
  res.status(200).json({
    status: "success",
    message: "User and car updated successfully",
    user: {
      email,
      firstName: updatedFirstName,
      lastName: updatedLastName,
      phone: updatedPhone
    },
    car: {
      letters: updatedLetters,
      plate_number: updatedPlateNumber,
      car_color: updatedCarColor,
      car_model: updatedCarModel
    }
  });
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

const getUserData = asyncMiddleware(async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({
            status: httpStatusText.FAIL,
            message: "Email is required"
        });
    }

    try {
        console.log('Searching for user with email:', email);
        
        // First check if user exists
        const [userCheck] = await userSql.query(
            "SELECT User_id FROM users WHERE email = ?",
            [email]
        );
        
        if (userCheck.length === 0) {
            console.log('User not found in users table');
            return res.status(404).json({
                status: httpStatusText.FAIL,
                message: "User not found"
            });
        }

        const userId = userCheck[0].User_id;
        console.log('Found user with ID:', userId);

        // Get complete user data with car settings
        const [userData] = await userSql.query(
            `SELECT u.User_id, u.first_name, u.last_name, u.email, u.phone,
                    cs.letters, cs.plate_number, cs.car_color, cs.car_model
             FROM users u
             LEFT JOIN car_settings cs ON u.User_id = cs.user_id
             WHERE u.email = ?`,
            [email]
        );

        console.log('Complete user data:', userData);

        if (userData.length === 0) {
            return res.status(404).json({
                status: httpStatusText.FAIL,
                message: "User data not found"
            });
        }

        const user = userData[0];
        
        // رجع البيانات زي ما هي حتى لو كلها null
        res.status(200).json({
            status: httpStatusText.SUCCESS,
            data: {
                user: {
                    id: user.User_id,
                    firstName: user.first_name,
                    lastName: user.last_name,
                    email: user.email,
                    phone: user.phone
                },
                car: {
                    letters: user.letters,
                    plateNumber: user.plate_number,
                    carColor: user.car_color,
                    carModel: user.car_model
                }
            }
        });
    } catch (error) {
        console.error("Error fetching user data:", error);
        res.status(500).json({
            status: httpStatusText.FAIL,
            message: "Internal Server Error"
        });
    }
});

module.exports = {
  getAllUsers,
  register,
  Login,
  updateUserAndCar,
  postResetPassword,
  getUserData
};