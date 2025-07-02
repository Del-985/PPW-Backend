const pool = require('../config/db');
const nodemailer = require('nodemailer');

// Configure mail transport for Zoho SMTP
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.zoho.com',
  port: parseInt(process.env.SMTP_PORT) || 465,
  secure: true, // true for port 465 (SSL)
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Escape basic HTML characters
const escapeHTML = (str) =>
  str.replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));

// Email format validation
const isValidEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// Main handler
const handleContactForm = async (req, res) => {
  let { name, email, message } = req.body;

  // Fallbacks to prevent undefined values
  name = (name || '').trim();
  email = (email || '').trim();
  message = (message || '').trim();

  // Sanitize inputs
  name = escapeHTML(name);
  email = escapeHTML(email);
  message = escapeHTML(message);

  // Validate fields
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Invalid email format.' });
  }

  if (name.length > 100 || message.length > 2000) {
    return res.status(400).json({ error: 'Input exceeds allowed length.' });
  }

  try {
    // Store contact form in database
    await pool.query(
      'INSERT INTO contacts (name, email, message) VALUES ($1, $2, $3)',
      [name, email, message]
    );

    // Send email to admin
    try {
      const mailOptions = {
        from: `"${name}" <${process.env.SMTP_USER}>`,
        to: process.env.ADMIN_EMAIL,
        subject: 'New Contact Form Submission',
        text: `Name: ${name}\nEmail: ${email}\nMessage:\n${message}`,
        replyTo: email
      };

      await transporter.sendMail(mailOptions);
      console.log('✅ Email sent');
    } catch (emailErr) {
      console.error('❌ Email failed:', emailErr.stack || emailErr.message);
    }

    res.status(200).json({ success: true, message: 'Message received and stored.' });
  } catch (err) {
    console.error('❌ DB Insert or form handling error:', err.stack || err.message);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

module.exports = { handleContactForm };