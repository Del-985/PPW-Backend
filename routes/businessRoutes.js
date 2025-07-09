const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const pool = require('../config/db');
const {
  registerBusinessUser,
  loginBusinessUser,
  getBusinessContacts,
  createScheduleEntry,
  getScheduleEntries
} = require('../controllers/businessController');
const verifyToken = require('../middleware/auth');

// Brute-force protection for login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 5,
  message: {
    error: 'Too many login attempts. Please try again in 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

router.post('/register', registerBusinessUser);
router.post('/login', loginLimiter, loginBusinessUser);
router.get('/contacts', verifyToken, getBusinessContacts);

// 🆕 Scheduling endpoints
router.post('/schedule', verifyToken, createScheduleEntry);
router.get('/schedule', verifyToken, getScheduleEntries);

// 🆕 Update schedule entry
router.patch('/schedule/:id', verifyToken, async (req, res) => {
  const business_user_id = req.user?.userId;
  const schedule_id = req.params.id;
  const { service_type, scheduled_date, scheduled_time, notes, status } = req.body;

  try {
    const result = await pool.query(
      `UPDATE schedule
       SET service_type = $1,
           scheduled_date = $2,
           scheduled_time = $3,
           notes = $4,
           status = $5
       WHERE id = $6 AND business_user_id = $7
       RETURNING *`,
      [service_type, scheduled_date, scheduled_time, notes, status, schedule_id, business_user_id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Schedule entry not found or unauthorized.' });
    }

    res.json({ success: true, updated: result.rows[0] });
  } catch (err) {
    console.error('Schedule update error:', err);
    res.status(500).json({ error: 'Failed to update schedule.' });
  }
});

// 🆕 Delete schedule entry
router.delete('/schedule/:id', verifyToken, async (req, res) => {
  const business_user_id = req.user?.userId;
  const schedule_id = req.params.id;

  try {
    const result = await pool.query(
      `DELETE FROM schedule WHERE id = $1 AND business_user_id = $2`,
      [schedule_id, business_user_id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Schedule entry not found or unauthorized.' });
    }

    res.json({ success: true, message: 'Deleted successfully.' });
  } catch (err) {
    console.error('Schedule delete error:', err);
    res.status(500).json({ error: 'Failed to delete schedule.' });
  }
});

module.exports = router;