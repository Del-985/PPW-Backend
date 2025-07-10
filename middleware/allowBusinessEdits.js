const pool = require('../config/db');

const allowBusinessEdit = async (req, res, next) => {
  const userId = req.user?.userId;
  const isAdmin = req.user?.is_admin;
  const entryId = req.params.id;

  if (!entryId || (!userId && !isAdmin)) {
    return res.status(400).json({ error: 'Invalid request.' });
  }

  try {
    const result = await pool.query(
      'SELECT business_user_id FROM schedule WHERE id = $1',
      [entryId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Schedule entry not found.' });
    }

    const entryOwner = result.rows[0].business_user_id;

    // Admins can always pass
    if (isAdmin) return next();

    // Business users can only edit their own entries
    if (entryOwner !== userId) {
      return res.status(403).json({ error: 'Not authorized to edit this entry.' });
    }

    // Business cannot modify status field
    if ('status' in req.body) {
      delete req.body.status;
    }

    next();
  } catch (err) {
    console.error('Authorization middleware error:', err);
    res.status(500).json({ error: 'Authorization check failed.' });
  }
};

module.exports = allowBusinessEdit;