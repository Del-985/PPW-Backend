const pool = require('../config/db');
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

  console.log('Signed token:', token);
res.cookie('token', token, {
  httpOnly: true,
  secure: true,
  sameSite: 'None',
  maxAge: 1000 * 60 * 60 * 24 * 2 // 2 days
});


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

module.exports = {
  registerBusinessUser,
  loginBusinessUser,
  getBusinessContacts,
  createScheduleEntry,
  getScheduleEntries,
  updateScheduleEntry,
  deleteScheduleEntry
};
