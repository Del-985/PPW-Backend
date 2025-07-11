const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Accept both admin and business users
    if (!decoded || (typeof decoded.userId !== 'number' && typeof decoded.adminId !== 'number')) {
      return res.status(403).json({ error: 'Invalid token payload.' });
    }

    // Set the appropriate user context
    if (decoded.userId) {
      req.user = { role: 'business', userId: decoded.userId };
    } else if (decoded.adminId) {
      req.user = { role: 'admin', adminId: decoded.adminId };
    }

    next();
  } catch (err) {
    res.status(403).json({ error: 'Invalid or expired token.' });
  }

  const token = req.cookies?.token;
console.log('Cookie token received:', token);
const decoded = jwt.verify(token, process.env.JWT_SECRET);
console.log('Decoded user:', decoded);

};

module.exports = verifyToken;
