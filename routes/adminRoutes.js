const express = require('express');
const router = express.Router();
const {
  getAllContacts,
  getAllBusinessUsers,
  getAllScheduleEntries,
  deleteBusinessUser,
  deleteContact,
  updateScheduleStatus,
  bulkUpdateScheduleStatus,
  getAuditLog,
  createInvoice,
  getAllInvoices,
  markInvoicePaid,
  deleteInvoice,
  generateInvoicePDF
} = require('../controllers/adminController');

const verifyToken = require('../middleware/auth');
const adminOnly = require('../middleware/adminOnly'); // 🔒
const validateStatus = require('../middleware/validateStatus');

router.use(verifyToken, adminOnly); // Protect all admin routes

// Contact and User management
router.get('/contacts', getAllContacts);
router.get('/business-users', getAllBusinessUsers);
router.get('/schedule', getAllScheduleEntries); // 📅 Admin view of all schedules
router.get('/audit-log', verifyToken, getAuditLog);
router.get('/invoices', getAllInvoices);
router.get('/invoice/:id/pdf', generateInvoicePDF);
router.delete('/business-user/:id', deleteBusinessUser);
router.delete('/contact/:id', deleteContact);
router.delete('/invoice/:id', deleteInvoice); // Delete invoice (DELETE)

// Schedule management
router.patch('/schedule/:id/status', validateStatus, updateScheduleStatus); // single schedule status update
router.patch('/schedule/status/bulk', bulkUpdateScheduleStatus); // bulk status update
router.patch('/invoice/:id/paid', markInvoicePaid); // Mark invoice as paid (PATCH)


// Delete invoice (DELETE)
router.delete('/invoice/:id', deleteInvoice);


// Invoice creation
router.post('/invoice', createInvoice);

module.exports = router;
