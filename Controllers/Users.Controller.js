const asyncMiddleware = require("../middleware/async.middleware");
const httpStatusText = require("../utils/http.status.text");
const appError = require("../utils/appError");
const bcrypt = require("bcrypt");
const genrateToken = require("../utils/genrateJWT");
const userSql = require("../Schema/databasMySql");
const nodemailer = require("nodemailer");
const multer = require('multer');

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
    car_model,
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
      message: "All fields are required",
    });
  }

  try {
    const [existingUser1] = await userSql.query(
      "SELECT email FROM usersgmail WHERE email = ?",
      [email]
    );
    const [existingUser2] = await userSql.query(
      "SELECT email FROM users WHERE email = ?",
      [email]
    );

    if (existingUser1.length > 0) {
      return res.status(400).json({
        status: httpStatusText.FAIL,
        message: `Email ${email} is already registered. Please use a different email or login.`,
      });
    }
    if (existingUser2.length > 0) {
      return res.status(400).json({
        status: httpStatusText.FAIL,
        message: `Email ${email} is already registered. Please use a different email or login.`,
      });
    }
    // Check if plate number already exists
    const [existingPlate1] = await userSql.query(
      "SELECT id FROM car_settings WHERE plate_number = ?",
      [plate_number]
    );
    const [existingPlate2] = await userSql.query(
      "SELECT id FROM usersgmail WHERE car_number = ?",
      [plate_number]
    );

    if (existingPlate1.length > 0) {
      return res.status(400).json({
        status: httpStatusText.FAIL,
        message: `Plate number ${plate_number} is already registered. Please use a different plate number.`,
      });
    }
    if (existingPlate2.length > 0) {
      return res.status(400).json({
        status: httpStatusText.FAIL,
        message: `Car number ${car_number} is already registered. Please use a different car number.`,
      });
    }

    const hashedPassword = await bcrypt.hash(password, 8);

    // Start transaction
    await userSql.query("START TRANSACTION");

    try {
      // Insert user
      const [userResult] = await userSql.query(
        "INSERT INTO users (first_name, last_name, email, phone, password) VALUES (?, ?, ?, ?, ?)",
        [firstName, lastName, email, phone, hashedPassword]
      );

      const userId = userResult.insertId;
      console.log("New user created with ID:", userId);

      // Insert car settings with user_id
      const [carResult] = await userSql.query(
        `INSERT INTO car_settings
        (user_id, letters, plate_number, car_color, car_model)
        VALUES (?, ?, ?, ?, ?)`,
        [userId, letters, plate_number, car_color, car_model]
      );

      console.log("Car settings created for user:", userId);

      // Commit transaction
      await userSql.query("COMMIT");

      const token = await genrateToken({ email, id: userId });

      // Send welcome email
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Welcome to Our Application",
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
        `,
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
            car_model,
          },
        },
        message:
          "Registration successful. A welcome email has been sent to your email address.",
      });
    } catch (err) {
      // Rollback transaction if any error occurs
      await userSql.query("ROLLBACK");
      console.error("Error during registration transaction:", err);
      throw err;
    }
  } catch (err) {
    console.error("Error during registration:", err);
    return res.status(500).json({
      status: httpStatusText.FAIL,
      message: "An error occurred during registration. Please try again later.",
    });
  }
});

const upload = multer({ dest: 'uploads/' });

const registerNewUser = asyncMiddleware(async (req, res, next) => {
  // استخراج البيانات من req.body مع دعم الأسماء بأحرف كبيرة أو صغيرة
  const firstName = req.body.firstName || req.body.firstname;
  const lastName = req.body.lastName || req.body.lastname;
  const email = req.body.email;
  const phone = req.body.phone;
  const car_number = req.body.car_number;
  const car_color = req.body.car_color;
  const car_model = req.body.car_model;

  // Check for missing fields
  const missingFields = [];
  if (!firstName) missingFields.push("First Name");
  if (!lastName) missingFields.push("Last Name");
  if (!email) missingFields.push("Email");
  if (!phone) missingFields.push("Phone");
  if (!car_number) missingFields.push("Car Number");
  if (!car_color) missingFields.push("Car Color");
  if (!car_model) missingFields.push("Car Model");
  if (!req.file) missingFields.push("Profile Picture");

  if (missingFields.length > 0) {
    return res.status(400).json({
      status: httpStatusText.FAIL,
      message: "Missing required fields",
      missingFields: missingFields,
    });
  }

  try {
    // Check if user exists
    const [existingUser1] = await userSql.query(
      "SELECT email FROM usersgmail WHERE email = ?",
      [email]
    );
    const [existingUser2] = await userSql.query(
      "SELECT email FROM users WHERE email = ?",
      [email]
    );

    if (existingUser1.length > 0) {
      return res.status(400).json({
        status: httpStatusText.FAIL,
        message: `Email ${email} is already registered. Please use a different email or login.`,
      });
    }
    if (existingUser2.length > 0) {
      return res.status(400).json({
        status: httpStatusText.FAIL,
        message: `Email ${email} is already registered. Please use a different email or login.`,
      });
    }
    const [existingPlate1] = await userSql.query(
      "SELECT id FROM car_settings WHERE plate_number = ?",
      [car_number]
    );
    const [existingPlate2] = await userSql.query(
      "SELECT id FROM usersgmail WHERE car_number = ?",
      [car_number]
    );

    if (existingPlate1.length > 0) {
      return res.status(400).json({
        status: httpStatusText.FAIL,
        message: `Plate number ${car_number} is already registered. Please use a different plate number.`,
      });
    }
    if (existingPlate2.length > 0) {
      return res.status(400).json({
        status: httpStatusText.FAIL,
        message: `Car number ${car_number} is already registered. Please use a different car number.`,
      });
    }

    // Start transaction
    await userSql.query("START TRANSACTION");

    try {
      // إنشاء رابط للصورة المرفوعة
      const profilePicturePath = req.file ? req.file.path : null;
      const filename = req.file ? req.file.filename : null;
      const imageUrl = filename ? `http://localhost:3001/uploads/${filename}` : null;

      // Insert user with all data in usersgmail
      const [userResult] = await userSql.query(
        "INSERT INTO usersgmail (first_name, last_name, email, phone, profile_picture, car_number, car_color, car_model) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [firstName, lastName, email, phone, imageUrl, car_number, car_color, car_model]
      );

      const userId = userResult.insertId;
      console.log("New user created with ID:", userId);

      // Commit transaction
      await userSql.query("COMMIT");

      // Send welcome email
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Welcome to Our Application",
        html: `
          <h2>Welcome ${firstName} ${lastName}!</h2>
          <p>Thank you for registering with us.</p>
          <p>Your account has been successfully created with the following details:</p>
          <ul>
            <li>Email: ${email}</li>
            <li>Phone: ${phone}</li>
            <li>Car Number: ${car_number}</li>
            <li>Car Color: ${car_color}</li>
            <li>Car Model: ${car_model}</li>
          </ul>
          <p>You can now login to your account using your email and password.</p>
          <p>If you have any questions, please don't hesitate to contact our support team at <a href="mailto:roadhelper200@gmail.com">roadhelper200@gmail.com</a>.</p>
          <p>Best regards,<br>Your Application Team</p>
        `,
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
            profile_picture: imageUrl,
            car_number,
            car_color,
            car_model,
          },
        },
        message:
          "Registration successful. A welcome email has been sent to your email address.",
      });
    } catch (err) {
      // Rollback transaction if any error occurs
      await userSql.query("ROLLBACK");
      console.error("Error during registration:", err);
      throw err;
    }
  } catch (err) {
    console.error("Error during registration:", err);
    return res.status(500).json({
      status: httpStatusText.FAIL,
      message: "An error occurred during registration. Please try again later.",
    });
  }
});

const SignUp = asyncMiddleware(async (req, res, next) => {
  const { firstName, lastName, email, phone, password } = req.body;

  // Validate required fields
  if (!firstName || !lastName || !phone || !email || !password) {
    return res.status(400).json({
      status: httpStatusText.FAIL,
      message: "All fields are required",
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
        message: `Email ${email} is already registered. Please use a different email or login.`,
      });
    }

    const hashedPassword = await bcrypt.hash(password, 8);

    // Start transaction
    await userSql.query("START TRANSACTION");

    try {
      // Insert user
      const [userResult] = await userSql.query(
        "INSERT INTO users (first_name, last_name, email, phone, password) VALUES (?, ?, ?, ?, ?)",
        [firstName, lastName, email, phone, hashedPassword]
      );

      const userId = userResult.insertId;
      console.log("New user created with ID:", userId);

      // Commit transaction
      await userSql.query("COMMIT");

      const token = await genrateToken({ email, id: userId });

      // Send welcome email
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Welcome to Our Application",
        html: `
          <h2>Welcome ${firstName} ${lastName}!</h2>
          <p>Thank you for registering with us.</p>
          <p>Your account has been successfully created with the following details:</p>
          <ul>
            <li>Email: ${email}</li>
            <li>Phone: ${phone}</li>
          </ul>
          <p>You can now login to your account using your email and password.</p>
          <p>If you have any questions, please don't hesitate to contact our support team at <a href="mailto:roadhelper200@gmail.com">roadhelper200@gmail.com</a>.</p>
          <p>Best regards,<br>Your Application Team</p>
        `,
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
        },
        message:
          "Registration successful. A welcome email has been sent to your email address.",
      });
    } catch (err) {
      // Rollback transaction if any error occurs
      await userSql.query("ROLLBACK");
      console.error("Error during registration transaction:", err);
      throw err;
    }
  } catch (err) {
    console.error("Error during registration:", err);
    return res.status(500).json({
      status: httpStatusText.FAIL,
      message: "An error occurred during registration. Please try again later.",
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
        redirect: "/signup",
      });
    }

    const user = userRows[0];

    const matchedPassword = await bcrypt.compare(password, user.password);

    if (matchedPassword) {
      const token = await genrateToken({ email: user.email, id: user.User_id });
      return res.status(200).json({
        status: httpStatusText.SUCCESS,
        data: { token },
        message: "Login successful",
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
  const {
    email,
    firstName,
    lastName,
    phone,
    letters,
    plate_number,
    car_color,
    car_model,
    license_number,
  } = req.body;

  // تحقق من وجود المستخدم أولاً
  const userCheckQuery =
    "SELECT User_id, first_name, last_name, phone FROM users WHERE email = ?";
  const [userRows] = await userSql.query(userCheckQuery, [email]);
  if (userRows.length === 0) {
    return res.status(404).json({ status: "error", message: "User not found" });
  }
  const userId = userRows[0].User_id;

  // جلب بيانات السيارة القديمة
  const carCheckQuery =
    "SELECT letters, plate_number, car_color, car_model, license_number FROM car_settings WHERE user_id = ?";
  const [carRows] = await userSql.query(carCheckQuery, [userId]);
  const oldCar = carRows[0] || {};

  // استخدم القيم القديمة لو القيم الجديدة فاضية أو undefined أو null
  function keepOld(newValue, oldValue) {
    return newValue !== undefined && newValue !== null && newValue !== ""
      ? newValue
      : oldValue;
  }

  const updatedFirstName = keepOld(firstName, userRows[0].first_name);
  const updatedLastName = keepOld(lastName, userRows[0].last_name);
  const updatedPhone = keepOld(phone, userRows[0].phone);

  const updateUserQuery = `
    UPDATE users
    SET first_name = ?, last_name = ?, phone = ?
    WHERE email = ?
  `;
  await userSql.query(updateUserQuery, [
    updatedFirstName,
    updatedLastName,
    updatedPhone,
    email,
  ]);

  const updatedLetters = keepOld(letters, oldCar.letters);
  const updatedPlateNumber = keepOld(plate_number, oldCar.plate_number);
  const updatedCarColor = keepOld(car_color, oldCar.car_color);
  const updatedCarModel = keepOld(car_model, oldCar.car_model);
  const updatedLicenseNumber = keepOld(license_number, oldCar.license_number);

  const updateCarQuery = `
    UPDATE car_settings
    SET letters = ?, plate_number = ?, car_color = ?, car_model = ?, license_number = ?
    WHERE user_id = ?
  `;
  await userSql.query(updateCarQuery, [
    updatedLetters,
    updatedPlateNumber,
    updatedCarColor,
    updatedCarModel,
    updatedLicenseNumber,
    userId,
  ]);

  // إرجاع القيم النهائية (المحدثة أو القديمة)
  res.status(200).json({
    status: "success",
    message: "User and car updated successfully",
    user: {
      email,
      firstName: updatedFirstName,
      lastName: updatedLastName,
      phone: updatedPhone,
    },
    car: {
      letters: updatedLetters,
      plate_number: updatedPlateNumber,
      car_color: updatedCarColor,
      car_model: updatedCarModel,
      license_number: updatedLicenseNumber,
    },
  });
});

const updateUserAndCawithGoogle = asyncMiddleware(async (req, res, next) => {
  

  // Extract form data
  const email = req.body.email;
  const firstName = req.body.firstName;
  const lastName = req.body.lastName;
  const phone = req.body.phone;
  const car_number = req.body.car_number;
  const car_color = req.body.car_color;
  const car_model = req.body.car_model;

  // Handle profile picture
  let profile_picture = undefined; // خليها undefined عشان نفرق بين عدم الإرسال والإرسال بقيمة فاضية
  if (req.file) {
    const filename = req.file.filename;
    profile_picture = filename ? `http://localhost:3001/uploads/${filename}` : null;
    console.log("Profile picture URL:", profile_picture);
  } else if (req.body.profile_picture === "") {
    // لو أرسل صورة فاضية (يمسح الصورة)
    profile_picture = null;
  }

  console.log("Extracted email:", email);
  console.log("All extracted fields:", {
    email, firstName, lastName, phone, profile_picture, car_number, car_color, car_model
  });

  // Validate that email is provided
  if (!email) {
    console.log("Email validation failed - email is falsy:", email);
    return res.status(400).json({
      status: "error",
      message: "Email is required"
    });
  }

  try {
    // تحقق من وجود المستخدم أولاً في جدول usersgmail
    const userCheckQuery = "SELECT * FROM usersgmail WHERE email = ?";
    const [userRows] = await userSql.query(userCheckQuery, [email]);
    console.log("User search result:", userRows);

    if (userRows.length === 0) {
      // إذا لم يكن المستخدم موجودًا، قم بإنشائه
      console.log("User not found, creating new user with email:", email);

      // إنشاء مستخدم جديد
      // Make sure email is not null
      if (!email) {
        return res.status(400).json({
          status: "error",
          message: "Email is required and cannot be null"
        });
      }

      // Set default values for null fields
      const safeFirstName = firstName || "";
      const safeLastName = lastName || "";
      const safePhone = phone || "";
      const safeProfilePicture = profile_picture || "";
      const safeCarNumber = car_number || "";
      const safeCarColor = car_color || "";
      const safeCarModel = car_model || "";

      const insertQuery = `
        INSERT INTO usersgmail
        (email, first_name, last_name, phone, profile_picture, car_number, car_color, car_model)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const [insertResult] = await userSql.query(insertQuery, [
        email,
        safeFirstName,
        safeLastName,
        safePhone,
        safeProfilePicture,
        safeCarNumber,
        safeCarColor,
        safeCarModel
      ]);

      console.log("New user created with ID:", insertResult.insertId);

      // إرجاع البيانات المدخلة
      return res.status(201).json({
        status: "success",
        message: "New user created successfully",
        user: {
          email,
          firstName: safeFirstName,
          lastName: safeLastName,
          phone: safePhone,
          profile_picture: safeProfilePicture,
          car_number: safeCarNumber,
          car_color: safeCarColor,
          car_model: safeCarModel,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      });
    }

    const oldUser = userRows[0];

    // استخدم القيم القديمة لو القيم الجديدة فاضية أو undefined أو null
    function keepOld(newValue, oldValue) {
      return newValue !== undefined ? newValue : oldValue;
    }

    const updatedFirstName = keepOld(firstName, oldUser.first_name);
    const updatedLastName = keepOld(lastName, oldUser.last_name);
    const updatedPhone = keepOld(phone, oldUser.phone);
    const updatedProfilePicture = keepOld(profile_picture, oldUser.profile_picture);
    const updatedCarNumber = keepOld(car_number, oldUser.car_number);
    const updatedCarColor = keepOld(car_color, oldUser.car_color);
    const updatedCarModel = keepOld(car_model, oldUser.car_model);

    // تحديث بيانات المستخدم والسيارة في جدول usersgmail
    const updateUserQuery = `
      UPDATE usersgmail
      SET first_name = ?,
          last_name = ?,
          phone = ?,
          profile_picture = ?,
          car_number = ?,
          car_color = ?,
          car_model = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE email = ?
    `;

    await userSql.query(updateUserQuery, [
      updatedFirstName,
      updatedLastName,
      updatedPhone,
      updatedProfilePicture,
      updatedCarNumber,
      updatedCarColor,
      updatedCarModel,
      email,
    ]);

    // إرجاع القيم النهائية (المحدثة أو القديمة)
    res.status(200).json({
      status: "success",
      message: "User and car updated successfully",
      user: {
        email,
        firstName: updatedFirstName,
        lastName: updatedLastName,
        phone: updatedPhone,
        profile_picture: updatedProfilePicture,
        car_number: updatedCarNumber,
        car_color: updatedCarColor,
        car_model: updatedCarModel,
        created_at: oldUser.created_at,
        updated_at: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error("Error updating Google user:", error);
    res.status(500).json({
      status: "error",
      message: "An error occurred while updating the user",
      error: error.message
    });
  }
});

const postResetPassword = asyncMiddleware(async (req, res, next) => {
  const { email, password } = req.body;

  // Validate required fields
  if (!email || !password) {
    return res.status(400).json({
      status: httpStatusText.FAIL,
      message: "Email and password are required",
    });
  }

  // Validate password strength
  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  if (!passwordRegex.test(password)) {
    return res.status(400).json({
      status: httpStatusText.FAIL,
      message:
        "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character",
    });
  }

  try {
    // Check if user exists
    const [userRows] = await userSql.query(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );
    if (!userRows || userRows.length === 0) {
      return res.status(404).json({
        status: httpStatusText.FAIL,
        message: "User not found",
      });
    }

    const user = userRows[0];

    // Check if new password is different from old password
    const isSamePassword = await bcrypt.compare(password, user.password);
    if (isSamePassword) {
      return res.status(400).json({
        status: httpStatusText.FAIL,
        message: "New password must be different from old password",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    await userSql.query("UPDATE users SET password = ? WHERE email = ?", [
      hashedPassword,
      email,
    ]);

    // Send confirmation email
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Password Changed Successfully",
      html: `
        <h2>Password Update Confirmation</h2>
        <p>Dear ${user.first_name} ${user.last_name},</p>
        <p>Your password has been successfully changed.</p>
        <p>If you did not make this change, please contact our support team immediately at <a href="mailto:roadhelper200@gmail.com">roadhelper200@gmail.com</a>.</p>
        <p>Best regards,<br>Your Application Team</p>
      `,
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({
      status: httpStatusText.SUCCESS,
      message:
        "Password updated successfully. A confirmation email has been sent to your email address.",
    });
  } catch (err) {
    console.error("Password update error:", err);
    return res.status(500).json({
      status: httpStatusText.FAIL,
      message:
        "An error occurred while updating the password. Please try again later.",
    });
  }
});

const getUserData = asyncMiddleware(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      status: httpStatusText.FAIL,
      message: "Email is required",
    });
  }

  try {
    console.log("Searching for user with email:", email);

    // First check if user exists
    const [userCheck] = await userSql.query(
      "SELECT User_id FROM users WHERE email = ?",
      [email]
    );

    if (userCheck.length === 0) {
      console.log("User not found in users table");
      return res.status(404).json({
        status: httpStatusText.FAIL,
        message: "User not found",
      });
    }

    const userId = userCheck[0].User_id;
    console.log("Found user with ID:", userId);

    // Get complete user data with car settings
    const [userData] = await userSql.query(
      `SELECT u.User_id, u.first_name, u.last_name, u.email, u.phone,
                    cs.letters, cs.plate_number, cs.car_color, cs.car_model
             FROM users u
             LEFT JOIN car_settings cs ON u.User_id = cs.user_id
             WHERE u.email = ?`,
      [email]
    );

    console.log("Complete user data:", userData);

    if (userData.length === 0) {
      return res.status(404).json({
        status: httpStatusText.FAIL,
        message: "User data not found",
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
          phone: user.phone,
        },
        car: {
          letters: user.letters,
          plateNumber: user.plate_number,
          carColor: user.car_color,
          carModel: user.car_model,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching user data:", error);
    res.status(500).json({
      status: httpStatusText.FAIL,
      message: "Internal Server Error",
    });
  }
});
const getUserGoogle = asyncMiddleware(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      status: httpStatusText.FAIL,
      message: "Email is required",
    });
  }

  try {
    console.log("Searching for user with email:", email);

    // First check if user exists
    const [userCheck] = await userSql.query(
      "SELECT id FROM usersgmail WHERE email = ?",
      [email]
    );

    if (userCheck.length === 0) {
      console.log("User not found in users table");
      return res.status(404).json({
        status: httpStatusText.FAIL,
        message: "User not found",
      });
    }

    const userId = userCheck[0].id;
    console.log("Found user with ID:", userId);

    // Get complete user data from usersgmail table
    const [userData] = await userSql.query(
      `SELECT id, first_name, last_name, email, phone, profile_picture,
              car_number, car_color, car_model, created_at, updated_at
       FROM usersgmail
       WHERE email = ?`,
      [email]
    );

    console.log("Complete user data:", userData);

    if (userData.length === 0) {
      return res.status(404).json({
        status: httpStatusText.FAIL,
        message: "User data not found",
      });
    }

    const user = userData[0];

    // رجع البيانات زي ما هي حتى لو كلها null
    res.status(200).json({
      status: httpStatusText.SUCCESS,
      data: {
        user: {
          id: user.id,
          firstName: user.first_name,
          lastName: user.last_name,
          email: user.email,
          phone: user.phone,
          profile_picture: user.profile_picture,
          car_number: user.car_number,
          car_color: user.car_color,
          car_model: user.car_model,
          created_at: user.created_at,
          updated_at: user.updated_at
        }
      },
    });
  } catch (error) {
    console.error("Error fetching user data:", error);
    res.status(500).json({
      status: httpStatusText.FAIL,
      message: "Internal Server Error",
    });
  }
});

// Create car settings for user after Google login

module.exports = {
  getAllUsers,
  register,
  registerNewUser,
  SignUp,
  Login,
  updateUserAndCar,
  updateUserAndCawithGoogle,
  postResetPassword,
  getUserData,
  getUserGoogle
};
