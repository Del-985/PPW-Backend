const pool = require('../config/db');
const bcrypt = require('bcryptjs');

// Register business user
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
    if (err.code === '23505') {
      // Unique violation
      if (err.detail.includes('email')) {
        return res.status(409).json({ error: 'Email is already registered.' });
      }
      if (err.detail.includes('business_name')) {
        return res.status(409).json({ error: 'Business name is already registered.' });
      }
      return res.status(409).json({ error: 'Duplicate registration.' });
    }

    console.error('Registration error:', err);
    res.status(500).json({ error: 'Registration failed.' });
  }
};

// Login business user
const jwt = require('jsonwebtoken');

const loginBusinessUser = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  try {
    const result = await pool.query('SELECT * FROM business_users WHERE email = $1', [email]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password_hash);

    if (!match) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const token = jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.cookie('token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'Strict',
      maxAge: 3600000 // 1 hour
    });

    res.status(200).json({ success: true, message: 'Login successful.' });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
};


// View contact submissions for dashboard
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

module.exports = {
  registerBusinessUser,
  loginBusinessUser,
  getBusinessContacts
};
