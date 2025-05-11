const express = require('express');
const router = express.Router();
const scriptController = require('../controllers/scriptController');
const splitScriptController = require('../controllers/splitScriptController');

// Get script generation result by job ID
router.get('/result/:jobId', scriptController.getScriptResult);

// Split script and generate image prompts
router.post('/:scriptId/split', scriptController.splitScriptById);

// Finalize a script
router.post('/:scriptId/finalize', scriptController.finalizeScript);

// Update script and generate split scripts
router.put('/:scriptId', (req, res, next) => {
  // Validate required fields
  const { script, userId } = req.body;
  if (!script || !userId) {
    return res.status(400).json({ 
      error: 'Missing required fields: script and userId are required' 
    });
  }
  next();
}, scriptController.updateScript);

// Get a script by ID
router.get('/:scriptId', scriptController.getScriptById);

// Get all scripts for a user
router.get('/user/:userId', scriptController.getUserScripts);

// Create a new script
router.post('/generate', scriptController.createScript);

// Delete a script
router.delete('/:scriptId', scriptController.deleteScript);

// Get split scripts by script ID
router.get('/:scriptId/split', splitScriptController.getSplitScriptsByScriptId);

router.get('/:scriptId/title-description', scriptController.getScriptTitleAndDescription);

module.exports = router;
