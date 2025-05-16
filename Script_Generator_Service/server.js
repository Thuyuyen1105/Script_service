require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { createServer } = require('http');
const { Server } = require('socket.io');
const scriptRoutes = require('./src/routes/scriptRoutes');
const { consumeMessages } = require('./src/services/rabbitService');
const { setIO, addConnection, removeConnection, getActiveConnections } = require('./src/app');

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

// Set WebSocket IO instance
setIO(io);
  
// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('[WebSocket Debug] Client connected:', socket.id);
  
  // Gửi acknowledgment khi client kết nối thành công
  socket.emit('connection_ack', {
    status: 'success',
    message: 'Connected to server successfully',
    socketId: socket.id,
    timestamp: new Date().toISOString()
  });

  // Xử lý heartbeat từ client
  socket.on('heartbeat_ack', (data) => {
    console.log(`[WebSocket Debug] Received heartbeat acknowledgment from socket ${socket.id}:`, data);
  });

  // Handle client registration with jobId
  socket.on('register', (jobId, callback) => {
    try {
      console.log(`[WebSocket Debug] Client ${socket.id} attempting to register for job ${jobId}`);
      
      if (!jobId) {
        throw new Error('Job ID is required');
      }

      addConnection(jobId, socket.id);
      
      // Gửi acknowledgment cho việc đăng ký job
      if (typeof callback === 'function') {
        callback({
          status: 'success',
          message: `Successfully registered for job ${jobId}`,
          jobId: jobId,
          socketId: socket.id,
          timestamp: new Date().toISOString()
        });
      }

      // Gửi heartbeat ngay sau khi đăng ký thành công
      socket.emit('heartbeat', { 
        timestamp: Date.now(),
        message: 'Initial heartbeat after registration'
      });
    } catch (error) {
      console.error(`[WebSocket Debug] Error registering job ${jobId} for socket ${socket.id}:`, error);
      if (typeof callback === 'function') {
        callback({
          status: 'error',
          message: `Failed to register for job ${jobId}`,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }
  });

  // Handle reconnection
  socket.on('reconnect_attempt', (jobId) => {
    console.log(`[WebSocket Debug] Client ${socket.id} attempting to reconnect for job ${jobId}`);
    if (jobId) {
      addConnection(jobId, socket.id);
    }
  });

  // Handle disconnection
  socket.on('disconnect', (reason) => {
    console.log(`[WebSocket Debug] Client disconnected: ${socket.id}, reason: ${reason}`);
    
    // Lấy jobId từ socket
    const jobId = getJobId(socket.id);
    if (jobId) {
      console.log(`[WebSocket Debug] Removing connection for job ${jobId} due to disconnect`);
      removeConnection(jobId);
    }

    // Nếu là disconnect tạm thời, thông báo cho client
    if (reason === 'transport close' || reason === 'ping timeout') {
      console.log(`[WebSocket Debug] Temporary disconnect detected for socket ${socket.id}, will attempt to reconnect`);
    }
  });

  // Handle errors
  socket.on('error', (error) => {
    console.error(`[WebSocket Debug] Socket error for ${socket.id}:`, error);
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
const PORT = process.env.PORT || 3005;
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
