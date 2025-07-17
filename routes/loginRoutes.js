// routes/authRoutes.js

const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const {
  registerBusinessUser,
  loginBusinessUser,
  logout
} = require('../controllers/loginController');

// Brute-force protection for login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many login attempts. Please try again in 15 minutes.' }
});

// Registration
router.post('/register', registerBusinessUser);

// Login (rate-limited)
router.post('/login', loginLimiter, loginBusinessUser);

// Logout
router.post('/logout', logout);

module.exports = router;
