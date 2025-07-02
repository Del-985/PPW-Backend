const express = require('express');
const router = express.Router();
const { registerBusinessUser } = require('../controllers/businessController');
const { loginBusinessUser } = require('../controllers/businessController');


router.post('/register', registerBusinessUser);
router.post('/login', loginBusinessUser);


module.exports = router;
