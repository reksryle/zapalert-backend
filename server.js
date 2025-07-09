const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const helmet = require('helmet');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// ✅ Middleware
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://192.168.1.17:4173'
  ],
  credentials: true,
}));

app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ✅ MongoDB Connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ Connected to MongoDB successfully');
})
.catch((error) => {
  console.error('❌ MongoDB connection error:', error);
  process.exit(1);
});




// ✅ Routes
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

// ✅ Health Check (Optional)
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    serverTime: new Date().toISOString(),
  });
});

// ✅ Root Endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'ZAPALERT Backend API is running! 🚀',
    endpoints: {
      signup: 'POST /api/signup',
      login: 'POST /api/login',
      pending: 'GET /api/pending-users'
    }
  });
});

// ✅ Error Handler Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false, 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// ✅ 404 Not Found
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'API endpoint not found' 
  });
});

// ✅ Start Server
app.listen(PORT, () => {
  console.log(`🚀 ZAPALERT Backend running on port ${PORT}`);
  console.log(`📍 Server URL: http://localhost:${PORT}`);
});
