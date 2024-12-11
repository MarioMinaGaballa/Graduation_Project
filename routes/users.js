const express =require('express')
const router = express.Router()
const appError = require("../utils/appError")
const userController = require('../Controllers/Users.Controller')
const verifyToken =require('../middleware/verifyToken')
//get all users
//register
//login

router.route('/')
   .get(verifyToken,userController.getAllUsers)

   router.route('/register')
   .post(userController.register,verifyToken)


router.route('/login')
   .post(userController.Login,verifyToken)


   router.route('/updateuser/:id')
.put(userController.updateUser)

router.route('/forgotPassword',verifyToken)










module.exports =router;