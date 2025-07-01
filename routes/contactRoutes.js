// contactRoutes.js
const express = require('express');
const router = express.Router();

const { handleContactForm } = require('../controllers/contactController');

router.post('/contact', handleContactForm);

module.exports = router;


// contactController.js
const nodemailer = require('nodemailer');
require('dotenv').config();

exports.handleContactForm = async (req, res) => {
  const { name, email, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    const mailOptions = {
      from: email,
      to: process.env.EMAIL_USERNAME,
      subject: `Contact form submission from ${name}`,
      text: message,
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: 'Email sent successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to send email' });
  }
};
