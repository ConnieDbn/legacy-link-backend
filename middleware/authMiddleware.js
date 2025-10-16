const jwt = require('jsonwebtoken');
require('dotenv').config();

module.exports = function(req, res, next) {
  // Get token from header - check both Authorization and x-auth-token
  let token;
  
  // Check Authorization header first (standard approach)
  const bearerHeader = req.header('Authorization');
  if (bearerHeader && bearerHeader.startsWith('Bearer ')) {
    // Split at the space and get the token part
    token = bearerHeader.split(' ')[1];
  } else {
    // Fallback to x-auth-token header (current implementation)
    token = req.header('x-auth-token');
  }

  // Check if no token
  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  // Verify token
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded.user;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};
