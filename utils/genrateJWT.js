const jwt = require("jsonwebtoken");
module.exports = async (paylod) => {
  const token = await jwt.sign(paylod, process.env.JWT_SECRET_KEY);
  return token;
};