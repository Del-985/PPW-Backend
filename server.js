const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors({
  origin: 'https://pioneerwashandlandscape.com', // Adjust as needed
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());
app.use('/api/business/schedule', require('./routes/scheduleRoutes'));


// Routes
const contactRoutes = require('./routes/contactRoutes');
const adminRoutes = require('./routes/adminRoutes');
const businessRoutes = require('./routes/businessRoutes');

app.use('/api', contactRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/business', businessRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
