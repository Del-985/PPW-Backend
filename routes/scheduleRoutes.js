const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const scheduleController = require('../controllers/scheduleController');

router.post('/', auth, scheduleController.createTask);
router.get('/', auth, scheduleController.getTasks);

module.exports = router;
