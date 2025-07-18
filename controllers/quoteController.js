// controllers/quoteController.js
const pool = require('../config/db');
const nodemailer = require('nodemailer');

async function handleCommercialQuote(req, res) {
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

    const attachment_url = req.file ? req.file.path : null;

    // 1. Insert into database
    await pool.query(
      `INSERT INTO quotes
        (business_name, contact_name, email, phone, address, city, service_type, locations, services, sqft, notes, attachment_url)
       VALUES
        ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [business, contact, email, phone, address, city, serviceType, locations, services, sqft, notes, attachment_url]
    );

    // 2. Send email notification (to you, optionally to client too)
    const transporter = nodemailer.createTransport({
      host: "smtp.zoho.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.ZOHO_USER,
        pass: process.env.ZOHO_PASS
      }
    });

    let attachments = [];
    if (req.file) {
      attachments.push({ path: req.file.path });
    }

   

    return res.json({ success: true, message: "Quote received!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Submission failed." });
  }
};

module.exports = {
  handleCommercialQuote
};
