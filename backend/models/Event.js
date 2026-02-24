const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['Normal', 'Merchandise', 'Hackathon'], 
    required: true 
  },
  eligibility: { type: String, required: true },
  registrationDeadline: { type: Date, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  registrationLimit: { type: Number, required: true },
  registrationFee: { type: Number, required: true },
  organizer: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Organizer', 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['Draft', 'Published', 'Ongoing', 'Closed', 'Completed'],
    default: 'Draft' 
  },
  tags: [String],
  analytics: {
    totalRegistrations: { type: Number, default: 0 },
    totalRevenue: { type: Number, default: 0 }, 
    attendanceCount: { type: Number, default: 0 },
    isTeamEvent: { type: Boolean, default: false } 
  },
  participants: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    registrationDate: { type: Date, default: Date.now },
    paymentStatus: { 
      type: String, 
      enum: ['Pending', 'Approved', 'Rejected'], 
      default: 'Approved' 
    },
    attended: { type: Boolean, default: false },
    attendedAt: { type: Date },
    attendedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Organizer' },
    attendanceMethod: { type: String, enum: ['camera', 'upload', 'manual'], default: 'manual' },
    ticketId: String,
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' }
  }],
  attendanceLogs: [{
    ticketId: String,
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    action: { type: String, enum: ['scan', 'override_mark', 'override_unmark'], required: true },
    method: { type: String, enum: ['camera', 'upload', 'manual'], default: 'manual' },
    note: String,
    scannedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Organizer' },
    scannedAt: { type: Date, default: Date.now }
  }],
  customFormFields: [{
    label: String,
    fieldType: { 
      type: String, 
      enum: ['text', 'dropdown', 'checkbox', 'file upload'] 
    },
    required: { type: Boolean, default: false },
    options: [String]
  }],
  merchandiseDetails: {
    itemDetails: String,
    stockQuantity: { type: Number, default: 0 },
    purchaseLimit: { type: Number, default: 1 }
  },
  teamDetails: {
    maxTeamSize: { type: Number, min: 2, max: 10 }
  },
  formLocked: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Event', eventSchema);
