require("dotenv").config()
const express = require('express');
const cors = require('cors');const compression= require('compression')
const httpStatusText = require('./utils/http.status.text');
const app = express();
const port = process.env.PORT
app.use(express.json());
app.use(cors());
app.use(compression())
app.use(express.urlencoded({extended:false}));
const otpRoutes = require('./routes/otpRoutes');
const userRoutes = require('./routes/users')
app.set('view engine', 'ejs');
app.set('views', './views');


// MongoDB
// mongoose.connect(url)
//   .then(() => console.log('MongoDB connected successfully'))
//   .catch((err) => console.log(err));



app.use('/api',userRoutes)
app.use('/otp', otpRoutes);
app.post('/verify-otp', (req, res) => {
  const userOtp = req.body.otp; 
  if (userOtp === otp) {
      res.send('OTP verified successfully.');
  } else {
      res.send('Invalid OTP.');
  }
});

  
app.use((error,req,res,next)=>{
  res.status(error.statusCode || 500).json({status:httpStatusText.ERROR|| httpStatusText.ERROR,message:error.message,code:error.statusCode || 500,data:null })
})
app.listen(port, () => {
  console.log('Server running on port 5000');
});
