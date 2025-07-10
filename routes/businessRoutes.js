const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();

const {
  registerBusinessUser,
  loginBusinessUser,
  getBusinessContacts,
  createScheduleEntry,
  getScheduleEntries,
  updateScheduleEntry,
  deleteScheduleEntry
} = require('../controllers/businessController');

const verifyToken = require('../middleware/auth');

// 🚫 Brute-force protection for login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: {
    error: 'Too many login attempts. Please try again in 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// 🔐 Public routes
router.post('/register', registerBusinessUser);
router.post('/login', loginLimiter, loginBusinessUser);

// 🔐 Authenticated routes
router.get('/contacts', verifyToken, getBusinessContacts);

// 📅 Schedule CRUD
router.post('/schedule', verifyToken, createScheduleEntry);
router.get('/schedule', verifyToken, getScheduleEntries);
router.patch('/schedule/:id', verifyToken, updateScheduleEntry);
router.delete('/schedule/:id', verifyToken, deleteScheduleEntry);

module.exports = router;