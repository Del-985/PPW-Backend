const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const allowBusinessEdit = require('../middleware/allowBusinessEdit');

const {
  registerBusinessUser,
  loginBusinessUser,
  getBusinessContacts,
  createScheduleEntry,
  getScheduleEntries,
  updateScheduleEntry,
  deleteScheduleEntry,
  getMyInvoices,
  getMySchedule,
  generateMyInvoicePDF,  // <-- PDF download for business user
} = require('../controllers/businessController');

const verifyToken = require('../middleware/auth');

// 🚫 Brute-force protection for login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false
});

// 🔐 Public routes
router.post('/register', registerBusinessUser);
router.post('/login', loginLimiter, loginBusinessUser);

// 🔐 Authenticated routes
router.get('/contacts', verifyToken, getBusinessContacts);

// 📅 Schedule CRUD
router.patch('/schedule/:id', verifyToken, allowBusinessEdit, updateScheduleEntry);
router.delete('/schedule/:id', verifyToken, allowBusinessEdit, deleteScheduleEntry);
router.post('/schedule', verifyToken, createScheduleEntry);
router.get('/schedule', verifyToken, getScheduleEntries);

// --------- NEW: Customer Dashboard APIs ---------
router.get('/me/invoices', verifyToken, getMyInvoices);   // List logged-in user's invoices
router.get('/me/schedule', verifyToken, getMySchedule);   // List logged-in user's schedule
router.get('/me/invoice/:id/pdf', verifyToken, generateMyInvoicePDF); // PDF download

module.exports = router;