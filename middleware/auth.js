const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Save user info for use in route
    next();
  } catch (err) {
    res.status(403).json({ error: 'Invalid or expired token.' });
  }
};

module.exports = verifyToken;
