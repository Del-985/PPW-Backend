const pool = require('../config/db');
const PDFDocument = require('pdfkit');
const path = require('path')
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// ====== REGISTER ======
const registerBusinessUser = async (req, res) => {
  const { business_name, email, password } = req.body;
  if (!business_name || !email || !password) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO business_users (business_name, email, password_hash) VALUES ($1, $2, $3) RETURNING id',
      [business_name, email, hashedPassword]
    );

    res.status(201).json({ success: true, userId: result.rows[0].id });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Registration failed.' });
  }
};

// ====== LOGIN ======
const loginBusinessUser = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  try {
    const result = await pool.query(
      'SELECT * FROM business_users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password_hash);

    if (!match) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const token = jwt.sign(
      {
        userId: user.id,
        businessName: user.business_name,
        is_admin: user.is_admin
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '2d' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'None',
      maxAge: 1000 * 60 * 60 * 24 * 2
    });

    res.status(200).json({ success: true, message: 'Login successful.', is_admin: user.is_admin });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }

};

// ====== CONTACTS ======
const getBusinessContacts = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM contacts ORDER BY submitted_at DESC'
    );
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error fetching business contacts:', err);
    res.status(500).json({ error: 'Failed to fetch contacts.' });
  }
};

// ====== SCHEDULE: CREATE ======
const createScheduleEntry = async (req, res) => {
  const { service_type, scheduled_date, scheduled_time, notes } = req.body;
  const business_user_id = req.user?.userId;

  if (!business_user_id || !service_type || !scheduled_date || !scheduled_time) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO schedule (business_user_id, service_type, scheduled_date, scheduled_time, notes, status)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [business_user_id, service_type, scheduled_date, scheduled_time, notes || '', 'Pending']
    );

    res.status(201).json({ success: true, message: 'Scheduled successfully.', id: result.rows[0].id });
  } catch (err) {
    console.error('Schedule insert error:', err);
    res.status(500).json({ error: 'Failed to schedule task.' });
  }

  console.log('Creating entry for user:', req.user);

};

// ====== SCHEDULE: READ ======
const getScheduleEntries = async (req, res) => {
  const business_user_id = req.user?.userId;

  if (!business_user_id) {
    return res.status(403).json({ error: 'Unauthorized.' });
  }

  try {
    const result = await pool.query(
      `SELECT id, service_type, scheduled_date, scheduled_time, notes, status
       FROM schedule
       WHERE business_user_id = $1
       ORDER BY scheduled_date ASC`,
      [business_user_id]
    );

    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Schedule fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch schedule.' });
  }
};

// ====== SCHEDULE: UPDATE (NO STATUS CHANGE) ======
const updateScheduleEntry = async (req, res) => {
  const business_user_id = req.user?.userId;
  const entryId = req.params.id;
  const { service_type, scheduled_time, notes, status } = req.body;

  if (!business_user_id || !entryId) {
    return res.status(400).json({ error: 'Invalid request.' });
  }

  if (status && !req.user?.is_admin) {
    return res.status(403).json({ error: 'You cannot update the status field.' });
  }

  try {
    const result = await pool.query(
      `UPDATE schedule
       SET service_type = $1, scheduled_time = $2, notes = $3
       WHERE id = $4 AND business_user_id = $5
       RETURNING id`,
      [service_type, scheduled_time, notes || '', entryId, business_user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Schedule entry not found or unauthorized.' });
    }

    res.status(200).json({ success: true, message: 'Schedule entry updated.' });
  } catch (err) {
    console.error('Schedule update error:', err);
    res.status(500).json({ error: 'Failed to update schedule entry.' });
  }
};

// ====== SCHEDULE: DELETE ======
const deleteScheduleEntry = async (req, res) => {
  const business_user_id = req.user?.userId;
  const entryId = req.params.id;

  if (!business_user_id || !entryId) {
    return res.status(400).json({ error: 'Invalid request.' });
  }

  try {
    const result = await pool.query(
      `DELETE FROM schedule
       WHERE id = $1 AND business_user_id = $2
       RETURNING id`,
      [entryId, business_user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Schedule entry not found or unauthorized.' });
    }

    res.status(200).json({ success: true, message: 'Schedule entry deleted.' });
  } catch (err) {
    console.error('Schedule delete error:', err);
    res.status(500).json({ error: 'Failed to delete schedule entry.' });
  }
};

const getMyInvoices = async (req, res) => {
  try {
    const userId = req.user.userId;
    const result = await pool.query(
      'SELECT * FROM invoices WHERE business_user_id = $1 ORDER BY due_date DESC',
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching user invoices:', err);
    res.status(500).json({ error: 'Failed to fetch invoices.' });
  }
};

const getMySchedule = async (req, res) => {
  try {
    const userId = req.user.userId;
    const result = await pool.query(
      'SELECT * FROM schedule WHERE business_user_id = $1 ORDER BY scheduled_date DESC',
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching user schedule:', err);
    res.status(500).json({ error: 'Failed to fetch schedule.' });
  }
};

// Get all invoices for the logged-in business user
const getBusinessInvoices = async (req, res) => {
  try {
    const businessUserId = req.user?.userId; // Provided by JWT middleware
    if (!businessUserId) return res.status(403).json({ error: "Not authorized" });

    const result = await pool.query(
      `SELECT id, customer_name, amount, due_date, description, paid, service_date
       FROM invoices
       WHERE business_user_id = $1
       ORDER BY due_date DESC, id DESC`,
      [businessUserId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching business invoices:", err);
    res.status(500).json({ error: "Failed to fetch invoices." });
  }
};

// GET /api/business/me/invoice/:id/pdf
const generateMyInvoicePDF = async (req, res) => {
  console.log('PDF route HIT', {
  userId: req.user?.userId,
  invoiceId: req.params.id
});
  try {
    const invoiceId = req.params.id;
    const userId = req.user?.userId; // JWT middleware sets this

    // Only allow access to *own* invoice
    const { rows } = await pool.query(
      `SELECT invoices.*, business_users.business_name
       FROM invoices
       JOIN business_users ON invoices.business_user_id = business_users.id
       WHERE invoices.id = $1 AND invoices.business_user_id = $2`,
      [invoiceId, userId]
    );

    if (!rows.length) return res.status(404).send('Invoice not found');

    const inv = rows[0];
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice_${inv.id}.pdf`);

    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(res);

    // --- Minimal PDF layout (customize as you like!) ---
    doc.fontSize(18).text('INVOICE', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Invoice #: ${1000 + Number(inv.id)}`);
    doc.text(`Customer: ${inv.customer_name}`);
    doc.text(`Business: ${inv.business_name}`);
    doc.text(`Amount: $${Number(inv.amount).toFixed(2)}`);
    doc.text(`Due Date: ${inv.due_date ? new Date(inv.due_date).toLocaleDateString() : 'N/A'}`);
    doc.text(`Paid: ${inv.paid ? 'Yes' : 'No'}`);
    doc.end();
  } catch (err) {
    console.error('Error generating customer invoice PDF:', err);
    res.status(500).send('Failed to generate PDF');
  }
};

module.exports = {
  registerBusinessUser,
  loginBusinessUser,
  getBusinessContacts,
  createScheduleEntry,
  getScheduleEntries,
  updateScheduleEntry,
  deleteScheduleEntry,
  getMyInvoices,
  getMySchedule,
  getBusinessInvoices,
  generateMyInvoicePDF
};
