// models/SplitScript.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const SplitScriptSchema = new Schema({
  scriptId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Script',
    required: true
  },
  text: {
    type: String,
    required: true
  },
  imagePrompt: {
    type: String,
    required: true
  },
  order: {
    type: Number,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Static method to bulk insert split results
SplitScriptSchema.statics.insertSegments = async function(scriptId, segments) {
  try {
    const docs = segments.map((seg, index) => ({
      scriptId,
      text: seg.text,
      imagePrompt: seg.imagePrompt,
      order: index
    }));
    return await this.insertMany(docs);
  } catch (err) {
    throw new Error(`Error inserting split segments: ${err.message}`);
  }
};

// Static method to get segments by scriptId, sorted by order
SplitScriptSchema.statics.getByScriptId = async function(scriptId) {
  return this.find({ scriptId }).sort({ order: 1 });
};

module.exports = mongoose.model('SplitScript', SplitScriptSchema);
