const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const helmet = require('helmet');
const http = require('http');
const { Server } = require('socket.io');
const { User } = require('./models');
const cookieParser = require("cookie-parser");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// ✅ Create HTTP server for Socket.IO
const server = http.createServer(app);

// ✅ Allowed origins for both Express and Socket.IO
const allowedOrigins = ['http://localhost:5173', 'http://localhost:3000', "https://zapalert.netlify.app"];

// ✅ Create and configure Socket.IO server
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// ✅ Map to store connected resident usernames to their socket IDs
const connectedResidents = new Map();
const connectedResponders = new Map();

// ✅ Store in app context for access in routes
app.set("io", io);
app.set("socketMap", connectedResidents);


// ✅ Socket.IO connection handling
io.on("connection", (socket) => {
  console.log("✅ New client connected:", socket.id);
  
  // Resident joins
  socket.on("join-resident", (username) => {
    connectedResidents.set(username, socket.id);
    console.log(`📍 Resident ${username} connected with socket ID: ${socket.id}`);
  });
  
  // Responder joins - store both ID and name
  socket.on("join-responder", (responderData) => {
    const { responderId, responderName } = responderData;
    socket.responderId = responderId;
    socket.responderName = responderName; // Store responder name for filtering
    connectedResponders.set(responderId, socket.id);
    console.log(`📍 Responder ${responderName} (${responderId}) connected with socket ID: ${socket.id}`);
  });
  
  // Disconnect cleanup
  socket.on("disconnect", () => {
    for (let [username, id] of connectedResidents.entries()) {
      if (id === socket.id) {
        connectedResidents.delete(username);
        console.log(`🔌 Disconnected resident: ${username}`);
        break;
      }
    }
    for (let [id, sid] of connectedResponders.entries()) {
      if (sid === socket.id) {
        connectedResponders.delete(id);
        console.log(`🔌 Disconnected responder: ${id}`);
        break;
      }
    }
  });
});

// ✅ Middleware
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.options('*', cors()); // optional: for preflight requests

app.use(cookieParser());
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Serve public static files
app.use(express.static(path.join(__dirname, 'public')));

// ✅ Fix CORS for uploaded images
app.use('/uploads', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*'); // Or restrict to Netlify URL
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(path.join(__dirname, 'uploads')));

// ✅ MongoDB Connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('Connected to MongoDB successfully');
})
.catch((error) => {
  console.error('❌ MongoDB connection error:', error);
  process.exit(1);
});

// ✅ Routes
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

const reportRoutes = require("./routes/reports");
app.use("/api/reports", reportRoutes);

const emergenciesRoutes = require("./routes/emergencies"); 
app.use("/api/emergencies", emergenciesRoutes); 

const announcementRoute = require("./routes/announcement")(io);
app.use("/api/announcement", announcementRoute);

// ✅ Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    serverTime: new Date().toISOString(),
  });
});

// ✅ Root
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

// ✅ Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false, 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// ✅ 404 Catch
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'API endpoint not found' 
  });
});

// ✅ Start Server
server.listen(PORT, () => {
  const serverUrl =
    process.env.NODE_ENV === "production"
      ? "https://zapalert-backend.onrender.com"
      : `http://localhost:${PORT}`;

  console.log(`ZAPALERT Backend running on port ${PORT}`);
  console.log(`Server URL: ${serverUrl}`);
});

