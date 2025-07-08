const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const {
  registerBusinessUser,
  loginBusinessUser,
  getBusinessContacts,
  createScheduleEntry,
  getScheduleEntries
} = require('../controllers/businessController');
const verifyToken = require('../middleware/auth');

// Brute-force protection for login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 5,
  message: {
    error: 'Too many login attempts. Please try again in 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

router.post('/register', registerBusinessUser);
router.post('/login', loginLimiter, loginBusinessUser);
router.get('/contacts', verifyToken, getBusinessContacts);

// 🆕 Scheduling endpoints
router.post('/schedule', verifyToken, createScheduleEntry);
router.get('/schedule', verifyToken, getScheduleEntries);

module.exports = router;
