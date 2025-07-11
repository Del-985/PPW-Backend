const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Validate that decoded payload has a userId (or equivalent)
    if (!decoded || typeof decoded.userId !== 'number') {
      return res.status(403).json({ error: 'Invalid token payload.' });
    }

    // Attach the user object (id only, or extend as needed)
    req.user = { userId: decoded.userId };

    next();
  } catch (err) {
    res.status(403).json({ error: 'Invalid or expired token.' });
  }
};

module.exports = verifyToken;
