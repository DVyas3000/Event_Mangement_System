// models/Team.js
const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
  name:    { type: String, required: true, trim: true },
  event:   { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  leader:  { type: mongoose.Schema.Types.ObjectId, ref: 'User',  required: true },
  maxSize: { type: Number, required: true, min: 2 },

  // unique 8-char invite code
  inviteCode: { type: String, required: true, unique: true },

  members: [{
    user:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status:    { type: String, enum: ['Pending', 'Accepted', 'Declined'], default: 'Pending' },
    joinedAt:  { type: Date }
  }],

  // Pending  Forming  Complete  Cancelled
  status: {
    type: String,
    enum: ['Forming', 'Complete', 'Cancelled'],
    default: 'Forming'
  }
}, { timestamps: true });

module.exports = mongoose.model('Team', teamSchema);