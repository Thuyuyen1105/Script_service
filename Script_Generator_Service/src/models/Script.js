// models/Script.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const ScriptSchema = new Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  topic: {
    type: String,
    required: true
  },
  targetAudience: {
    type: String,
    enum: ['kids', 'teenager', 'adult', 'expert'],
    required: true
  },
  style: {
    type: String,
    enum: ['storytelling', 'educational', 'casual', 'funny'],
    required: true
  },
  language: {
    type: String,
    enum: ['en-US', 'vi-VN'],
    default: 'en-US'
  },
  status: {
    type: String,
    enum: ['generated', 'finalized', 'failed'],
    default: 'generated'
  },
  outputScript: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Add CRUD methods to the schema
ScriptSchema.statics.createScript = async function(scriptData) {
  try {
    const script = new this(scriptData);
    await script.save();
    return script;
  } catch (error) {
    throw new Error(`Error creating script: ${error.message}`);
  }
};

ScriptSchema.statics.getScriptById = async function(scriptId) {
  try {
    const script = await this.findById(scriptId);
    if (!script) {
      throw new Error('Script not found');
    }
    return script;
  } catch (error) {
    throw new Error(`Error getting script: ${error.message}`);
  }
};

ScriptSchema.statics.getScriptsByUserId = async function(userId) {
  try {
    const scripts = await this.find({ userId });
    return scripts;
  } catch (error) {
    throw new Error(`Error getting user scripts: ${error.message}`);
  }
};

ScriptSchema.statics.updateScript = async function(scriptId, updateData) {
  try {
    updateData.updatedAt = new Date();
    const script = await this.findByIdAndUpdate(
      scriptId,
      { $set: updateData },
      { new: true, runValidators: true }
    );
    if (!script) {
      throw new Error('Script not found');
    }
    return script;
  } catch (error) {
    throw new Error(`Error updating script: ${error.message}`);
  }
};

ScriptSchema.statics.deleteScript = async function(scriptId) {
  try {
    const script = await this.findByIdAndDelete(scriptId);
    if (!script) {
      throw new Error('Script not found');
    }
    return script;
  } catch (error) {
    throw new Error(`Error deleting script: ${error.message}`);
  }
};

// Add method to update script status
ScriptSchema.methods.updateStatus = async function(newStatus) {
  try {
    this.status = newStatus;
    this.updatedAt = new Date();
    await this.save();
    return this;
  } catch (error) {
    throw new Error(`Error updating script status: ${error.message}`);
  }
};

// Add method to update output script
ScriptSchema.methods.updateOutputScript = async function(outputScript) {
  try {
    this.outputScript = outputScript;
    this.status = 'generated';
    this.updatedAt = new Date();
    await this.save();
    return this;
  } catch (error) {
    throw new Error(`Error updating output script: ${error.message}`);
  }
};

// Add method to finalize a script
ScriptSchema.methods.finalize = async function() {
  try {
    this.status = 'finalized';
    this.updatedAt = new Date();
    await this.save();
    return this;
  } catch (error) {
    throw new Error(`Error finalizing script: ${error.message}`);
  }
};

module.exports = mongoose.model('Script', ScriptSchema);
