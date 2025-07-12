const nodemailer = require('nodemailer');
require('dotenv').config();

// GOOD: Uses environment variables
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT, 10),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});


exports.sendEmail = (name, email, message) => {
  const mailOptions = {
    from: `"${name}" <${process.env.SMTP_USER}>`,  // Use verified domain sender
    to: process.env.ADMIN_EMAIL,                   // Where contact emails go
    subject: 'New Contact Form Submission',
    text: `Name: ${name}\nEmail: ${email}\nMessage:\n${message}`,
    replyTo: email, // Optional: allows reply directly to user's address
  };

  return transporter.sendMail(mailOptions);
};
