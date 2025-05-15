const amqp = require("amqplib");
const { createScript } = require("./scriptService");
const { getIO, getSocketId } = require("../app");

const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://localhost";
const SCRIPT_QUEUE = "script_generate_queue";
const IMAGE_QUEUE = "image_generate_queue";
const VOICE_QUEUE = "voice_generate_queue";

function sendResultViaWebSocket(jobId, result) {
  try {
    if (!jobId) {
      console.error("No jobId provided for WebSocket result");
      return;
    }

    if (!result || typeof result !== "object") {
      console.error(`Invalid result for job ${jobId}:`, result);
      return;
    }

    const io = getIO();
    if (!io) {
      console.error("WebSocket not initialized");
      return;
    }

    const socketId = getSocketId(jobId);
    if (socketId) {
      io.to(socketId).emit("scriptResult", {
        job_id: jobId,
        ...result,
        timestamp: new Date().toISOString(),
      });
      console.log(
        `Result sent via WebSocket to client ${socketId} for job ${jobId}`
      );
    } else {
      console.log(`No active connection found for job ${jobId}`);
    }
  } catch (error) {
    console.error("Error sending result via WebSocket:", error);
  }
}

// Function to connect to RabbitMQ and send a message
async function sendMessage(message) {
  try {
    const connection = await amqp.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();

    await channel.assertQueue(SCRIPT_QUEUE, { durable: true });
    channel.sendToQueue(SCRIPT_QUEUE, Buffer.from(JSON.stringify(message)), {
      persistent: true,
    });

    console.log(`Message sent to ${SCRIPT_QUEUE}: ${JSON.stringify(message)}`);
    await channel.close();
    await connection.close();
  } catch (error) {
    console.error("Error sending message:", error);
    throw error;
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
          let messageContent;
          try {
            messageContent = JSON.parse(msg.content.toString());
            console.log(`Received message: ${JSON.stringify(messageContent)}`);

            // Extract data from message
            const {
              job_id,
              userId,
              input_user,
              crawl_data,
              audience,
              style,
              language,
              length,
            } = messageContent;

            if (!job_id) {
              throw new Error("Missing job_id in message");
            }

            // Create script using service
            const result = await createScript({
              userId,
              jobId: job_id,
              topic: input_user || crawl_data[0]?.title,
              audience,
              style,
              sources: crawl_data,
              language,
              length,
            });

            // Send result via WebSocket
            sendResultViaWebSocket(job_id, {
              status: 201,
              data: result,
              error: result.error || null,
            });

            // Acknowledge the message
            channel.ack(msg);
          } catch (error) {
            console.error("Error processing message:", error);
            // Send error via WebSocket if we have a job_id
            if (messageContent && messageContent.job_id) {
              sendResultViaWebSocket(messageContent.job_id, {
                status: 500,
                error: error.message,
              });
            }
            // Acknowledge the message to remove it from queue
            channel.ack(msg);
          }
        }
      },
      { noAck: false }
    );
  } catch (error) {
    console.error("Error in consumeMessages:", error);
    // Retry connection after delay
    setTimeout(consumeMessages, 5000);
  }
}

// Function to send image generation request
async function sendImageGenerationRequest(request) {
  try {
    if (!request || !request.jobId) {
      throw new Error("Invalid request: missing jobId");
    }

    const connection = await amqp.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();

    await channel.assertQueue(IMAGE_QUEUE, { durable: true });

    const message = Buffer.from(JSON.stringify(request));
    channel.sendToQueue(IMAGE_QUEUE, message, { persistent: true });

    console.log(`Image generation request sent for job ${request.jobId}`);
    console.log("image request", request);

    await channel.close();
    await connection.close();
  } catch (error) {
    console.error("Error sending image generation request:", error);
    throw error;
  }
}

// Function to send voice generation request
async function sendVoiceGenerationRequest(request) {
  try {
    if (!request || !request.job_id) {
      throw new Error("Invalid request: missing job_id");
    }

    const connection = await amqp.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();

    await channel.assertQueue(VOICE_QUEUE, { durable: true });

    const message = Buffer.from(JSON.stringify(request));
    channel.sendToQueue(VOICE_QUEUE, message, { persistent: true });

    console.log(`Voice generation request sent for job ${request.job_id}`);
    console.log("voice request", request);
    await channel.close();
    await connection.close();
  } catch (error) {
    console.error("Error sending voice generation request:", error);
    throw error;
  }
}

module.exports = {
  sendMessage,
  consumeMessages,
  sendImageGenerationRequest,
  sendVoiceGenerationRequest,
};
