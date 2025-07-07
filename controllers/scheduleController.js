const pool = require('../config/db');

exports.createTask = async (req, res) => {
  const { service_type, scheduled_date, scheduled_time, notes } = req.body;
  const userId = req.user?.userId;
  if (!userId || !scheduled_date) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO schedule_tasks (user_id, service_type, scheduled_date, scheduled_time, notes)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [userId, service_type, scheduled_date, scheduled_time, notes]
    );
    res.status(201).json({ success: true, task: result.rows[0] });
  } catch (err) {
    console.error('Schedule insert error:', err);
    res.status(500).json({ error: 'Failed to save task.' });
  }
};

exports.getTasks = async (req, res) => {
  const userId = req.user?.userId;
  try {
    const result = await pool.query(
      'SELECT * FROM schedule_tasks WHERE user_id = $1 ORDER BY scheduled_date',
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Fetch tasks error:', err);
    res.status(500).json({ error: 'Failed to fetch tasks.' });
  }
};
