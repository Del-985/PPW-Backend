const pool = require('../config/db');
const nodemailer = require('nodemailer');

// Configure mail transport for Zoho SMTP
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.zoho.com',
  port: parseInt(process.env.SMTP_PORT) || 465,
  secure: true, // true for port 465 (SSL)
  auth: {
    user: process.env.SMTP_USER, // admin@pioneerwashandlandscape.com
    pass: process.env.SMTP_PASS  // actual password or app password
  }
});

// Main handler
const handleContactForm = async (req, res) => {
  const { name, email, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ error: 'All fields are required.' });
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
        to: process.env.ADMIN_EMAIL,  // e.g., your personal inbox
        subject: 'New Contact Form Submission',
        text: `Name: ${name}\nEmail: ${email}\nMessage:\n${message}`
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
