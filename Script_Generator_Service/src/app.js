// WebSocket management
let io = null;
const activeConnections = new Map();
const socketJobMap = new Map(); // Map socketId -> jobId để dễ dàng tìm jobId khi socket disconnect
const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const RECONNECT_TIMEOUT = 5000; // 5 seconds

function setIO(socketIO) {
  io = socketIO;
  console.log('[WebSocket Debug] Socket.IO instance initialized');
  
  // Thiết lập heartbeat cho tất cả các kết nối
  setInterval(() => {
    const now = Date.now();
    console.log('[WebSocket Debug] Running heartbeat check...');
    console.log('[WebSocket Debug] Current active connections:', Array.from(activeConnections.entries()));
    
    for (const [jobId, socketId] of activeConnections.entries()) {
      const socket = io.sockets.sockets.get(socketId);
      if (socket) {
        socket.emit('heartbeat', { timestamp: now });
        console.log(`[WebSocket Debug] Sent heartbeat to socket ${socketId} for job ${jobId}`);
      } else {
        console.log(`[WebSocket Debug] Socket ${socketId} not found during heartbeat, removing connection`);
        removeConnection(jobId);
      }
    }
  }, HEARTBEAT_INTERVAL);
}

function getIO() {
  if (!io) {
    console.warn('[WebSocket Debug] WebSocket IO not initialized');
  } else {
    console.log('[WebSocket Debug] Current active connections:', Array.from(activeConnections.entries()));
  }
  return io;
}

function getActiveConnections() {
  console.log('[WebSocket Debug] Current active connections:', Array.from(activeConnections.entries()));
  return activeConnections;
}

function addConnection(jobId, socketId) {
  if (!jobId || !socketId) {
    console.error('[WebSocket Debug] Invalid connection parameters:', { jobId, socketId });
    return;
  }

  // Kiểm tra xem jobId đã được đăng ký với socket khác chưa
  const existingSocketId = activeConnections.get(jobId);
  if (existingSocketId && existingSocketId !== socketId) {
    console.log(`[WebSocket Debug] Job ${jobId} already registered with socket ${existingSocketId}, updating to ${socketId}`);
    removeConnection(jobId);
  }

  // Kiểm tra xem socket đã được đăng ký với job khác chưa
  const existingJobId = socketJobMap.get(socketId);
  if (existingJobId && existingJobId !== jobId) {
    console.log(`[WebSocket Debug] Socket ${socketId} already registered with job ${existingJobId}, updating to ${jobId}`);
    removeConnection(existingJobId);
  }

  activeConnections.set(jobId, socketId);
  socketJobMap.set(socketId, jobId);
  
  console.log(`[WebSocket Debug] Added connection for job ${jobId}: ${socketId}`);
  console.log('[WebSocket Debug] Current active connections:', Array.from(activeConnections.entries()));
  console.log('[WebSocket Debug] Current socket-job mappings:', Array.from(socketJobMap.entries()));
}

function removeConnection(jobId) {
  const socketId = activeConnections.get(jobId);
  if (socketId) {
    activeConnections.delete(jobId);
    socketJobMap.delete(socketId);
    console.log(`[WebSocket Debug] Removed connection for job ${jobId} (socket: ${socketId})`);
    console.log('[WebSocket Debug] Current active connections:', Array.from(activeConnections.entries()));
    console.log('[WebSocket Debug] Current socket-job mappings:', Array.from(socketJobMap.entries()));
  } else {
    console.log(`[WebSocket Debug] No connection found for job ${jobId}`);
  }
}

function getSocketId(jobId) {
  const socketId = activeConnections.get(jobId);
  console.log(`[WebSocket Debug] Getting socket ID for job ${jobId}: ${socketId}`);
  return socketId;
}

function getJobId(socketId) {
  const jobId = socketJobMap.get(socketId);
  console.log(`[WebSocket Debug] Getting job ID for socket ${socketId}: ${jobId}`);
  return jobId;
}

module.exports = {
  setIO,
  getIO,
  getActiveConnections,
  addConnection,
  removeConnection,
  getSocketId,
  getJobId
}; 