// routes/quotes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const quoteController = require('../controllers/quoteController'); // <-- Use the controller!
const upload = multer({ dest: 'uploads/' }); // Save in /uploads

// Use controller for POST /api/quotes/commercial
router.post('/commercial', upload.single('attachment'), quoteController.handleCommercialQuote);

module.exports = router;
