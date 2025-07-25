const pool = require('../config/db');
const PDFDocument = require('pdfkit');
const path = require('path');


// 🔹 Get all contact submissions
const getAllContacts = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM contacts ORDER BY submitted_at DESC');
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error fetching contacts:', err);
    res.status(500).json({ error: 'Failed to fetch contacts.' });
  }
};

// 🔹 Get all registered business users
const getAllBusinessUsers = async (req, res) => {
  try {
    const result = await pool.query('SELECT id, business_name, email FROM business_users ORDER BY id');
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error fetching business users:', err);
    res.status(500).json({ error: 'Failed to fetch business users.' });
  }
};

// 🔹 Delete a business user by ID
const deleteBusinessUser = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM business_users WHERE id = $1 RETURNING *', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Business user not found.' });
    }
    res.status(200).json({ success: true, message: 'Business user deleted.' });
  } catch (err) {
    console.error('Error deleting business user:', err);
    res.status(500).json({ error: 'Failed to delete business user.' });
  }
};

// 🔹 Delete a contact submission by ID
const deleteContact = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM contacts WHERE id = $1 RETURNING *', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Contact not found.' });
    }
    res.status(200).json({ success: true, message: 'Contact deleted.' });
  } catch (err) {
    console.error('Error deleting contact:', err);
    res.status(500).json({ error: 'Failed to delete contact.' });
  }
};

// 🔹 Admin-only: Update schedule status
const updateScheduleStatus = async (req, res) => {
  const scheduleId = req.params.id;
  const { status } = req.body;

  if (!['Approved', 'Denied'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status value.' });
  }

  const adminId = req.user?.userId;
  if (!req.user?.is_admin) {
    return res.status(403).json({ error: 'Forbidden. Admins only.' });
  }

  try {
    const result = await pool.query(
      `UPDATE schedule SET status = $1 WHERE id = $2 RETURNING id`,
      [status, scheduleId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Schedule entry not found.' });
    }

    // 🔹 Audit Log
    await pool.query(
      `INSERT INTO audit_log (admin_id, action, schedule_id, timestamp)
       VALUES ($1, $2, $3, NOW())`,
      [adminId, `Status set to ${status}`, scheduleId]
    );

    res.status(200).json({ success: true, message: 'Status updated.' });
  } catch (err) {
    console.error('Admin status update error:', err);
    res.status(500).json({ error: 'Failed to update status.' });
  }
};

// 🔹 Get all schedule entries (admin view)
const getAllScheduleEntries = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.*, b.business_name, b.email
       FROM schedule s
       JOIN business_users b ON s.business_user_id = b.id
       ORDER BY s.scheduled_date ASC`
    );
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error fetching all schedule entries:', err);
    res.status(500).json({ error: 'Failed to fetch schedule entries.' });
  }
};

// 🔹 Bulk update statuses (admin)
const bulkUpdateScheduleStatus = async (req, res) => {
  const { ids, status } = req.body;

  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'IDs array is required.' });
  }

  if (!['Approved', 'Denied'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status value.' });
  }

  const adminId = req.user?.userId;
  if (!req.user?.is_admin) {
    return res.status(403).json({ error: 'Admins only.' });
  }

  try {
    const result = await pool.query(
      `UPDATE schedule SET status = $1 WHERE id = ANY($2::int[]) RETURNING id`,
      [status, ids]
    );

    // 🔹 Bulk Audit Logs
    const auditInserts = result.rows.map(row => 
      pool.query(
        `INSERT INTO audit_log (admin_id, action, schedule_id, timestamp)
         VALUES ($1, $2, $3, NOW())`,
        [adminId, `Bulk status set to ${status}`, row.id]
      )
    );
    await Promise.all(auditInserts);

    res.status(200).json({
      success: true,
      updated: result.rows.map(r => r.id),
      message: `Status updated to '${status}' for ${result.rowCount} entries.`
    });
  } catch (err) {
    console.error('Bulk status update error:', err);
    res.status(500).json({ error: 'Failed to update statuses.' });
  }
};

const getAuditLog = async (req, res) => {
  if (!req.user?.is_admin) {
    return res.status(403).json({ error: 'Forbidden. Admins only.' });
  }

  try {
    const result = await pool.query(
      `SELECT id, action, timestamp, admin_id, schedule_id
       FROM audit_log 
       ORDER BY timestamp DESC
       LIMIT 100`
    );

    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Audit log fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch audit log.' });
  }
};

const createInvoice = async (req, res) => {
  try {
    // Extract and trim fields from request
    let { customer_name, business_user_id, amount, description, due_date, service_date } = req.body;
    customer_name = typeof customer_name === 'string' ? customer_name.trim() : '';
    description = typeof description === 'string' ? description.trim() : '';
    // Validate required fields
    if (!customer_name || !business_user_id || !amount) {
      return res.status(400).json({ error: 'Missing required fields: customer_name, business_user_id, amount.' });
    }
    // Validate types
    if (isNaN(Number(amount)) || Number(amount) <= 0) {
      return res.status(400).json({ error: 'Amount must be a positive number.' });
    }
    if (isNaN(Number(business_user_id)) || Number(business_user_id) <= 0) {
      return res.status(400).json({ error: 'business_user_id must be a valid user ID.' });
    }
    // (Optional) Validate due date
    if (due_date && isNaN(Date.parse(due_date))) {
      return res.status(400).json({ error: 'Due date must be a valid date (YYYY-MM-DD).' });
    }
    // (Optional) Validate service date
    if (service_date && isNaN(Date.parse(service_date))) {
      return res.status(400).json({ error: 'Service date must be a valid date (YYYY-MM-DD).' });
    }

    // Insert into invoices table
    const result = await pool.query(
      `INSERT INTO invoices
        (customer_name, business_user_id, amount, description, due_date, service_date, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING id, customer_name, business_user_id, amount, description, due_date, service_date, created_at`,
      [
        customer_name,
        Number(business_user_id),
        Number(amount),
        description || null,
        due_date || null,
        service_date || null
      ]
    );

    return res.status(201).json({
      message: 'Invoice created successfully.',
      invoice: result.rows[0]
    });
  } catch (err) {
    // Log server error for audit/debugging
    console.error('Error creating invoice:', err);
    return res.status(500).json({ error: 'An error occurred while creating the invoice.' });
  }
};

const getAllInvoices = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM invoices ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching invoices:', err);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
};

const markInvoicePaid = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `UPDATE invoices SET paid = true, paid_at = NOW() WHERE id = $1 RETURNING *`,
      [id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: "Invoice not found" });
    res.json({ message: "Invoice marked as paid", invoice: result.rows[0] });
  } catch (err) {
    console.error("Error marking invoice as paid:", err);
    res.status(500).json({ error: "Failed to mark invoice as paid" });
  }
};

const deleteInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `DELETE FROM invoices WHERE id = $1 RETURNING *`,
      [id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: "Invoice not found" });
    res.json({ message: "Invoice deleted", invoice: result.rows[0] });
  } catch (err) {
    console.error("Error deleting invoice:", err);
    res.status(500).json({ error: "Failed to delete invoice" });
  }
};


const generateInvoicePDF = async (req, res) => {
   const displayDate = d => {
    if (!d) return 'N/A';
    if (typeof d === 'string') {
      const match = d.match(/^(\d{4}-\d{2}-\d{2})/);
      return match ? match[1] : d;
    }
    if (d instanceof Date) {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }
    return 'N/A';
  };  
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT 
        invoices.*, 
        business_users.business_name
      FROM invoices
      JOIN business_users ON invoices.business_user_id = business_users.id
      WHERE invoices.id = $1
    `, [id]);
    if (result.rowCount === 0) return res.status(404).send('Invoice not found');
    const inv = result.rows[0];

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice_${inv.id}.pdf`);

    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(res);

    // Helper function included above!

    // LOGO left, business info right-aligned
    const logoPath = path.join(__dirname, '../assets/logo.jpg');
    doc.image(logoPath, 50, 50, { width: 120 });

    doc.fontSize(24).text('Pioneer Pressure Washing, LLC', { align: 'right' });
    doc.fontSize(10).text(
      '51020 Lawrence Creek Rd\nFranklinton, LA 70438\n(Your Phone Here)\nadmin@pioneerwashandlandscape.com',
      { align: 'right' }
    );

    doc.moveDown(4);

    const invoiceNumber = 1000 + Number(inv.id);
    doc.fontSize(20).text('INVOICE', { align: 'center' });
    doc.fontSize(14).text(`Invoice #: ${invoiceNumber}`, { align: 'center' });
    doc.moveDown(2);

    // Dates (use displayDate for all!)
    const today = new Date();
    doc.fontSize(12).text(`Date Issued: ${displayDate(today)}`, { align: 'left' });
    doc.fontSize(12).text(`Service Date: ${displayDate(inv.service_date)}`, { align: 'left' });
    doc.moveDown();

    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();

    doc.font('Helvetica-Bold').text('Billed To:', { continued: true }).font('Helvetica').text(` ${inv.customer_name}`);
    doc.font('Helvetica-Bold').text('Business:', { continued: true }).font('Helvetica').text(` ${inv.business_name}`);
    doc.moveDown();

    doc.font('Helvetica-Bold').text('Description:', { continued: true }).font('Helvetica').text(` ${inv.description || 'N/A'}`);
    doc.font('Helvetica-Bold').text('Amount Due:', { continued: true }).font('Helvetica').text(` $${Number(inv.amount).toFixed(2)}`);
    doc.font('Helvetica-Bold').text('Due Date:', { continued: true }).font('Helvetica').text(` ${displayDate(inv.due_date)}`);
    doc.moveDown();

    doc.font('Helvetica-Bold').text('Status:', { continued: true }).font('Helvetica').text(inv.paid ? 'Paid' : 'Unpaid');
    if (inv.paid && inv.paid_at) doc.text(`Paid At: ${displayDate(inv.paid_at)}`);
    doc.moveDown();

    doc.end();
  } catch (err) {
    console.error('Error generating invoice PDF:', err);
    res.status(500).send('Failed to generate PDF');
  }
};

// Get all expenses (optionally for a specific year)
const getAllExpenses = async (req, res) => {
  try {
    const year = req.query.year;
    let result;
    if (year) {
      result = await pool.query(
        `SELECT * FROM expenses WHERE EXTRACT(YEAR FROM date) = $1 ORDER BY date DESC`,
        [year]
      );
    } else {
      result = await pool.query(`SELECT * FROM expenses ORDER BY date DESC`);
    }
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching expenses:', err);
    res.status(500).json({ error: 'Failed to load expenses.' });
  }
};

// Create new expense
const createExpense = async (req, res) => {
  try {
    const { date, category, description, amount } = req.body;
    if (!date || !category || !amount) {
      return res.status(400).json({ error: 'Date, category, and amount are required.' });
    }
    const result = await pool.query(
      `INSERT INTO expenses (date, category, description, amount)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [date, category.trim(), description?.trim() || null, Number(amount)]
    );
    res.status(201).json({ success: true, expense: result.rows[0] });
  } catch (err) {
    console.error('Error creating expense:', err);
    res.status(500).json({ error: 'Failed to create expense.' });
  }
};

// Edit/update expense
const updateExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const { date, category, description, amount } = req.body;
    if (!id || !date || !category || !amount) {
      return res.status(400).json({ error: 'ID, date, category, and amount are required.' });
    }
    const result = await pool.query(
      `UPDATE expenses
       SET date = $1, category = $2, description = $3, amount = $4
       WHERE id = $5
       RETURNING *`,
      [date, category.trim(), description?.trim() || null, Number(amount), id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Expense not found.' });
    res.json({ success: true, expense: result.rows[0] });
  } catch (err) {
    console.error('Error updating expense:', err);
    res.status(500).json({ error: 'Failed to update expense.' });
  }
};




// ✅ Consolidated exports
module.exports = {
  getAllContacts,
  getAllBusinessUsers,
  deleteBusinessUser,
  deleteContact,
  updateScheduleStatus,
  getAllScheduleEntries,
  bulkUpdateScheduleStatus,
  getAuditLog,
  createInvoice,
  getAllInvoices,
  markInvoicePaid,
  deleteInvoice,
  generateInvoicePDF,
   getAllExpenses,
  createExpense,
  updateExpense
};
