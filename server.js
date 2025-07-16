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
  origin: ['https://zapalert.netlify.app', 'http://localhost:5173'],
  credentials: true,
}));
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
});
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ✅ MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ Connected to MongoDB'))
.catch((err) => {
  console.error('❌ MongoDB error:', err);
  process.exit(1);
});

// ✅ Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/emergencies', require('./routes/emergencies'));

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', serverTime: new Date().toISOString() });
});

app.get('/', (req, res) => {
  res.json({
    message: 'ZAPALERT Backend API is running! 🚀',
    endpoints: {
      signup: 'POST /api/auth/signup',
      login: 'POST /api/auth/login',
      pending: 'GET /api/auth/pending-users'
    }
  });
});

// ✅ Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Internal Server Error' });
});

// ✅ 404
app.use('*', (req, res) => {
  res.status(404).json({ success: false, message: 'API endpoint not found' });
});

// ✅ Start
app.listen(PORT, () => {
  console.log(`🚀 ZAPALERT Backend running on port ${PORT}`);
});
