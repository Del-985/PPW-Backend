const express = require('express');
const router = express.Router();
const { registerBusinessUser } = require('../controllers/businessController');

router.post('/register', registerBusinessUser);

module.exports = router;
