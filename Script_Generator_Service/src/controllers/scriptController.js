const Script = require('../models/Script');
const SplitScript = require('../models/SplitScript');
const { splitScript } = require('../services/geminiService');
const { sendImageGenerationRequest } = require('../services/rabbitService');
const { createScript: createScriptService } = require('../services/scriptService');

exports.createScript = async (req, res) => {
  console.log('=== Script Controller: createScript called ===');
  console.log('Request body:', JSON.stringify(req.body, null, 2));
  
  try {
    const { userId, topic, audience, style, sources, language, length } = req.body;
    console.log('Extracted parameters:', { userId, topic, audience, style, language, length, sourcesCount: sources?.length });

    // Input validation
    if (!userId || !topic || !audience || !style || !sources || !length) {
      console.error('Validation Error:', { 
        missingFields: {
          userId: !userId,
          topic: !topic,
          audience: !audience,
          style: !style,
          sources: !sources,
          length: !length
        },
        receivedData: req.body
      });
      return res.status(400).json({ 
        error: 'Missing required fields: userId, topic, audience, style, sources, or length' 
      });
    }

    // Validate length
    const validLengths = ['veryshort', 'short', 'medium', 'long'];
    if (!validLengths.includes(length)) {
      console.error('Invalid Length Error:', { 
        receivedLength: length,
        validLengths 
      });
      return res.status(400).json({ error: 'Invalid length value. Must be one of: veryshort, short, medium, long' });
    }

    // Create script using service
    const result = await createScriptService({
      userId,
      topic,
      audience,
      style,
      sources,
      language,
      length
    });

    res.status(201).json(result);
  } catch (err) {
    console.error('Script Generation Error:', {
      error: err.message,
      stack: err.stack,
      requestBody: req.body
    });
    
    res.status(500).json({ 
      error: 'Script generation failed',
      details: err.message,
      timestamp: new Date().toISOString()
    });
  }
};

exports.getScriptById = async (req, res) => {
  try {
    const { scriptId } = req.params;
    
    // Validate scriptId format
    if (!scriptId || !/^[0-9a-fA-F]{24}$/.test(scriptId)) {
      return res.status(400).json({ error: 'Invalid script ID format' });
    }
    
    // Get script from database
    const script = await Script.getScriptById(scriptId);
    
    // Format response according to API specification
    res.status(200).json({
      scriptId: script._id,
      topic: script.topic,
      script: script.outputScript,
      audience: script.targetAudience,
      style: script.style,
      language: script.language,
      status: script.status,
      createdAt: script.createdAt,
      updatedAt: script.updatedAt
    });
  } catch (err) {
    console.error('Error getting script:', err);
    if (err.message === 'Script not found') {
      return res.status(404).json({ 
        error: `Không tìm thấy kịch bản với mã ${req.params.scriptId}` 
      });
    }
    res.status(500).json({ error: 'Failed to retrieve script' });
  }
};

exports.getUserScripts = async (req, res) => {
  try {
    const scripts = await Script.getScriptsByUserId(req.params.userId);
    res.json(scripts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateScript = async (req, res) => {
  try {
    const { scriptId } = req.params;
    const { 
      script, 
      userId,
      imageStyle = "anime", // Default style if not provided
      imageResolution = "1024x1024", // Default resolution if not provided
      jobId // Optional jobId for tracking
    } = req.body;
    
    // Validate scriptId format
    if (!scriptId || !/^[0-9a-fA-F]{24}$/.test(scriptId)) {
      return res.status(400).json({ error: 'Invalid script ID format' });
    }

    if (!script) {
      return res.status(400).json({ error: 'Missing required field: script' });
    }
    
    // Update script
    const updateData = {
      outputScript: script,
      status: 'generated'
    };
    
    const updatedScript = await Script.updateScript(scriptId, updateData);
    
    // Generate split scripts
    console.log('Generating split scripts...');
    const segments = await splitScript(script);
    
    // Delete existing split scripts
    await SplitScript.deleteMany({ scriptId });
    
    // Save new split scripts
    const savedSegments = await SplitScript.insertSegments(scriptId, segments);
    
    // Send image generation requests for each segment
    console.log('Sending image generation requests...');
    const imageRequests = savedSegments.map((segment, index) => {
      // Generate a unique jobId for each image request
      const imageJobId = jobId ? `${jobId}_img_${index}` : `img_${Date.now()}_${index}`;
      
      return {
        jobId: imageJobId,
        userId: userId,
        prompt: segment.imagePrompt,
        style: imageStyle,
        resolution: imageResolution,
        scriptId: scriptId,
        splitScriptId: segment._id,
        order: index.toString(),
        metadata: {
          segmentText: segment.text,
          originalJobId: jobId,
          timestamp: new Date().toISOString()
        }
      };
    });

    // Send requests to image generation queue
    const sendPromises = imageRequests.map(request => 
      sendImageGenerationRequest(request).catch(error => {
        console.error(`Failed to send image request for segment ${request.order}:`, error);
        return null; // Continue with other requests even if one fails
      })
    );

    await Promise.all(sendPromises);

    // Filter out failed requests
    const successfulRequests = imageRequests.filter((_, index) => sendPromises[index] !== null);

    res.status(200).json({
      message: 'Script updated and split successfully',
      scriptId: updatedScript._id,
      status: updatedScript.status,
      segments: savedSegments,
      imageRequests: successfulRequests.map(req => ({
        jobId: req.jobId,
        splitScriptId: req.splitScriptId,
        order: req.order
      }))
    });
  } catch (err) {
    console.error('Error updating script:', err);
    if (err.message === 'Script not found') {
      return res.status(404).json({ 
        error: `Không tìm thấy kịch bản với mã ${req.params.scriptId}` 
      });
    }
    res.status(500).json({ 
      error: 'Failed to update script',
      details: err.message 
    });
  }
};

exports.deleteScript = async (req, res) => {
  try {
    const { scriptId } = req.params;
    
    // Validate scriptId format
    if (!scriptId || !/^[0-9a-fA-F]{24}$/.test(scriptId)) {
      return res.status(400).json({ error: 'Invalid script ID format' });
    }
    
    await Script.deleteScript(scriptId);
    res.json({ message: 'Script deleted successfully' });
  } catch (err) {
    console.error('Error deleting script:', err);
    if (err.message === 'Script not found') {
      return res.status(404).json({ 
        error: `Không tìm thấy kịch bản với mã ${req.params.scriptId}` 
      });
    }
    res.status(500).json({ error: 'Failed to delete script' });
  }
};

exports.finalizeScript = async (req, res) => {
  try {
    const { scriptId } = req.params;
    
    // Validate scriptId format
    if (!scriptId || !/^[0-9a-fA-F]{24}$/.test(scriptId)) {
      return res.status(400).json({ error: 'Invalid script ID format' });
    }
    
    // Get the script
    const script = await Script.getScriptById(scriptId);
    
    // Finalize the script
    await script.finalize();
    
    res.status(200).json({
      message: 'Kịch bản đã được phê duyệt.',
      status: 'finalized'
    });
  } catch (err) {
    console.error('Error finalizing script:', err);
    if (err.message === 'Script not found') {
      return res.status(404).json({ 
        error: `Không tìm thấy kịch bản với mã ${req.params.scriptId}` 
      });
    }
    res.status(500).json({ error: 'Failed to finalize script' });
  }
};

exports.splitScriptById = async (req, res) => {
  try {
    const { scriptId } = req.params;

    if (!scriptId || !/^[0-9a-fA-F]{24}$/.test(scriptId)) {
      return res.status(400).json({ error: "Invalid script ID format" });
    }

    // Get full script
    const scriptRecord = await Script.getScriptById(scriptId);
    const fullScript = scriptRecord.outputScript;
    if (!fullScript) {
      return res.status(404).json({ error: "Script not found" });
    }

    // Xóa tất cả các segment cũ của scriptId này trước khi split lại
    await SplitScript.deleteMany({ scriptId });

    // Generate segments and image prompts
    const segments = await splitScript(fullScript);

    // Lưu các segment mới vào database
    await SplitScript.insertSegments(scriptId, segments);

    // Trả về các segment đã được split
    res.status(200).json({
      scriptId,
      segments
    });
  } catch (err) {
    console.error("Error splitting script:", err);
    res.status(500).json({ error: "Failed to split script and generate image prompts" });
  }
};

exports.getScriptResult = async (req, res) => {
  try {
    const { jobId } = req.params;
    
    if (!jobId) {
      return res.status(400).json({ error: 'Job ID is required' });
    }

    // Get the script from database using jobId
    const script = await Script.findOne({ jobId });
    
    if (!script) {
      return res.status(404).json({ 
        error: 'Script not found',
        jobId: jobId
      });
    }

    res.status(200).json({
      jobId: script.jobId,
      scriptId: script._id,
      topic: script.topic,
      script: script.outputScript,
      status: script.status,
      error: script.errorDetails?.message || null,
      createdAt: script.createdAt,
      updatedAt: script.updatedAt
    });
  } catch (err) {
    console.error('Error getting script result:', err);
    res.status(500).json({ 
      error: 'Failed to retrieve script result',
      details: err.message
    });
  }
};


