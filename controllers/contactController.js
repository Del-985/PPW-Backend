const emailService = require('../services/emailService');

exports.sendMessage = async (req, res) => {
  const { name, email, message } = req.body;

  try {
    await emailService.sendEmail(name, email, message);
    res.status(200).json({ message: 'Message sent!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to send message' });
  }
};
