const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const Organizer = require('./models/Organizer');
const Admin = require('./models/Admin');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Make io accessible in controllers
app.set('io', io);

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected Successfully');
    // FIX #10: Seed first admin if not already present
    await Admin.createFirstAdmin();
  } catch (error) {
    console.error('MongoDB Connection Error:', error.message);
    process.exit(1);
  }
};
connectDB();

// ===== SOCKET.IO CHAT =====
// Track online users per team: { teamId: Map<userId, userName> }
const teamOnlineUsers = new Map();
// Track typing users per team: { teamId: Map<userId, userName> }
const teamTypingUsers = new Map();

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Authentication required'));
  (async () => {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    let displayName = 'User';

    if (decoded.role === 'participant') {
      const u = await User.findById(decoded.id).select('firstName lastName');
      displayName = [u?.firstName, u?.lastName].filter(Boolean).join(' ') || 'User';
    } else if (decoded.role === 'organizer') {
      const o = await Organizer.findById(decoded.id).select('name');
      displayName = o?.name || 'Organizer';
    } else if (decoded.role === 'admin') {
      const a = await Admin.findById(decoded.id).select('email');
      displayName = a?.email || 'Admin';
    }

    socket.user = { ...decoded, displayName };
    next();
  })().catch(() => next(new Error('Invalid token')));
});

io.on('connection', (socket) => {
  const userId = socket.user.id || socket.user._id;
  const userName = socket.user.displayName || 'User';

  // Join a team chat room
  socket.on('join_team', (teamId) => {
    socket.join(`team:${teamId}`);
    socket.currentTeam = teamId;

    // Track online
    if (!teamOnlineUsers.has(teamId)) teamOnlineUsers.set(teamId, new Map());
    teamOnlineUsers.get(teamId).set(userId, userName);

    // Notify room
    io.to(`team:${teamId}`).emit('online_users', {
      users: Array.from(teamOnlineUsers.get(teamId).entries()).map(([id, name]) => ({ id, name }))
    });
  });

  // New chat message via socket
  socket.on('send_message', async (data) => {
    const { teamId, content, type, fileName, fileUrl } = data;
    if (!teamId || !content) return;

    try {
      const ChatMessage = require('./models/ChatMessage');
      const Team = require('./models/Team');
      const team = await Team.findById(teamId);
      if (!team) return;

      const msg = await ChatMessage.create({
        team: teamId,
        sender: userId,
        senderName: userName,
        type: type || 'text',
        content: content.trim(),
        fileName: fileName || '',
        fileUrl: fileUrl || ''
      });

      // Broadcast to all in team room
      io.to(`team:${teamId}`).emit('new_message', msg);
    } catch (err) {
      console.error('Socket send_message error:', err.message);
    }
  });

  // Typing indicator
  socket.on('typing_start', ({ teamId }) => {
    if (!teamId) return;
    if (!teamTypingUsers.has(teamId)) teamTypingUsers.set(teamId, new Map());
    teamTypingUsers.get(teamId).set(userId, userName);
    socket.to(`team:${teamId}`).emit('typing_update', {
      typing: Array.from(teamTypingUsers.get(teamId).values())
    });
  });

  socket.on('typing_stop', ({ teamId }) => {
    if (!teamId) return;
    if (teamTypingUsers.has(teamId)) {
      teamTypingUsers.get(teamId).delete(userId);
      socket.to(`team:${teamId}`).emit('typing_update', {
        typing: Array.from(teamTypingUsers.get(teamId).values())
      });
    }
  });

  socket.on('disconnect', () => {
    const teamId = socket.currentTeam;
    if (!teamId) return;

    if (teamOnlineUsers.has(teamId)) {
      teamOnlineUsers.get(teamId).delete(userId);
      io.to(`team:${teamId}`).emit('online_users', {
        users: Array.from(teamOnlineUsers.get(teamId).entries()).map(([id, name]) => ({ id, name }))
      });
    }
    if (teamTypingUsers.has(teamId)) {
      teamTypingUsers.get(teamId).delete(userId);
      io.to(`team:${teamId}`).emit('typing_update', {
        typing: Array.from(teamTypingUsers.get(teamId).values())
      });
    }
  });
});
// ==========================

app.get('/api/test', (req, res) => res.json({ message: 'Backend is working' }));

const authRoutes        = require('./routes/authRoutes');
const userRoutes        = require('./routes/userRoutes');
const adminRoutes       = require('./routes/adminRoutes');
const teamRoutes        = require('./routes/teamRoutes');
const participantRoutes = require('./routes/participantRoutes');
const organizerRoutes   = require('./routes/organizerRoutes');

app.use('/api/auth',              authRoutes);
app.use('/api/user',              userRoutes);
app.use('/api/admin',             adminRoutes);
app.use('/api/participant/teams', teamRoutes);
app.use('/api/participant',       participantRoutes);
app.use('/api/organizer',         organizerRoutes);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.statusCode || 500).json({ success: false, message: err.message || 'Server Error' });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
server.on('error', (err) => console.error('Server error:', err.message));