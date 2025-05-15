// WebSocket management
let io = null;
const activeConnections = new Map();

function setIO(socketIO) {
  io = socketIO;
  console.log('[WebSocket Debug] Socket.IO instance initialized');
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
  activeConnections.set(jobId, socketId);
  console.log(`[WebSocket Debug] Added connection for job ${jobId}: ${socketId}`);
  console.log('[WebSocket Debug] Current active connections:', Array.from(activeConnections.entries()));
}

function removeConnection(jobId) {
  const socketId = activeConnections.get(jobId);
  activeConnections.delete(jobId);
  console.log(`[WebSocket Debug] Removed connection for job ${jobId} (socket: ${socketId})`);
  console.log('[WebSocket Debug] Current active connections:', Array.from(activeConnections.entries()));
}

function getSocketId(jobId) {
  const socketId = activeConnections.get(jobId);
  console.log(`[WebSocket Debug] Getting socket ID for job ${jobId}: ${socketId}`);
  return socketId;
}

module.exports = {
  setIO,
  getIO,
  getActiveConnections,
  addConnection,
  removeConnection,
  getSocketId
}; 