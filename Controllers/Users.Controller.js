const asyncMiddleware = require("../middleware/async.middleware");
const httpStatusText = require("../utils/http.status.text"); 
const User =require('../Schema/user.model');
const appError =require("../utils/appError");
const bycrpt= require('bcrypt'); 
const genrateToken =require("../utils/genrateJWT");

const getAllUsers =asyncMiddleware( async (req, res) => {

  const query = req.query
const limit = query.limit|| 10;//2
const page =query.page || 1;//3
const skip = (page-1)*limit
  // get all courses from DB using Course Model
  const  users = await  User.find({},{"__v":false,"password":false,"token":false}).limit(limit).skip(skip);
  res.json({ status: httpStatusText.SUCCESS, data: { users } });
})


const register = asyncMiddleware(async (req, res, next) => {
  const { firstName, lastName, email,phone, password, confirmPassword} = req.body;
     console.log(req.body);

  if (!firstName || !lastName ||!phone|| !email || !password, !confirmPassword) {
    return next(appError.create("All fields are required", 400, httpStatusText.FAIL));
  }
 
  if(password.trim() !== confirmPassword.trim()) {
    return next(appError.create("Password and confirm password do not match", 400, httpStatusText.FAIL));
  }

  const existingUser = await User.findOne({ email }).exec();  
  if (existingUser) {
    return next(appError.create("User already exists", 400, httpStatusText.FAIL));
  }


  const hashedPassword = await bycrpt.hash(password, 8); 
  const newUser = new User({
    firstName,
    lastName,
    email,
    phone,
    password: hashedPassword,
    "__v":false,
  });

  await newUser.save(); 
  const token = await genrateToken({ email: newUser.email, id: newUser._id });

  newUser.token = token;

  return res.status(200).json({ status: httpStatusText.SUCCESS, data: { user: newUser } });
});

const Login =asyncMiddleware(async (req, res,next) => {
     
  const { email, password } = req.body;

  
  
 if(!email||!password){
  const error=appError.create("email and password are required",400,httpStatusText.FAIL)
  return  next(error)
 }
 
 
 const user = await User.findOne({ email }); 
  
if(!user){
  const error=appError.create("User Not Found",400,httpStatusText.FAIL)
  return  next(error)
}


 const matcedPassword = await bycrpt.compare(password, user.password)
 if(user&&matcedPassword){
  const token = await genrateToken({email:user.email,id:user._id})
  return res.status(200).json({ status: httpStatusText.SUCCESS, data: {token} });
 }else{
  const error=appError.create("Email Or Password is Wrong Please Try Again",400,httpStatusText.FAIL)
  return  next(error)
 }
})


module.exports={
  getAllUsers,
  register,
  Login
}