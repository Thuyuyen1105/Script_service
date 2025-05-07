// WebSocket management
let io = null;
const activeConnections = new Map();

function setIO(socketIO) {
  io = socketIO;
}

function getIO() {
  if (!io) {
    console.warn('WebSocket IO not initialized');
  }
  return io;
}

function getActiveConnections() {
  return activeConnections;
}

function addConnection(jobId, socketId) {
  activeConnections.set(jobId, socketId);
  console.log(`Added connection for job ${jobId}: ${socketId}`);
}

function removeConnection(jobId) {
  activeConnections.delete(jobId);
  console.log(`Removed connection for job ${jobId}`);
}

function getSocketId(jobId) {
  return activeConnections.get(jobId);
}

module.exports = {
  setIO,
  getIO,
  getActiveConnections,
  addConnection,
  removeConnection,
  getSocketId
}; 