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

router.use(verifyToken, adminOnly); // Protect all admin routes

// Contact and User management
router.get('/contacts', getAllContacts);
router.get('/business-users', getAllBusinessUsers);
router.delete('/business-user/:id', deleteBusinessUser);
router.delete('/contact/:id', deleteContact);

// Schedule management
router.patch('/schedule/:id/status', updateScheduleStatus); // 🆕 Status updates only

module.exports = router;