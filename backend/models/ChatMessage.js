const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
  team:    { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
  sender:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  senderName: { type: String, required: true },
  type:    { type: String, enum: ['text', 'link', 'file'], default: 'text' },
  content: { type: String, required: true },   // message text or link URL
  fileName: { type: String, default: '' },     // for file type
  fileUrl:  { type: String, default: '' },     // for file type
}, { timestamps: true });

module.exports = mongoose.model('ChatMessage', chatMessageSchema);