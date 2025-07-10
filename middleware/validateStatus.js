// middleware/validateStatus.js
module.exports = function validateStatus(req, res, next) {
  const { status } = req.body;
  if (!['Approved', 'Denied'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status value.' });
  }
  next();
};