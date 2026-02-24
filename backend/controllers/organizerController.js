const Organizer = require('../models/Organizer');
const Event = require('../models/Event');
const Request = require('../models/Request');
const bcrypt = require('bcryptjs');
const axios = require('axios');

const buildDiscordPayload = (event, organizer) => {
  const start = event?.startDate
    ? new Date(event.startDate).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
    : 'TBD';
  const end = event?.endDate
    ? new Date(event.endDate).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
    : 'TBD';
  const fee = typeof event?.registrationFee === 'number' ? `₹${event.registrationFee}` : 'TBD';
  const tags = Array.isArray(event?.tags) && event.tags.length ? event.tags.join(', ') : 'None';

  return {
    content: `New event published by ${organizer?.name || 'Organizer'}`,
    embeds: [
      {
        title: event?.name || 'New Event',
        description: event?.description || 'No description provided.',
        color: 0x111111,
        fields: [
          { name: 'Type', value: event?.type || 'N/A', inline: true },
          { name: 'Fee', value: fee, inline: true },
          { name: 'Eligibility', value: event?.eligibility || 'N/A', inline: false },
          { name: 'Start', value: start, inline: true },
          { name: 'End', value: end, inline: true },
          { name: 'Tags', value: tags, inline: false }
        ],
        footer: { text: 'Event Management System' }
      }
    ]
  };
};

const sendDiscordNotification = async (webhookUrl, event, organizer) => {
  if (!webhookUrl) return;
  try {
    const payload = buildDiscordPayload(event, organizer);
    await axios.post(webhookUrl, payload, { timeout: 5000 });
  } catch (error) {
    const details = error?.response?.data || error?.message || 'Unknown error';
    console.error('Discord webhook error:', details);
  }
};

// @desc    Get Organizer Profile
// @route   GET /api/organizer/profile
// @access  Private (Organizer only)
exports.getProfile = async (req, res) => {
  try {
    const organizer = await Organizer.findById(req.user._id).select('-password');

    if (!organizer) {
      return res.status(404).json({
        success: false,
        message: 'Organizer not found'
      });
    }

    res.status(200).json({
      success: true,
      profile: organizer
    });
  } catch (error) {
    console.error('Get Profile Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile'
    });
  }
};

// @desc    Update Organizer Profile
// @route   PUT /api/organizer/profile
// @access  Private (Organizer only)
exports.updateProfile = async (req, res) => {
  try {
    const { name, description, contactEmail, contactNumber, discordWebhook } = req.body;

    const organizer = await Organizer.findById(req.user._id);

    if (!organizer) {
      return res.status(404).json({
        success: false,
        message: 'Organizer not found'
      });
    }

    if (name) organizer.name = name;
    if (description !== undefined) organizer.description = description;
    if (contactEmail !== undefined) organizer.contactEmail = contactEmail;
    if (contactNumber !== undefined) organizer.contactNumber = contactNumber;
    if (discordWebhook !== undefined) organizer.discordWebhook = discordWebhook;

    await organizer.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      profile: organizer
    });
  } catch (error) {
    console.error('Update Profile Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update profile'
    });
  }
};

// @desc    Change Password
// @route   PUT /api/organizer/change-password
// @access  Private (Organizer only)
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'New passwords do not match'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }

    const organizer = await Organizer.findById(req.user._id).select('+password');
    const isMatch = await organizer.comparePassword(currentPassword);
    
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    organizer.password = newPassword;
    await organizer.save();

    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change Password Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change password'
    });
  }
};

// @desc    Get Dashboard Stats
// @route   GET /api/organizer/stats
// @access  Private (Organizer only)
exports.getStats = async (req, res) => {
  try {
    const organizerId = req.user._id;

    const totalEvents = await Event.countDocuments({ organizer: organizerId });
    const upcomingEvents = await Event.countDocuments({ 
      organizer: organizerId,
      status: { $in: ['Published', 'Ongoing'] }
    });

    const completedEvents = await Event.find({ 
      organizer: organizerId,
      status: 'Completed'
    });

    let totalRegistrations = 0;
    let totalRevenue = 0;
    let totalAttendance = 0;

    completedEvents.forEach(event => {
      totalRegistrations += event.analytics?.totalRegistrations || 0;
      totalRevenue += event.analytics?.totalRevenue || 0;
      // FIX #9: Use attendanceCount from analytics (now correctly maintained)
      totalAttendance += event.analytics?.attendanceCount || 0;
    });

    res.status(200).json({
      success: true,
      stats: {
        totalEvents,
        upcomingEvents,
        totalRegistrations,
        totalRevenue,
        totalAttendance
      }
    });
  } catch (error) {
    console.error('Get Stats Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch stats'
    });
  }
};

// @desc    Get All Events by Organizer
// @route   GET /api/organizer/events
// @access  Private (Organizer only)
exports.getEvents = async (req, res) => {
  try {
    const events = await Event.find({ organizer: req.user._id })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      events
    });
  } catch (error) {
    console.error('Get Events Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch events'
    });
  }
};

// @desc    Create Event
// @route   POST /api/organizer/events
// @access  Private (Organizer only)
exports.createEvent = async (req, res) => {
  try {
    const { customFormFields, maxTeamSize, merchandiseDetails: md, ...rest } = req.body;

    const eventData = {
      ...rest,
      organizer: req.user._id,
      status: 'Draft',
      formLocked: false,
      customFormFields: Array.isArray(customFormFields) ? customFormFields : [],
      // FIX #14: Set isTeamEvent correctly in organizer create path too
      analytics: { isTeamEvent: rest.type === 'Hackathon' }
    };

    // Merchandise details
    if (rest.type === 'Merchandise') {
      eventData.merchandiseDetails = {
        itemDetails:   req.body.itemDetails   || (md && md.itemDetails)   || '',
        stockQuantity: Number(req.body.stockQuantity || (md && md.stockQuantity) || 0),
        purchaseLimit: Number(req.body.purchaseLimit || (md && md.purchaseLimit) || 1),
      };
    }

    // Hackathon team size
    if (rest.type === 'Hackathon' && (maxTeamSize || req.body.maxTeamSize)) {
      eventData.teamDetails = { maxTeamSize: Number(maxTeamSize || req.body.maxTeamSize) };
    }

    const event = await Event.create(eventData);

    res.status(201).json({
      success: true,
      message: 'Event created successfully as Draft',
      event
    });
  } catch (error) {
    console.error('Create Event Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create event'
    });
  }
};

// @desc    Get Single Event
// @route   GET /api/organizer/events/:id
// @access  Private (Organizer only)
exports.getEvent = async (req, res) => {
  try {
    const event = await Event.findOne({ 
      _id: req.params.id,
      organizer: req.user._id 
    }).populate('participants.user', 'firstName lastName email');

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    res.status(200).json({
      success: true,
      event
    });
  } catch (error) {
    console.error('Get Event Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch event'
    });
  }
};

// @desc    Update Event
// @route   PUT /api/organizer/events/:id
// @access  Private (Organizer only)
exports.updateEvent = async (req, res) => {
  try {
    const event = await Event.findOne({ 
      _id: req.params.id,
      organizer: req.user._id 
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Draft: Allow all edits
    if (event.status === 'Draft') {
      const { customFormFields, maxTeamSize, ...rest } = req.body;
      Object.assign(event, rest);

      // Re-build nested objects properly
      if (event.type === 'Merchandise') {
        event.merchandiseDetails = {
          itemDetails:   rest.itemDetails   ?? event.merchandiseDetails?.itemDetails   ?? '',
          stockQuantity: Number(rest.stockQuantity ?? event.merchandiseDetails?.stockQuantity ?? 0),
          purchaseLimit: Number(rest.purchaseLimit ?? event.merchandiseDetails?.purchaseLimit ?? 1),
        };
      }
      if (event.type === 'Hackathon' && maxTeamSize) {
        event.teamDetails = { maxTeamSize: Number(maxTeamSize) };
      }
      // Custom form fields — only update if form not locked
      if (!event.formLocked && Array.isArray(customFormFields)) {
        event.customFormFields = customFormFields;
      }
    }
    // Published: Limited edits
    else if (event.status === 'Published') {
      if (req.body.description !== undefined) {
        event.description = req.body.description;
      }
      if (req.body.registrationDeadline !== undefined) {
        const newDeadline = new Date(req.body.registrationDeadline);
        if (Number.isNaN(newDeadline.getTime())) {
          return res.status(400).json({ success: false, message: 'Invalid registration deadline' });
        }
        if (newDeadline < new Date(event.registrationDeadline)) {
          return res.status(400).json({ success: false, message: 'Registration deadline can only be extended' });
        }
        event.registrationDeadline = newDeadline;
      }
      if (req.body.registrationLimit !== undefined) {
        const newLimit = Number(req.body.registrationLimit);
        if (Number.isNaN(newLimit) || newLimit < event.registrationLimit) {
          return res.status(400).json({ success: false, message: 'Registration limit can only be increased' });
        }
        event.registrationLimit = newLimit;
      }
      if (req.body.status === 'Closed') {
        event.status = 'Closed';
      }
    }
    // Ongoing/Completed: Only status change
    else if (event.status === 'Ongoing' || event.status === 'Completed') {
      if (req.body.status && ['Completed', 'Closed', 'Ongoing'].includes(req.body.status)) {
        event.status = req.body.status;
      }
    }

    await event.save();

    res.status(200).json({
      success: true,
      message: 'Event updated successfully',
      event
    });
  } catch (error) {
    console.error('Update Event Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update event'
    });
  }
};

// @desc    Publish Event
// @route   PATCH /api/organizer/events/:id/publish
// @access  Private (Organizer only)
exports.publishEvent = async (req, res) => {
  try {
    const event = await Event.findOne({ 
      _id: req.params.id,
      organizer: req.user._id 
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    if (event.status !== 'Draft') {
      return res.status(400).json({
        success: false,
        message: 'Only draft events can be published'
      });
    }

    event.status = 'Published';
    await event.save();

    // FIX: Re-fetch organizer from DB to get discordWebhook (req.user may lack it after updates)
    const organizer = await Organizer.findById(req.user._id).select('name discordWebhook');
    if (organizer?.discordWebhook) {
      await sendDiscordNotification(organizer.discordWebhook, event, organizer);
    }

    res.status(200).json({
      success: true,
      message: 'Event published successfully',
      event
    });
  } catch (error) {
    console.error('Publish Event Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to publish event'
    });
  }
};

// @desc    Delete Event
// @route   DELETE /api/organizer/events/:id
// @access  Private (Organizer only)
exports.deleteEvent = async (req, res) => {
  try {
    const event = await Event.findOne({ 
      _id: req.params.id,
      organizer: req.user._id 
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    if (event.participants.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete event with registered participants'
      });
    }

    await Event.deleteOne({ _id: req.params.id });

    res.status(200).json({
      success: true,
      message: 'Event deleted successfully'
    });
  } catch (error) {
    console.error('Delete Event Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete event'
    });
  }
};

// ================= ATTENDANCE: SCAN TICKET =================
// @route   POST /api/organizer/events/:id/attendance/scan
// @access  Private (Organizer only)
exports.scanAttendance = async (req, res) => {
  try {
    const { ticketId, method } = req.body;
    const organizerId = req.user._id;

    if (!ticketId) {
      return res.status(400).json({ success: false, message: 'ticketId is required' });
    }

    const event = await Event.findOne({ _id: req.params.id, organizer: organizerId })
      .populate('participants.user', 'firstName lastName email');
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    const participant = event.participants.find(p => p.ticketId === ticketId);
    if (!participant) {
      return res.status(404).json({ success: false, message: 'Ticket not found for this event' });
    }

    if (participant.attended) {
      return res.status(409).json({
        success: false,
        message: 'Already scanned',
        attendance: {
          ticketId,
          attendedAt: participant.attendedAt,
          attendedBy: participant.attendedBy
        }
      });
    }

    participant.attended = true;
    participant.attendedAt = new Date();
    participant.attendedBy = organizerId;
    participant.attendanceMethod = method || 'camera';

    // FIX #9: Increment attendanceCount in analytics
    if (!event.analytics) {
      event.analytics = { totalRegistrations: 0, totalRevenue: 0, attendanceCount: 0 };
    }
    event.analytics.attendanceCount = (event.analytics.attendanceCount || 0) + 1;

    event.attendanceLogs.push({
      ticketId,
      user: participant.user?._id,
      action: 'scan',
      method: method || 'camera',
      scannedBy: organizerId
    });

    await event.save();

    res.status(200).json({
      success: true,
      message: 'Attendance marked',
      participant: {
        ticketId,
        name: participant.user?.firstName
          ? `${participant.user.firstName} ${participant.user.lastName}`
          : 'Participant'
      },
      attendedAt: participant.attendedAt
    });
  } catch (error) {
    console.error('Scan Attendance Error:', error);
    res.status(500).json({ success: false, message: 'Failed to mark attendance' });
  }
};

// ================= ATTENDANCE: MANUAL OVERRIDE =================
// @route   POST /api/organizer/events/:id/attendance/override
// @access  Private (Organizer only)
exports.overrideAttendance = async (req, res) => {
  try {
    const { ticketId, action, note } = req.body;
    const organizerId = req.user._id;

    if (!ticketId || !action) {
      return res.status(400).json({ success: false, message: 'ticketId and action are required' });
    }
    if (!['mark', 'unmark'].includes(action)) {
      return res.status(400).json({ success: false, message: 'action must be mark or unmark' });
    }

    const event = await Event.findOne({ _id: req.params.id, organizer: organizerId })
      .populate('participants.user', 'firstName lastName email');
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    const participant = event.participants.find(p => p.ticketId === ticketId);
    if (!participant) {
      return res.status(404).json({ success: false, message: 'Ticket not found for this event' });
    }

    if (!event.analytics) {
      event.analytics = { totalRegistrations: 0, totalRevenue: 0, attendanceCount: 0 };
    }

    if (action === 'mark') {
      // FIX #9: Only increment if not already attended
      if (!participant.attended) {
        event.analytics.attendanceCount = (event.analytics.attendanceCount || 0) + 1;
      }
      participant.attended = true;
      participant.attendedAt = new Date();
      participant.attendedBy = organizerId;
      participant.attendanceMethod = 'manual';
    } else {
      // FIX #9: Only decrement if currently attended
      if (participant.attended) {
        event.analytics.attendanceCount = Math.max(0, (event.analytics.attendanceCount || 0) - 1);
      }
      participant.attended = false;
      participant.attendedAt = null;
      participant.attendedBy = null;
      participant.attendanceMethod = 'manual';
    }

    event.attendanceLogs.push({
      ticketId,
      user: participant.user?._id,
      action: action === 'mark' ? 'override_mark' : 'override_unmark',
      method: 'manual',
      note: note || '',
      scannedBy: organizerId
    });

    await event.save();

    res.status(200).json({
      success: true,
      message: action === 'mark' ? 'Attendance marked' : 'Attendance unmarked'
    });
  } catch (error) {
    console.error('Override Attendance Error:', error);
    res.status(500).json({ success: false, message: 'Failed to override attendance' });
  }
};

// ================= ATTENDANCE: EXPORT CSV =================
// @route   GET /api/organizer/events/:id/attendance/export
// @access  Private (Organizer only)
exports.exportAttendance = async (req, res) => {
  try {
    const organizerId = req.user._id;
    const event = await Event.findOne({ _id: req.params.id, organizer: organizerId })
      .populate('participants.user', 'firstName lastName email');
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    const lines = ['Ticket ID,Name,Email,Attended,Attended At,Method'];
    for (const p of event.participants) {
      const name = p.user ? `${p.user.firstName} ${p.user.lastName}` : '';
      const email = p.user?.email || '';
      lines.push([
        p.ticketId || '',
        `"${name.replace(/\"/g, '""')}"`,
        email,
        p.attended ? 'Yes' : 'No',
        p.attendedAt ? new Date(p.attendedAt).toISOString() : '',
        p.attendanceMethod || ''
      ].join(','));
    }

    const csv = lines.join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="attendance-${event._id}.csv"`);
    res.status(200).send(csv);
  } catch (error) {
    console.error('Export Attendance Error:', error);
    res.status(500).json({ success: false, message: 'Failed to export attendance' });
  }
};

// @desc    Submit password reset request
// @route   POST /api/organizer/password-reset-request
// @access  Private (Organizer only)
exports.submitRequest = async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason || !reason.trim()) {
      return res.status(400).json({ success: false, message: 'Reason is required' });
    }

    const organizer = await Organizer.findById(req.user._id).select('name email');
    if (!organizer) {
      return res.status(404).json({ success: false, message: 'Organizer not found' });
    }

    const request = await Request.create({
      organizer: organizer._id,
      organizerName: organizer.name,
      organizerEmail: organizer.email,
      clubName: organizer.name,
      reason: reason.trim()
    });

    res.status(201).json({ success: true, message: 'Reset request submitted', request });
  } catch (error) {
    console.error('Submit Request Error:', error);
    res.status(500).json({ success: false, message: 'Failed to submit reset request' });
  }
};

// @desc    Get organizer's password reset requests
// @route   GET /api/organizer/password-reset-requests
// @access  Private (Organizer only)
exports.getMyResetRequests = async (req, res) => {
  try {
    const requests = await Request.find({ organizer: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, requests });
  } catch (error) {
    console.error('Get Reset Requests Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch reset requests' });
  }
};