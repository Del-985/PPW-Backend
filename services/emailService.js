const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.zoho.com',
  port: parseInt(process.env.SMTP_PORT) || 465,
  secure: true, // Required for SSL on port 465
  auth: {
    user: process.env.SMTP_USER, // admin@pioneerwashandlandscape.com
    pass: process.env.SMTP_PASS, // App password or login password
  },
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
