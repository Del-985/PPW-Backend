const express = require('express');
const router = express.Router();
const {
  getAllContacts, 
  getAllBusinessUsers,
  deleteBusinessUser,
  deleteContact,
  updateScheduleStatus // 🆕 Admin-only patch endpoint
} = require('../controllers/adminController');

const verifyToken = require('../middleware/auth');
const adminOnly = require('../middleware/adminOnly'); // 🔒
const validateStatus = require('../middleware/validateStatus');

router.use(verifyToken, adminOnly); // Protect all admin routes

// Contact and User management
router.get('/contacts', getAllContacts);
router.get('/business-users', getAllBusinessUsers);
router.get('/schedule', getAllScheduleEntries); // 📅 Admin view of all schedules
router.delete('/business-user/:id', deleteBusinessUser);
router.delete('/contact/:id', deleteContact);

// Schedule management
router.patch('/schedule/:id/status', validateStatus, updateScheduleStatus);
router.patch('/schedule/bulk-approve', bulkApproveSchedules); // ✅
router.patch('/schedule/:id/status', updateScheduleStatus); // 🆕 Status updates only
router.patch('/schedule/status/bulk', bulkUpdateScheduleStatus);

module.exports = router;