const express = require('express');
const router = express.Router();
const scriptController = require('../controllers/scriptController');
const splitScriptController = require('../controllers/splitScriptController');

// Split script and generate image prompts
router.post('/:scriptId/split', scriptController.splitScriptById);

// Finalize a script
router.post('/:scriptId/finalize', scriptController.finalizeScript);

// Edit a script
router.put('/:scriptId', scriptController.updateScript);

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

module.exports = router;
