const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');

router.get('/me', verifyToken, (req, res) => {
  res.status(200).json({
    id: req.user.id,
    email: req.user.email,
    is_admin: req.user.is_admin
  });
});

module.exports = router;