const Script = require('../models/Script');
const SplitScript = require('../models/SplitScript');
const { generateScript, splitScript } = require('../services/geminiService');

exports.createScript = async (req, res) => {
  try {
    const { userId, topic, audience, style, sources, language } = req.body;

    // Input validation
    if (!userId || !topic || !audience || !style || !sources) {
      return res.status(400).json({ 
        error: 'Missing required fields: userId, topic, audience, style, or sources' 
      });
    }

    // Generate script using Gemini service
    const generatedContent = await generateScript(topic, audience, style, sources, language);

    // Create script record in database using the model method
    const script = await Script.createScript({
      userId,
      topic,
      targetAudience: audience,
      style,
      outputScript: generatedContent.script,
      status: generatedContent.status
    });

    res.status(201).json({
      scriptId: script._id,
      topic: script.topic,
      script: script.outputScript,
      status: script.status
    });
  } catch (err) {
    console.error(err);
    
    // Create a failed script record
    try {
      const { userId, topic, audience, style, sources, language } = req.body;
      const script = await Script.createScript({
        userId,
        topic,
        targetAudience: audience,
        style,
        outputScript: "Script generation failed",
        status: "failed"
      });
      
      res.status(201).json({
        scriptId: script._id,
        topic: script.topic,
        script: script.outputScript,
        status: script.status
      });
    } catch (createErr) {
      console.error('Error creating failed script:', createErr);
      res.status(500).json({ error: 'Script generation failed' });
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


