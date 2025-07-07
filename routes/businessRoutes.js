const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const {
  registerBusinessUser,
  loginBusinessUser,
  getBusinessContacts
} = require('../controllers/businessController');
const verifyToken = require('../middleware/auth');

// Brute-force protection for login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 5, // limit each IP to 5 login attempts per 15 min
  message: {
    error: 'Too many login attempts. Please try again in 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

router.post('/register', registerBusinessUser);
router.post('/login', loginLimiter, loginBusinessUser); // ← Apply here
router.get('/contacts', verifyToken, getBusinessContacts);

module.exports = router;
