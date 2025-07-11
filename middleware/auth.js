const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Decoded JWT:', decoded);

    // ✅ Require a valid userId
    if (!decoded || typeof decoded.userId !== 'number') {
      return res.status(403).json({ error: 'Invalid token payload.' });
    }

    // ✅ Use is_admin flag to assign role
    req.user = {
      role: decoded.is_admin ? 'admin' : 'business',
      userId: decoded.userId,
      is_admin: decoded.is_admin
    };

    next();
  } catch (err) {
    console.error('JWT verification failed:', err);
    res.status(403).json({ error: 'Invalid or expired token.' });
  }
};

module.exports = verifyToken;
