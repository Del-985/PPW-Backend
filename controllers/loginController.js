const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Register Business User
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

// Login Business User (handles admin via is_admin)
// Login Business User (Token in JSON Response, no cookie!)
const loginBusinessUser = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'All fields are required.' });

  try {
    const result = await pool.query(
      'SELECT * FROM business_users WHERE email = $1',
      [email]
    );
    if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid credentials.' });

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Invalid credentials.' });

    const token = jwt.sign(
      { userId: user.id, is_admin: user.is_admin },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '2d' }
    );
    // **NO COOKIE SET!** Instead, return the token in the response body
    res.status(200).json({
      success: true,
      token,                      // <-- token is sent to client!
      is_admin: user.is_admin
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

// Logout (stateless, just a client-side action now)
const logout = (req, res) => {
  // Just inform the frontend to delete the token from storage
  res.json({ success: true, message: 'Logged out (token deleted client-side).' });
};
module.exports = {
  registerBusinessUser,
  loginBusinessUser,
  logout
};
