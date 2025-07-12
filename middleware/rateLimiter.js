// middleware/rateLimiter.js
const rateLimit = require('express-rate-limit');

// 10 requests per 15 minutes for login and contact POST
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many requests, please try again later.' }
});

// 30 requests per 15 minutes for general POSTs (optional)
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: 'Too many requests, please try again later.' }
});

module.exports = { authLimiter, generalLimiter };
