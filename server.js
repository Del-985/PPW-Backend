const express = require('express');
const cors = require('cors');
const PDFDocument = require('pdfkit');
require('dotenv').config();

const app = express();

// ✅ Trust proxy for rate limiting and X-Forwarded-For
app.set('trust proxy', 1);

// Middleware
app.use(cors({
  origin: [
    'https://pioneerwashandlandscape.com',
    'https://www.pioneerwashandlandscape.com'
  ]
  // credentials: true   // Removed, not needed for header auth!
}));

app.use(express.json());

// Routes
const contactRoutes = require('./routes/contactRoutes');
const adminRoutes = require('./routes/adminRoutes');
const businessRoutes = require('./routes/businessRoutes');
const loginRoutes = require('./routes/loginRoutes');
const quoteRoutes = require('./routes/quoteRoutes');

app.use('/api', require('./routes/generalRoutes'));
app.use('/api/auth', loginRoutes);
app.use('/api', contactRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/business', businessRoutes);
app.use('/api/quotes', quoteRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
