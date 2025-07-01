// backend/server.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const contactRoutes = require('./routes/contactRoutes');
const db = require('./config/db');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/contact', contactRoutes);

// Test database connection on startup
(async () => {
  try {
    const res = await db.query('SELECT NOW()');
    console.log('Database connected:', res.rows[0]);
  } catch (err) {
    console.error('Database connection error:', err);
  }
})();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
