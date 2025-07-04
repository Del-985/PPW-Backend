const express = require('express');
const router = express.Router();
const {
  registerBusinessUser,
  loginBusinessUser,
  getBusinessContacts
} = require('../controllers/businessController');

router.post('/register', registerBusinessUser);
router.post('/login', loginBusinessUser);
router.get('/contacts', getBusinessContacts);

module.exports = router;