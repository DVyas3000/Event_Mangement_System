const Organizer = require('../models/Organizer');
const User = require('../models/User');
const Event = require('../models/Event');
const Request = require('../models/Request');
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');

// ================= SEND ORGANIZER CREDENTIALS EMAIL =================
const sendOrganizerCredentials = async ({ name, email, tempPassword }) => {
  try {
    const transporter = nodemailer.createTransport({
                          service: 'gmail',
                          auth: {
                            user: process.env.EMAIL_USER,
                            pass: process.env.EMAIL_PASS
                          }
                        });
    const mailOptions = {
      from: `"Felicity Events" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `Your Organizer Account for Felicity Events is Ready!`,
      html: `
      <!DOCTYPE html><html><head><meta charset="UTF-8"></head>
      <body style="font-family:Arial,sans-serif;background:#f4f4f4;padding:20px;">
        <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:10px;padding:30px;box-shadow:0 2px 10px rgba(0,0,0,0.1);">
          <h1 style="color:#000;">Felicity Events</h1>
          <p>Hello <strong>${name}</strong>,</p>
          <p>Your organizer account has been created. Use the credentials below to login.</p>
          <div style="background:#f8f9ff;border:2px solid #667eea;border-radius:8px;padding:20px;margin:20px 0;">
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Temporary Password:</strong> <code style="background:#eee;padding:2px 8px;border-radius:4px;">${tempPassword}</code></p>
          </div>
        </div>
      </body></html>`
    };
    await transporter.sendMail(mailOptions);
    return true;
  } catch (err) {
    console.error('[EMAIL] Failed:', err.message);
    return false;
  }
};

const generatePassword = () => {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$!';
  let pw = '';
  for (let i = 0; i < 10; i++){
    let x = Math.random() * chars.length;
    pw += chars[Math.floor(x)];
  }
  return pw;
};

// @desc    Get Dashboard Stats
// @route   GET /api/admin/stats
exports.getStats = async (req, res) => {
  try {
    const totalOrganizers   = await Organizer.countDocuments();
    const activeOrganizers  = await Organizer.countDocuments({ isActive: true });
    const totalParticipants = await User.countDocuments();
    const totalEvents       = await Event.countDocuments();
    const pendingResets     = await Request.countDocuments({ status: 'Pending' });

    res.status(200).json({
      success: true,
      stats: { totalOrganizers, activeOrganizers, totalParticipants, totalEvents, pendingResets }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch stats' });
  }
};

// @desc    Get All Organizers
// @route   GET /api/admin/organizers
exports.getOrganizers = async (req, res) => {
  try {
    const organizers = await Organizer.find().select('-password').sort({ createdAt: -1 });
    res.status(200).json({ success: true, organizers });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch organizers' });
  }
};

// @desc    Create New Organizer
// @route   POST /api/admin/organizers
exports.createOrganizer = async (req, res) => {
  try {
    const { name, email, category, description, contactEmail, contactNumber } = req.body;
    const existingOrganizer = await Organizer.findOne({ email });
    if (existingOrganizer)
      return res.status(400).json({ success: false, message: 'Organizer with this email already exists' });

    const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
    const organizer = await Organizer.create({ name, email, password: tempPassword, category, description, contactEmail, contactNumber });

    const emailSent = await sendOrganizerCredentials({ name: organizer.name, email: organizer.email, tempPassword });

    res.status(201).json({
      success: true,
      message: emailSent ? 'Organizer created and credentials sent via email' : 'Organizer created (email could not be sent)',
      emailSent,
      email: organizer.email,
      tempPassword,
      organizer: { id: organizer._id, name: organizer.name, email: organizer.email, category: organizer.category }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Failed to create organizer' });
  }
};

// @desc    Delete Organizer
// @route   DELETE /api/admin/organizers/:id
exports.deleteOrganizer = async (req, res) => {
  try {
    const organizerId = req.params.id;
    const organizer = await Organizer.findById(organizerId);
    if (!organizer) return res.status(404).json({ success: false, message: 'Organizer not found' });

    const [eventsDeleteResult, requestsDeleteResult] = await Promise.all([
      Event.deleteMany({ organizer: organizerId }),
      Request.deleteMany({ organizer: organizerId })
    ]);

    await Organizer.deleteOne({ _id: organizerId });

    res.status(200).json({
      success: true,
      message: 'Organizer deleted successfully with all related events and reset requests',
      deletedEvents: eventsDeleteResult.deletedCount || 0,
      deletedRequests: requestsDeleteResult.deletedCount || 0
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete organizer' });
  }
};

// @desc    Toggle Organizer Active Status
// @route   PATCH /api/admin/organizers/:id/toggle
exports.toggleOrganizerStatus = async (req, res) => {
  try {
    const organizer = await Organizer.findById(req.params.id);
    if (!organizer) return res.status(404).json({ success: false, message: 'Organizer not found' });
    const newStatus = !organizer.isActive;
    // Use updateOne to avoid triggering pre-save password hash hook
    await Organizer.updateOne({ _id: req.params.id }, { isActive: newStatus });
    res.status(200).json({
      success: true,
      message: `Organizer ${newStatus ? 'activated' : 'deactivated'} successfully`,
      organizer: { id: organizer._id, name: organizer.name, isActive: newStatus }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update organizer status' });
  }
};

// @desc    Get All Password Reset Requests
// @route   GET /api/admin/password-resets
exports.getPasswordResets = async (req, res) => {
  try {
    const requests = await Request.find().sort({ createdAt: -1 });
    const pendingResets = requests.filter(r => r.status === 'Pending').length;
    res.status(200).json({ success: true, requests, pendingResets });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch password reset requests' });
  }
};

// @desc    Approve Password Reset Request
// @route   PATCH /api/admin/password-resets/:id/approve
exports.approvePasswordReset = async (req, res) => {
  try {
    const { adminComment } = req.body;
    const request = await Request.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    if (request.status !== 'Pending') return res.status(400).json({ success: false, message: 'Request already processed' });

    const newPassword = generatePassword();
    const organizerExists = await Organizer.findById(request.organizer);
    if (!organizerExists) return res.status(404).json({ success: false, message: 'Organizer not found' });

    const hashedPassword = await bcrypt.hash(newPassword, await bcrypt.genSalt(10));
    await Organizer.updateOne({ _id: request.organizer }, { password: hashedPassword });

    request.status = 'Approved';
    request.adminComment = adminComment || '';
    request.newPassword = '';
    await request.save();

    res.status(200).json({
      success: true,
      message: 'Password reset approved. Share the new password with the organizer.',
      newPassword,
      organizerEmail: request.organizerEmail,
      organizerName: request.organizerName,
      request
    });
  } catch (error) {
    console.error('Approve Reset Error:', error);
    res.status(500).json({ success: false, message: 'Failed to approve reset request' });
  }
};

// @desc    Reject Password Reset Request
// @route   PATCH /api/admin/password-resets/:id/reject
exports.rejectPasswordReset = async (req, res) => {
  try {
    const { adminComment } = req.body;
    const request = await Request.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    if (request.status !== 'Pending') return res.status(400).json({ success: false, message: 'Request already processed' });

    request.status = 'Rejected';
    request.adminComment = adminComment || '';
    await request.save();

    res.status(200).json({ success: true, message: 'Password reset request rejected', request });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to reject reset request' });
  }
};