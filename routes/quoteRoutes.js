// routes/quotes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');

// File upload config (for optional site photo)
const upload = multer({ dest: 'uploads/' }); // Save in /uploads

// DB pool
const pool = new Pool(); // config in .env

// POST /api/quotes/commercial
router.post('/commercial', upload.single('attachment'), async (req, res) => {
  try {
    const {
      business,
      contact,
      email,
      phone,
      address,
      city,
      'service-type': serviceType,
      locations,
      services,
      sqft,
      notes
    } = req.body;

    let attachment_url = null;
    if (req.file) {
      // Optionally rename/move file, or store in cloud, etc.
      attachment_url = req.file.path;
    }

    // Save to DB
    const result = await pool.query(`
      INSERT INTO quotes
        (business_name, contact_name, email, phone, address, city, service_type, locations, services, sqft, notes, attachment_url)
      VALUES
        ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      RETURNING id
    `, [
      business, contact, email, phone, address, city,
      serviceType, locations, services, sqft, notes, attachment_url
    ]);

    // Email notification to admin (using nodemailer/Zoho)
    // ... (see below for an example)

    res.json({ success: true, message: "Quote received!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Submission failed." });
  }
});

module.exports = router;
