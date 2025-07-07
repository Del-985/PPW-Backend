const express = require('express');
const router = express.Router();
const {
  getAllContacts,
  getAllBusinessUsers,
  deleteBusinessUser,
  deleteContact
} = require('../controllers/adminController');

const verifyToken = require('../middleware/auth'); // JWT middleware

// Protect all admin routes with verifyToken
router.get('/contacts', verifyToken, getAllContacts);
router.get('/business-users', verifyToken, getAllBusinessUsers);
router.delete('/business-user/:id', verifyToken, deleteBusinessUser);
router.delete('/contact/:id', verifyToken, deleteContact);

module.exports = router;
