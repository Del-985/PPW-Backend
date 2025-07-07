const express = require('express');
const router = express.Router();
const {
  getAllContacts,
  getAllBusinessUsers,
  deleteBusinessUser,
  deleteContact
} = require('../controllers/adminController');

const verifyToken = require('../middleware/auth');
const adminOnly = require('../middleware/adminOnly'); // 🔒

router.use(verifyToken, adminOnly); // Protect all admin routes

router.get('/contacts', getAllContacts);
router.get('/business-users', getAllBusinessUsers);
router.delete('/business-user/:id', deleteBusinessUser);
router.delete('/contact/:id', deleteContact);

module.exports = router;
