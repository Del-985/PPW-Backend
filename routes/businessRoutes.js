const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const {
  registerBusinessUser,
  loginBusinessUser,
  getBusinessContacts
} = require('../controllers/businessController');

router.post('/register', registerBusinessUser);
router.post('/login', loginBusinessUser);
router.get('/contacts', getBusinessContacts);
router.get('/contacts', verifyToken, getBusinessContacts);

module.exports = router;
