const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

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

    res.status(200).json({ success: true, message: 'Login successful.' });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

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
};

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

    res.status(200).json({ tasks: result.rows });
  } catch (err) {
    console.error('Schedule fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch schedule.' });
  }
};

module.exports = {
  registerBusinessUser,
  loginBusinessUser,
  getBusinessContacts,
  createScheduleEntry,
  getScheduleEntries
};
