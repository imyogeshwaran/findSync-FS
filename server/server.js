const express = require('express');
const cors = require('cors');
require('dotenv').config();
console.log('Loading initializeDatabase module...');
const initializeDatabase = require('./config/initDatabase');
console.log('initializeDatabase module loaded');
const path = require('path');
const http = require('http');

console.log('Starting server...');
console.log('Environment variables:', {
  DB_HOST: process.env.DB_HOST,
  DB_USER: process.env.DB_USER,
  DB_NAME: process.env.DB_NAME,
  PORT: process.env.PORT
});

const app = express();
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:5174', 'http://127.0.0.1:5174', 'http://localhost:5173', 'http://127.0.0.1:5173'],
    methods: ["GET", "POST"],
    credentials: true,
    allowedHeaders: ["Authorization"],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling']
});

// Track active connections by user
const activeUsers = new Map(); // Map<userId, Set<socketIds>>
const socketToUser = new Map(); // Map<socketId, userId>

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('🔌 Client connected:', socket.id);

  // Store connection
  socket.on('user_connected', (userId) => {
    if (!activeUsers.has(userId)) {
      activeUsers.set(userId, new Set());
    }
    activeUsers.get(userId).add(socket.id);
    socketToUser.set(socket.id, userId);
    
    // Join user-specific room
    socket.join(`user:${userId}`);
    
    console.log(`✅ User ${userId} connected (${activeUsers.get(userId).size} sockets)`);
    
    // Notify user is online
    socket.broadcast.emit('user_online', { userId });
  });

  // Handle disconnect
  socket.on('disconnect', (reason) => {
    const userId = socketToUser.get(socket.id);
    if (userId) {
      const userSockets = activeUsers.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          activeUsers.delete(userId);
          socket.broadcast.emit('user_offline', { userId });
          console.log(`⬜ User ${userId} went offline`);
        }
      }
    }
    socketToUser.delete(socket.id);
    console.log('🔌 Client disconnected:', socket.id, 'Reason:', reason);
  });

  // Handle new message
  socket.on('message_new', (data) => {
    const { contactId, receiverId, message } = data;
    console.log(`📨 New message on contact ${contactId} to user ${receiverId}`);
    
    // Send to receiver in real-time
    if (activeUsers.has(receiverId)) {
      io.to(`user:${receiverId}`).emit('message_received', {
        contactId,
        message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Handle message edited
  socket.on('message_edited', (data) => {
    const { contactId, messageId, newText, receiverId } = data;
    console.log(`✏️ Message ${messageId} edited on contact ${contactId}`);
    
    if (activeUsers.has(receiverId)) {
      io.to(`user:${receiverId}`).emit('message_edited_notification', {
        contactId,
        messageId,
        newText,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Handle message deleted
  socket.on('message_deleted', (data) => {
    const { contactId, messageId, receiverId } = data;
    console.log(`🗑️ Message ${messageId} deleted on contact ${contactId}`);
    
    if (activeUsers.has(receiverId)) {
      io.to(`user:${receiverId}`).emit('message_deleted_notification', {
        contactId,
        messageId,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Handle typing indicator
  socket.on('typing', (data) => {
    const { contactId, receiverId, isTyping } = data;
    if (activeUsers.has(receiverId)) {
      io.to(`user:${receiverId}`).emit('user_typing', {
        contactId,
        isTyping
      });
    }
  });

  // Handle message delivered
  socket.on('message_delivered', (data) => {
    const { messageId, senderId } = data;
    if (activeUsers.has(senderId)) {
      io.to(`user:${senderId}`).emit('message_delivered_notification', {
        messageId,
        deliveredAt: new Date().toISOString()
      });
    }
  });

  // Handle message read
  socket.on('message_read', (data) => {
    const { contactId, senderId } = data;
    if (activeUsers.has(senderId)) {
      io.to(`user:${senderId}`).emit('message_read_notification', {
        contactId,
        readAt: new Date().toISOString()
      });
    }
  });

  socket.on('error', (error) => {
    console.error('🔴 Socket error:', error);
  });
});

// Handle errors at the IO level
io.engine.on("connection_error", (err) => {
  console.error('🔴 Connection error:', err);
});

app.set('io', io);

// Middleware
app.use(cors({
  origin: ['http://localhost:5174', 'http://127.0.0.1:5174'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Length', 'Content-Type']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the public directory
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Serve uploaded files from /uploads
const uploadsPath = path.join(__dirname, 'public', 'uploads');
console.log('Serving uploads from:', uploadsPath);

// Debug middleware for all requests
app.use((req, res, next) => {
    console.log('Incoming request:', req.method, req.url);
    next();
});

// Serve static files from uploads directory
app.use('/uploads', (req, res, next) => {
    console.log('Static file request for:', req.url);
    console.log('Full path:', path.join(uploadsPath, req.url));
    next();
}, express.static(uploadsPath));

// Add a route to debug image serving
// app.get('/uploads/:filename', (req, res, next) => {
//     const filePath = path.join(uploadsPath, req.params.filename);
//     console.log('Attempting to serve:', filePath);
//     try {
//         if (require('fs').existsSync(filePath)) {
//             console.log('File exists, serving normally');
//             const stats = require('fs').statSync(filePath);
//             console.log('File stats:', stats);
//             next();
//         } else {
//             console.log('File not found:', filePath);
//             res.status(404).send('Image not found');
//         }
//     } catch (error) {
//         console.error('Error accessing file:', error);
//         res.status(500).send('Error accessing file');
//     }
// });

// Allow popups from auth providers to be closed by the opener in dev
app.use((req, res, next) => {
  // This relaxes COOP to allow popup windows to communicate their closed state back to the opener
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  next();
});

// Routes
console.log('Loading route modules...');
console.log('Loading user routes...');
const userRoutes = require('./routes/userRoutes');
console.log('Loading item routes...');
const itemRoutes = require('./routes/itemRoutes');
console.log('Loading contact routes...');
const contactRoutes = require('./routes/contactRoutes');
console.log('Loading auth routes...');
const authRoutes = require('./routes/authRoutes');
console.log('Loading admin routes...');
const adminRoutes = require('./routes/adminRoutes');

console.log('Route modules loaded');

// Test route
app.get('/test', (req, res) => {
    console.log('Test endpoint called');
    res.send('Server is running');
});

// Simple test endpoint to verify CORS
app.get('/api/test', (req, res) => {
  res.json({ message: 'API is working', timestamp: new Date().toISOString() });
});

console.log('Connecting API routes...');
console.log('Connecting /api/users routes...');
app.use('/api/users', userRoutes);
console.log('Connecting /api/items routes...');
app.use('/api/items', itemRoutes);
console.log('Connecting /api/contacts routes...');
app.use('/api/contacts', contactRoutes);
console.log('Connecting /api/auth routes...');
app.use('/api/auth', authRoutes);
console.log('Connecting /api/admin routes...');
app.use('/api/admin', adminRoutes);
console.log('✅ All API routes connected');

// Log all registered routes for debugging
app._router.stack.forEach((r) => {
  if (r.route && r.route.path) {
    console.log('Registered route:', r.route.path, Object.keys(r.route.methods));
  }
});

// Health check route
app.get('/health', (req, res) => {
  console.log('Health check endpoint called');
  res.json({ status: 'OK', message: 'Server is running', timestamp: new Date().toISOString() });
});

// CORS test route
app.get('/cors-test', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'CORS is working', 
    origin: req.get('Origin'),
    timestamp: new Date().toISOString() 
  });
});

// Simple ping endpoint
app.get('/ping', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Server is responding', 
    timestamp: new Date().toISOString() 
  });
});

// Root route
app.get('/', (req, res) => {
  res.json({ 
    message: 'FindSync API Server',
    version: '1.0.0',
    endpoints: {
      users: '/api/users',
      items: '/api/items',
      health: '/health'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: err.message 
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Initialize database and start server
const PORT = process.env.PORT || 3005;

async function startServer() {
  console.log('Starting server initialization...');
  try {
    // Initialize database schema
    console.log('Initializing database...');
    await initializeDatabase();
    console.log('✅ Database initialization completed successfully');
  } catch (error) {
    console.error('❌ Failed to initialize database:', error);
    console.error('Continuing server startup without database initialization...');
  }
  
  console.log('Starting HTTP server on port', PORT);
  // Start server with WebSocket support
  console.log(`Attempting to start server on port ${PORT}`);
  server.listen(PORT, () => {
    console.log(`\n🚀 Server is running on port ${PORT}`);
    console.log(`📍 API: http://localhost:${PORT}`);
    console.log(`💚 WebSocket: ws://localhost:${PORT}`);
    console.log(`📊 Health: http://localhost:${PORT}/health\n`);
  });
  
  server.on('listening', () => {
    const addr = server.address();
    console.log('Server is listening on:', addr);
    console.log('Server is now listening for connections');
  });
  
  server.on('error', (error) => {
    console.error('Server error:', error);
  });
  
  console.log('Server listen called on port', PORT);
  return server;
}

console.log('Starting server...');

// Add unhandled error handling
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  console.error('Error stack:', err.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

startServer();
console.log('Server start function called');

module.exports = { app };
