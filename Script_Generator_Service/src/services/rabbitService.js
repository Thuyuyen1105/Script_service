const amqp = require('amqplib');
const { createScript } = require('./scriptService');
const { getIO, getActiveConnections } = require('../app');

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost';
const SCRIPT_QUEUE = 'script_generate_queue';
const IMAGE_QUEUE = 'image_generate_queue';

function sendResultViaWebSocket(jobId, result) {
  if (!result || typeof result !== 'object') {
    console.error(`Invalid result for job ${jobId}:`, result);
    return;
  }

  const io = getIO();
  const activeConnections = getActiveConnections();
  const socketId = activeConnections.get(jobId);

  if (socketId) {
    io.to(socketId).emit('scriptResult', {
      job_id: jobId,
      ...result,
      timestamp: new Date().toISOString()
    });
    console.log(`Result sent via WebSocket to client ${socketId} for job ${jobId}`);
  } else {
    console.log(`No active connection found for job ${jobId}`);
  }
}

// Function to connect to RabbitMQ and send a message
async function sendMessage(message) {
  try {
    const connection = await amqp.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();

    await channel.assertQueue(SCRIPT_QUEUE, { durable: true });
    channel.sendToQueue(SCRIPT_QUEUE, Buffer.from(JSON.stringify(message)), { persistent: true });

    console.log(`Message sent to ${SCRIPT_QUEUE}: ${JSON.stringify(message)}`);
    await channel.close();
    await connection.close();
  } catch (error) {
    console.error('Error sending message:', error);
  }
}

// Function to consume messages from RabbitMQ
async function consumeMessages() {
  try {
    const connection = await amqp.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();

    await channel.assertQueue(SCRIPT_QUEUE, { durable: true });
    console.log(`Waiting for messages in queue: ${SCRIPT_QUEUE}`);

    channel.consume(
      SCRIPT_QUEUE,
      async (msg) => {
        if (msg !== null) {
          try {
            const messageContent = JSON.parse(msg.content.toString());
            console.log(`Received message: ${JSON.stringify(messageContent)}`);

            // Extract data from message
            const { job_id, userId, crawl_data, audience, style, language, length } = messageContent;

            // Create script using service
            const result = await createScript({
              userId,
              topic: crawl_data[0]?.title || 'Default Topic',
              audience,
              style,
              sources: crawl_data,
              language,
              length
            });

            // Send result via WebSocket
            sendResultViaWebSocket(job_id, {
              status: 201,
              data: result,
              error: result.error || null
            });

            // Acknowledge the message
            channel.ack(msg);
          } catch (error) {
            console.error('Error processing message:', error);
            // Send error via WebSocket
            sendResultViaWebSocket(messageContent.job_id, {
              status: 500,
              error: error.message
            });
            // Acknowledge the message to remove it from queue
            channel.ack(msg);
          }
        }
      },
      { noAck: false }
    );
  } catch (error) {
    console.error('Error in consumeMessages:', error);
    // Retry connection after delay
    setTimeout(consumeMessages, 5000);
  }
}

// Function to send image generation request
async function sendImageGenerationRequest(request) {
  try {
    const connection = await amqp.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();

    await channel.assertQueue(IMAGE_QUEUE, { durable: true });
    
    const message = Buffer.from(JSON.stringify(request));
    console.log(request)
    channel.sendToQueue(IMAGE_QUEUE, message, { persistent: true });
    
    console.log(`Image generation request sent for job ${request.jobId}`);
    
    await channel.close();
    await connection.close();
  } catch (error) {
    console.error('Error sending image generation request:', error);
    throw error;
  }
}

module.exports = { 
  sendMessage, 
  consumeMessages, 
  sendImageGenerationRequest 
};