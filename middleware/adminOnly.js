const adminOnly = (req, res, next) => {
  if (!req.user?.is_admin) {
    return res.status(403).json({ error: 'Admin access required.' });
  }
  next();
};

module.exports = adminOnly;
