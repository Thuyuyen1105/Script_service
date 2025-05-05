const SplitScript = require('../models/SplitScript');
const mongoose = require('mongoose');
exports.getSplitScriptsByScriptId = async (req, res) => {

  try {
    const { scriptId: scriptId } = req.params;
    console.log('scriptId:', scriptId);
    const segments = await SplitScript.find({ scriptId }).sort({ order: 1 });

    res.status(200).json(segments);
  } catch (error) {
    console.error('Error fetching split scripts:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};