const pool = require('../config/db');
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.your-email-provider.com', // Replace with actual SMTP host
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

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

  catch (err) {
    console.error('DB INSERT failed:', err.stack || err);
    res.status(500).json({error:'Database error.'});
}
    
  }
  
    
    // Send email notification
    const mailOptions = {
      from: `"${name}" <${email}>`,
      to: process.env.EMAIL_RECEIVER,
      subject: 'New Contact Form Submission',
      text: `Name: ${name}\nEmail: ${email}\nMessage:\n${message}`
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ success: true, message: 'Message received and email sent.' });
  } catch (err) {
    console.error('Error in contact form submission:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

module.exports = { handleContactForm };
