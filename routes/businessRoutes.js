const express = require('express');
const router = express.Router();
const {
  registerBusinessUser,
  loginBusinessUser,
  getBusinessContacts
} = require('../controllers/businessController');

const verifyToken = require('../middleware/auth'); // <-- Add this line

router.post('/register', registerBusinessUser);
router.post('/login', loginBusinessUser);

// 🔒 Protect this route
router.get('/contacts', verifyToken, getBusinessContacts);

module.exports = router;
