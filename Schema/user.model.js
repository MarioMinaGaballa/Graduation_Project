// const mongoose =require("mongoose");
// const validator = require("validator");

// const userSchema=new mongoose.Schema({
//   firstName:{
//     type:String,
//     required:[true,"firstName is required"],
//   },
//   lastName:{
//     type:String,
//     required:[true,"lastName is required"]
//   },
//   email:{
//     type:String,
//     unquie:true,
//     required:[true,"email is required"],
//     validate:[validator.isEmail,'filed must be a valid email']
//   },
//   phone:{
//     type:String,
//     unquie:true,
//   },
//   password:{
//   type:String,
//   required:[true,"password is required"]
//   },
//   confirmPassword:{
//   type:String,
//   },
//   token:{
//     type:String
//   }


// })


// module .exports =mongoose.model("user",userSchema)