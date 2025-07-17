// routes/businessRoutes.js

const express = require('express');
const router = express.Router();
const allowBusinessEdit = require('../middleware/allowBusinessEdit');
const verifyToken = require('../middleware/auth');

const {
  getBusinessContacts,
  createScheduleEntry,
  getScheduleEntries,
  updateScheduleEntry,
  deleteScheduleEntry,
  getMyInvoices,
  getMySchedule,
  generateMyInvoicePDF,
} = require('../controllers/businessController');

// Authenticated business-only endpoints
router.get('/contacts', verifyToken, getBusinessContacts);

// Schedule CRUD
router.patch('/schedule/:id', verifyToken, allowBusinessEdit, updateScheduleEntry);
router.delete('/schedule/:id', verifyToken, allowBusinessEdit, deleteScheduleEntry);
router.post('/schedule', verifyToken, createScheduleEntry);
router.get('/schedule', verifyToken, getScheduleEntries);

// Customer Dashboard APIs
router.get('/me/invoices', verifyToken, getMyInvoices);
router.get('/me/schedule', verifyToken, getMySchedule);
router.get('/me/invoice/:id/pdf', verifyToken, generateMyInvoicePDF);

module.exports = router;
