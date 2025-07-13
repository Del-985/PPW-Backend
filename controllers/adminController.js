const pool = require('../config/db');

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
    let { customer_name, business_user_id, amount, description, due_date } = req.body;
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

    // Insert into invoices table
    const result = await pool.query(
      `INSERT INTO invoices
        (customer_name, business_user_id, amount, description, due_date, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING id, customer_name, business_user_id, amount, description, due_date, created_at`,
      [
        customer_name,
        Number(business_user_id),
        Number(amount),
        description || null,
        due_date || null
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
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT 
        invoices.*,
        business_users.name AS business_name
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

    doc.fontSize(18).text('INVOICE', { align: 'center' });
    doc.moveDown();

    doc.fontSize(12).text(`Invoice #: ${inv.id}`);
    doc.text(`Customer: ${inv.customer_name}`);
    doc.text(`Business: ${inv.business_name}`);
    doc.text(`Amount: $${Number(inv.amount).toFixed(2)}`);
    doc.text(`Description: ${inv.description || 'N/A'}`);
    doc.text(`Due Date: ${inv.due_date ? new Date(inv.due_date).toLocaleDateString() : 'N/A'}`);
    doc.text(`Service Date: ${inv.service_date ? new Date(inv.service_date).toLocaleDateString() : 'N/A'}`);
    doc.text(`Paid: ${inv.paid ? 'Yes' : 'No'}`);
    if (inv.paid && inv.paid_at) doc.text(`Paid At: ${new Date(inv.paid_at).toLocaleString()}`);

    doc.end();
  } catch (err) {
    console.error('Error generating invoice PDF:', err);
    res.status(500).send('Failed to generate PDF');
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
  generateInvoicePDF
};
