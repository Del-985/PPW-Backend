const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  console.log(`[${new Date().toISOString()}] verifyToken called for ${req.method} ${req.originalUrl}`);

  // Get JWT from httpOnly cookie
  const token = req.cookies?.token;

  if (!token) {
    console.warn('Access denied: No token provided');
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    // Verify and decode JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Decoded JWT:', decoded);

    // Must have a numeric userId
    if (!decoded || typeof decoded.userId !== 'number') {
      console.warn('Invalid token payload:', decoded);
      return res.status(403).json({ error: 'Invalid token payload.' });
    }

    // Attach user info to request for downstream routes
    req.user = {
      userId: decoded.userId,
      is_admin: !!decoded.is_admin,         // Boolean
      role: decoded.is_admin ? 'admin' : 'business'
    };

    console.log('User set in request:', req.user);
    next();
  } catch (err) {
    console.error('JWT verification failed:', err);
    res.status(403).json({ error: 'Invalid or expired token.' });
  }
};

module.exports = verifyToken;
