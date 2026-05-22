const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const path = require('path');
const dns = require('dns');
require('dotenv').config();

// Fix for Node.js querySrv ECONNREFUSED DNS resolution issues on Windows
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (err) {
  console.warn('Failed to set custom DNS servers, using system default:', err.message);
}


// Import routes
const authRoutes = require('./routes/auth');
const pollRoutes = require('./routes/polls');
const adminRoutes = require('./routes/admin');

// Import middleware
const { globalLimiter } = require('./middleware/rateLimit');

// Import cleanup cron
const { startCleanupCron } = require('./utils/cleanup');

const app = express();
const server = http.createServer(app);

// ─── Socket.IO Setup ────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
  }
});

// Make `io` available to route handlers via app.locals (avoids circular deps)
app.locals.io = io;

// ─── Core Middleware ─────────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' } // allow serving uploaded images
}));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve uploaded files (option images)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Apply global rate limiter (100 req / 15 min per IP)
app.use(globalLimiter);

// ─── MongoDB Connection ───────────────────────────────────────────────────────
mongoose
  .connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/quickpoll-teams')
  .then(() => {
    console.log('✅ MongoDB Connected');
    // Start the auto-cleanup cron job after DB connection
    startCleanupCron();
  })
  .catch((err) => console.error('❌ MongoDB Error:', err));

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/polls', pollRoutes);
app.use('/api/admin', adminRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    dbState: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// ─── Socket.IO Real-Time Events ──────────────────────────────────────────────
io.on('connection', (socket) => {
  // Client joins a specific poll room to receive live updates
  socket.on('join-poll', (pollId) => {
    socket.join(pollId);
    console.log(`Socket ${socket.id} joined poll room: ${pollId}`);
  });

  socket.on('leave-poll', (pollId) => {
    socket.leave(pollId);
  });

  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

// ─── Global Error Handler ────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('Global Error:', err.stack);
  res.status(err.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
  });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server + Socket.IO running on http://localhost:${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
});
