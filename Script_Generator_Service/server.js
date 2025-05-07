require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { createServer } = require('http');
const { Server } = require('socket.io');
const scriptRoutes = require('./src/routes/scriptRoutes');
const { consumeMessages } = require('./src/services/rabbitService');

// Initialize Express app
const app = express();
const httpServer = createServer(app);

// Initialize Socket.IO with CORS
const io = new Server(httpServer, {
  cors: {
    origin: "*", // Trong môi trường production nên giới hạn origin
    methods: ["GET", "POST"]
  }
});

// Store active connections
const activeConnections = new Map();

// Export io and activeConnections for use in other modules
module.exports = {
  io,
  activeConnections
};

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Handle client registration with jobId
  socket.on('register', (jobId) => {
    console.log(`Client ${socket.id} registered for job ${jobId}`);
    activeConnections.set(jobId, socket.id);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    // Remove from active connections
    for (const [jobId, socketId] of activeConnections.entries()) {
      if (socketId === socket.id) {
        activeConnections.delete(jobId);
        break;
      }
    }
  });
});

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/scripts', scriptRoutes);

// Connect to MongoDB and start consuming messages
mongoose.connect(process.env.MONGODB_URI, {
  // Remove deprecated options
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
})
  .then(() => {
    console.log('✅ MongoDB connected');
    consumeMessages().catch(err => {
      console.error('❌ Error consuming RabbitMQ messages:', err.message);
    });
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
  });

// Start server
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
