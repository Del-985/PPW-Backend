// controllers/quoteController.js
const pool = require('../config/db.js');
const nodemailer = require('nodemailer');

exports.handleCommercialQuote = async (req, res) => {
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

    await transporter.sendMail({
      from: '"Pioneer Wash" <admin@pioneerwashandlandscape.com>',
      to: 'admin@pioneerwashandlandscape.com', // your receiving email
      subject: `New Commercial Quote: ${business}`,
      text:
`Business: ${business}
Contact: ${contact}
Email: ${email}
Phone: ${phone}
Address: ${address}, ${city}
Type: ${serviceType}
Locations: ${locations}
Sq Ft/Area: ${sqft}
Services Needed: ${services}

Notes: ${notes || 'N/A'}
File: ${attachment_url || 'None'}

Submitted: ${new Date().toLocaleString()}
`,
      attachments
    });

    // Optional: Send confirmation to client
    // await transporter.sendMail({
    //   from: '"Pioneer Wash" <admin@pioneerwashandlandscape.com>',
    //   to: email,
    //   subject: "We've received your quote request!",
    //   text: "Thank you for reaching out to Pioneer Pressure Washing and Landscaping. We’ll get in touch soon."
    // });

    return res.json({ success: true, message: "Quote received!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Submission failed." });
  }
};
