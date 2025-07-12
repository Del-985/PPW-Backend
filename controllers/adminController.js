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

// ✅ Consolidated exports
module.exports = {
  getAllContacts,
  getAllBusinessUsers,
  deleteBusinessUser,
  deleteContact,
  updateScheduleStatus,
  getAllScheduleEntries,
  bulkUpdateScheduleStatus,
  getAuditLog
};
