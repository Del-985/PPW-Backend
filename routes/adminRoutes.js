const express = require('express');
const router = express.Router();
const {
  getAllContacts,
  getAllBusinessUsers,
  getAllScheduleEntries,
  deleteBusinessUser,
  deleteContact,
  updateScheduleStatus,
  bulkUpdateScheduleStatus
} = require('../controllers/adminController');

const verifyToken = require('../middleware/auth');
const adminOnly = require('../middleware/adminOnly'); // 🔒
const validateStatus = require('../middleware/validateStatus');
const getAuditLog = require('../controllers/adminController');

router.use(verifyToken, adminOnly); // Protect all admin routes

// Contact and User management
router.get('/contacts', getAllContacts);
router.get('/business-users', getAllBusinessUsers);
router.get('/schedule', getAllScheduleEntries); // 📅 Admin view of all schedules
router.get('/audit-log', verifyToken, getAuditLog);
router.delete('/business-user/:id', deleteBusinessUser);
router.delete('/contact/:id', deleteContact);

// Schedule management
router.patch('/schedule/:id/status', validateStatus, updateScheduleStatus); // single schedule status update
router.patch('/schedule/status/bulk', bulkUpdateScheduleStatus); // bulk status update

module.exports = router;
