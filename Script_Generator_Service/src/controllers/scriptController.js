const Script = require('../models/Script');
const SplitScript = require('../models/SplitScript');
const { generateScript, splitScript } = require('../services/geminiService');



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

    // Generate script using Gemini service
    console.log('Calling generateScript service...');
    const generatedContent = await generateScript(topic, audience, style, sources, language, length);
    console.log('Script generated successfully');

    // Create script record in database using the model method
    console.log('Creating script record in database...');
    const script = await Script.createScript({
      userId,
      topic,
      targetAudience: audience,
      style,
      outputScript: generatedContent.script,
      status: generatedContent.status
    });
    console.log('Script record created:', { scriptId: script._id, status: script.status });

    res.status(201).json({
      scriptId: script._id,
      topic: script.topic,
      script: script.outputScript,
      status: script.status
    });
  } catch (err) {
    console.error('Script Generation Error:', {
      error: err.message,
      stack: err.stack,
      requestBody: req.body
    });
    
    // Create a failed script record with detailed error message
    try {
      const { userId, topic, audience, style, sources, language, length } = req.body;
      const errorMessage = err.message || 'Unknown error occurred';
      console.log('Creating failed script record...');
      const script = await Script.createScript({
        userId,
        topic,
        targetAudience: audience,
        style,
        outputScript: `Script generation failed: ${errorMessage}`,
        status: "failed",
        errorDetails: {
          message: errorMessage,
          timestamp: new Date().toISOString()
        }
      });
      
      console.log('Failed script record created:', { 
        scriptId: script._id, 
        status: script.status,
        error: errorMessage 
      });

      res.status(201).json({
        scriptId: script._id,
        topic: script.topic,
        script: script.outputScript,
        status: script.status,
        error: errorMessage
      });
    } catch (createErr) {
      console.error('Error creating failed script record:', {
        error: createErr.message,
        stack: createErr.stack,
        originalError: err.message
      });
      res.status(500).json({ 
        error: 'Script generation failed',
        details: err.message,
        timestamp: new Date().toISOString()
      });
    }
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
    const { script } = req.body;
    
    // Validate scriptId format
    if (!scriptId || !/^[0-9a-fA-F]{24}$/.test(scriptId)) {
      return res.status(400).json({ error: 'Invalid script ID format' });
    }

    if (!script) {
      return res.status(400).json({ error: 'Missing required field: script' });
    }
    
    // Tạo đối tượng cập nhật
    const updateData = {
      outputScript: script,
      status: 'generated'
    };
    
    
    // Update script
    const updatedScript = await Script.updateScript(scriptId, updateData);
    
    res.status(200).json({
      message: 'Kịch bản đã được cập nhật thành công.',
      status: updatedScript.status
    });
  } catch (err) {
    console.error('Error updating script:', err);
    if (err.message === 'Script not found') {
      return res.status(404).json({ 
        error: `Không tìm thấy kịch bản với mã ${req.params.scriptId}` 
      });
    }
    res.status(500).json({ error: 'Failed to update script' });
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


