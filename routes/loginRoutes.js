const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const {
  registerBusinessUser,
  loginBusinessUser,
  logout
} = require('../controllers/loginController');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many login attempts. Please try again in 15 minutes.' }
});

router.post('/register', registerBusinessUser);
router.post('/login', loginLimiter, loginBusinessUser);
router.post('/logout', logout);

module.exports = router;
