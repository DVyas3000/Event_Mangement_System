const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const organizerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Organizer name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    select: false
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['Technical', 'Cultural', 'Sports', 'Social', 'Academic', 'Other']
  },
  description: {
    type: String,
    default: ''
  },
  contactEmail: {
    type: String,
    trim: true
  },
  contactNumber: {
    type: String,
    trim: true
  },
  discordWebhook: {
    type: String,
    default: ''
  },
  role: {
    type: String,
    default: 'organizer',
    enum: ['organizer']
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Hash password before saving - NO CALLBACK VERSION
organizerSchema.pre('save', async function() {
  if (!this.isModified('password')) {
    return;
  }
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Method to compare password
organizerSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to get organizer without password
organizerSchema.methods.toJSON = function() {
  const organizer = this.toObject();
  delete organizer.password;
  return organizer;
};

module.exports = mongoose.model('Organizer', organizerSchema);