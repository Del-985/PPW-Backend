const pool = require('../config/db');
const nodemailer = require('nodemailer');

// Configure mail transport
const transporter = nodemailer.createTransport({
  host: 'smtp.your-email-provider.com', // Replace with actual SMTP host
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Main handler
const handleContactForm = async (req, res) => {
  const { name, email, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  try {
    // Store form submission in the database
    await pool.query(
      'INSERT INTO contacts (name, email, message) VALUES ($1, $2, $3)',
      [name, email, message]
    );

    // Send email notification (optional)
    try {
      const mailOptions = {
        from: `"${name}" <${email}>`,
        to: process.env.EMAIL_RECEIVER,
        subject: 'New Contact Form Submission',
        text: `Name: ${name}\nEmail: ${email}\nMessage:\n${message}`
      };

      await transporter.sendMail(mailOptions);
      console.log('✅ Email sent');
    } catch (emailErr) {
      console.error('❌ Email failed:', emailErr.stack || emailErr.message);
      // Do not block success if email fails
    }

    res.status(200).json({ success: true, message: 'Message received and stored.' });
  } catch (err) {
    console.error('❌ DB Insert or form handling error:', err.stack || err.message);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

module.exports = { handleContactForm };
