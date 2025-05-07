// Global variables
let io;
let activeConnections;

// Setter functions
function setIO(socketIO) {
  io = socketIO;
}

function setActiveConnections(connections) {
  activeConnections = connections;
}

// Getter functions
function getIO() {
  return io;
}

function getActiveConnections() {
  return activeConnections;
}

module.exports = {
  setIO,
  setActiveConnections,
  getIO,
  getActiveConnections
}; 