const mongoose = require('mongoose');

const Request = new mongoose.Schema({
  organizer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organizer',
    required: true
  },
  organizerName:  { type: String, required: true },
  organizerEmail: { type: String, required: true },
  clubName:       { type: String, required: true },
  reason:         { type: String, required: true },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending'
  },
  adminComment: { type: String, default: '' },
  newPassword:  { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Request', Request);