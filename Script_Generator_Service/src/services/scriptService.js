const Script = require('../models/Script');
const { generateScript } = require('./geminiService');

async function createScript(scriptData) {
  try {
    const { userId, topic, audience, style, sources, language, length } = scriptData;
    
    // Generate script using Gemini service
    const generatedContent = await generateScript(topic, audience, style, sources, language, length);
    
    // Create script record in database
    const script = await Script.createScript({
      userId,
      topic,
      targetAudience: audience,
      style,
      outputScript: generatedContent.script,
      status: generatedContent.status
    });
    
    return {
      scriptId: script._id,
      topic: script.topic,
      script: script.outputScript,
      status: script.status
    };
  } catch (err) {
    // Create a failed script record with detailed error message
    const errorMessage = err.message || 'Unknown error occurred';
    const script = await Script.createScript({
      userId: scriptData.userId,
      topic: scriptData.topic,
      targetAudience: scriptData.audience,
      style: scriptData.style,
      outputScript: `Script generation failed: ${errorMessage}`,
      status: "failed",
      errorDetails: {
        message: errorMessage,
        timestamp: new Date().toISOString()
      }
    });
    
    return {
      scriptId: script._id,
      topic: script.topic,
      script: script.outputScript,
      status: script.status,
      error: errorMessage
    };
  }
}

module.exports = {
  createScript
}; 