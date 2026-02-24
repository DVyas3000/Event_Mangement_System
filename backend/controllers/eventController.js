const Event = require('../models/Event');
const User = require('../models/User');
const Team = require('../models/Team');
const crypto = require('crypto');
const QRCode = require('qrcode');
const nodemailer = require('nodemailer');

// ================= EMAIL TRANSPORTER =================
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

// ================= GENERATE QR CODE =================
const generateQRCode = async (ticketData) => {
  try {
    const qrString = JSON.stringify(ticketData);
    const qrDataUrl = await QRCode.toDataURL(qrString);
    return qrDataUrl;
  } catch (err) {
    console.error('QR generation error:', err);
    return null;
  }
};

// ================= SEND TICKET EMAIL =================
const sendTicketEmail = async ({ user, event, ticketId, qrCodeDataUrl, organizer }) => {
  try {
    const transporter = createTransporter();

    const eventDate = new Date(event.startDate).toLocaleDateString('en-GB', {
      day: '2-digit', month: '2-digit', year: '2-digit'
    });
    const eventTime = new Date(event.startDate).toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit'
    });

    const qrBase64 = qrCodeDataUrl ? qrCodeDataUrl.split(',')[1] : null;
    const qrBuffer = qrBase64 ? Buffer.from(qrBase64, 'base64') : null;

    const isNormal = event.type === 'Normal';

    const mailOptions = {
      from: `"Felicity Events" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: `Your Ticket for ${event.name} (${ticketId})`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    body { font-family: Arial, sans-serif; background:#f5f6f8; margin:0; padding:24px; color:#111827; }
    .container { max-width: 640px; margin: 0 auto; background:#ffffff; border:1px solid #e5e7eb; border-radius:12px; overflow:hidden; }
    .header { padding:24px; border-bottom:1px solid #e5e7eb; background:#fafafa; }
    .header h1 { margin:0; font-size:20px; }
    .header p { margin:8px 0 0; color:#6b7280; font-size:14px; }
    .body { padding:24px; }
    .ticketBox { border:1px solid #e5e7eb; border-radius:10px; padding:16px; background:#ffffff; margin:16px 0 20px; }
    .ticketId { font-size:16px; font-weight:700; letter-spacing:0.5px; }
    .table { width:100%; border-collapse:collapse; margin-top:10px; }
    .row { border-top:1px solid #f1f5f9; }
    .label { width:170px; padding:10px 0; color:#6b7280; font-size:13px; vertical-align:top; }
    .value { padding:10px 0; font-size:14px; }
    .qr { text-align:center; padding:16px; border:1px solid #e5e7eb; border-radius:10px; background:#fafafa; margin:20px 0; }
    .qr img { border:1px solid #e5e7eb; border-radius:8px; background:#fff; }
    .footer { padding:18px 24px; border-top:1px solid #e5e7eb; background:#fafafa; color:#6b7280; font-size:12px; }
    .muted { color:#6b7280; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Registration Confirmation</h1>
      <p>${isNormal ? 'Your registration has been confirmed.' : 'Your merchandise purchase has been confirmed.'}</p>
    </div>
    <div class="body">
      <p>Dear ${user.firstName} ${user.lastName},</p>
      <div class="ticketBox">
        <div class="muted" style="font-size:12px; margin-bottom:6px;">Ticket ID</div>
        <div class="ticketId">${ticketId}</div>
      </div>
      <div style="font-weight:700; font-size:16px; margin-bottom:6px;">${event.name}</div>
      <div class="muted" style="font-size:13px; margin-bottom:12px;">Type: ${isNormal ? 'Normal Event' : 'Merchandise'}</div>
      <table class="table">
        <tr class="row">
          <td class="label">Date</td>
          <td class="value">${eventDate}</td>
        </tr>
        <tr class="row">
          <td class="label">Time</td>
          <td class="value">${eventTime}</td>
        </tr>
        <tr class="row">
          <td class="label">Organizer</td>
          <td class="value">${organizer.name}</td>
        </tr>
        <tr class="row">
          <td class="label">Fee</td>
          <td class="value">&#8377;${event.registrationFee}</td>
        </tr>
        <tr class="row">
          <td class="label">Registered As</td>
          <td class="value">${user.firstName} ${user.lastName} (${user.email})</td>
        </tr>
        <tr class="row">
          <td class="label">Participant Type</td>
          <td class="value">${user.participantType === 'IIIT' ? 'IIIT Student' : 'External Participant'}</td>
        </tr>
      </table>
      <div class="qr">
        <div style="font-weight:700; margin-bottom:10px;">QR Code</div>
        ${qrBuffer ? '<img src="cid:qrcode" alt="QR Code" width="180" height="180" />' : '<p>QR Code unavailable</p>'}
        <div class="muted" style="font-size:12px; margin-top:10px;">Please show this QR code at the event entrance.</div>
      </div>
    </div>
    <div class="footer">This ticket is non-transferable. For queries, contact the organizer.</div>
  </div>
</body>
</html>
      `,
      attachments: qrBuffer
        ? [{ filename: 'qrcode.png', content: qrBuffer, contentType: 'image/png', cid: 'qrcode' }]
        : []
    };

    await transporter.sendMail(mailOptions);
    console.log(`[EMAIL] Ticket sent to ${user.email} for event: ${event.name}`);
    return true;
  } catch (err) {
    console.error('[EMAIL] Send error:', err.message);
    return false;
  }
};

// ================= CREATE EVENT =================
exports.createEvent = async (req, res) => {
  try {
    const organizerId = req.user.id;
    const {
      name, description, type, eligibility,
      registrationDeadline, startDate, endDate,
      registrationLimit, registrationFee, tags,
      customFormFields, merchandiseDetails, maxTeamSize
    } = req.body;

    if (!name || !description || !type || !eligibility ||
      !registrationDeadline || !startDate || !endDate ||
      registrationLimit === undefined || registrationFee === undefined) {
      return res.status(400).json({ message: 'All required event fields must be provided' });
    }

    if (new Date(endDate) < new Date(startDate)) {
      return res.status(400).json({ message: 'End date cannot be before start date' });
    }
    if (type === 'Hackathon' && !maxTeamSize) {
      return res.status(400).json({ message: 'Max team size is required for Hackathon events' });
    }

    const event = await Event.create({
      name, description, type, eligibility,
      registrationDeadline, startDate, endDate,
      registrationLimit, registrationFee,
      tags: tags || [],
      customFormFields: customFormFields || [],
      merchandiseDetails: type === 'Merchandise' ? merchandiseDetails : undefined,
      teamDetails: type === 'Hackathon' ? { maxTeamSize: Number(maxTeamSize) } : undefined,
      analytics: { isTeamEvent: type === 'Hackathon' },
      organizer: organizerId
    });

    res.status(201).json({ success: true, message: 'Event created successfully', event });
  } catch (error) {
    console.error('Create Event Error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to create event' });
  }
};

// ================= BROWSE EVENTS =================
// FIX #2: Fuzzy/Partial search now matches BOTH event name AND organizer name
exports.browseEvents = async (req, res) => {
  try {
    const { search, type, eligibility, startDate, endDate, followedOnly } = req.query;
    const userId = req.user?._id;

    // Build base match (non-search filters applied at start)
    const baseMatch = { status: { $ne: 'Draft' } };
    if (type) baseMatch.type = type;
    if (eligibility) baseMatch.eligibility = eligibility;
    if (startDate || endDate) {
      baseMatch.startDate = {};
      if (startDate) baseMatch.startDate.$gte = new Date(startDate);
      if (endDate) baseMatch.startDate.$lte = new Date(endDate);
    }
    if (followedOnly === 'true' && userId) {
      const user = await User.findById(userId);
      if (user && user.followedClubs.length > 0) {
        baseMatch.organizer = { $in: user.followedClubs };
      }
    }

    // Use aggregation to support organizer name search
    const pipeline = [
      { $match: baseMatch },
      {
        $lookup: {
          from: 'organizers',
          localField: 'organizer',
          foreignField: '_id',
          as: 'organizer'
        }
      },
      { $unwind: '$organizer' }
    ];

    // Apply search filter AFTER lookup so we can match on organizer.name too
    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { 'organizer.name': { $regex: search, $options: 'i' } }
          ]
        }
      });
    }

    pipeline.push({ $sort: { startDate: 1 } });

    // Project only needed organizer fields
    pipeline.push({
      $addFields: {
        organizer: {
          _id: '$organizer._id',
          name: '$organizer.name',
          category: '$organizer.category',
          description: '$organizer.description'
        }
      }
    });

    const events = await Event.aggregate(pipeline);

    if (userId) {
      for (let event of events) {
        event.isRegistered = event.participants.some(
          p => p.user && p.user.toString() === userId.toString()
        );
        event.spotsLeft = event.registrationLimit - event.participants.length;
      }
    }

    res.status(200).json({ success: true, events });
  } catch (error) {
    console.error('Browse Events Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch events' });
  }
};

// ================= GET EVENT BY ID =================
exports.getEventById = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user?._id;

    const event = await Event.findById(eventId)
      .populate('organizer', 'name category description contactEmail')
      .lean();

    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    if (userId) {
      const userRegistration = event.participants.find(
        p => p.user.toString() === userId.toString()
      );
      event.isRegistered = !!userRegistration;
      event.userRegistration = userRegistration;
    }

    event.spotsLeft = event.registrationLimit - event.participants.length;
    event.registrationClosed =
      new Date() > new Date(event.registrationDeadline) ||
      event.spotsLeft <= 0 ||
      event.status === 'Closed';

    res.status(200).json({ success: true, event });
  } catch (error) {
    console.error('Get Event Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch event details' });
  }
};

// ================= REGISTER FOR EVENT =================
exports.registerForEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user._id;
    const { formData, merchandiseOptions } = req.body;

    const event = await Event.findById(eventId).populate('organizer', 'name');
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    // ---- Validations ----
    if (!['Published', 'Ongoing'].includes(event.status)) {
      return res.status(400).json({ success: false, message: 'Event is not open for registration' });
    }
    if (new Date() > new Date(event.registrationDeadline)) {
      return res.status(400).json({ success: false, message: 'Registration deadline has passed' });
    }
    if (event.participants.length >= event.registrationLimit) {
      return res.status(400).json({ success: false, message: 'Event is full' });
    }
    if (event.participants.some(p => p.user.toString() === userId.toString())) {
      return res.status(400).json({ success: false, message: 'You are already registered' });
    }

    if (event.type === 'Merchandise') {
      if (!event.merchandiseDetails || event.merchandiseDetails.stockQuantity <= 0) {
        return res.status(400).json({ success: false, message: 'Item is out of stock' });
      }
      // Check purchase limit per participant
      const purchaseLimit = event.merchandiseDetails.purchaseLimit || 1;
      const existingPurchases = event.participants.filter(p => p.user.toString() === userId.toString()).length;
      if (existingPurchases >= purchaseLimit) {
        return res.status(400).json({ success: false, message: `Purchase limit of ${purchaseLimit} reached for this item` });
      }
    }

    const user = await User.findById(userId);

    if ((event.eligibility === 'IIIT Students Only' || event.eligibility === 'Only IIIT') && user.participantType !== 'IIIT') {
      return res.status(403).json({ success: false, message: 'This event is only for IIIT students' });
    }

    // ---- Generate Ticket ID ----
    const ticketId = `TKT-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    // ---- Generate QR Code ----
    const qrData = {
      ticketId,
      eventId: event._id.toString(),
      eventName: event.name,
      participantId: userId.toString(),
      participantName: `${user.firstName} ${user.lastName}`,
      participantEmail: user.email,
      type: event.type,
      generatedAt: new Date().toISOString()
    };
    const qrCodeDataUrl = await generateQRCode(qrData);

    // ---- Validate required custom form fields ----
    if (event.customFormFields && event.customFormFields.length > 0) {
      for (const field of event.customFormFields) {
        if (field.required) {
          const val = formData && formData[field.label];
          if (val === undefined || val === null || val === '' || val === false) {
            return res.status(400).json({ success: false, message: `Field '${field.label}' is required` });
          }
        }
      }
    }

    // ---- Lock form after first registration ----
    if (!event.formLocked && event.customFormFields && event.customFormFields.length > 0) {
      event.formLocked = true;
    }

    // ---- Save Participant ----
    event.participants.push({
      user: userId,
      registrationDate: new Date(),
      paymentStatus: 'Approved',
      ticketId
    });

    // ---- Update Analytics ----
    if (!event.analytics) {
      event.analytics = { totalRegistrations: 0, totalRevenue: 0, attendanceCount: 0 };
    }
    event.analytics.totalRegistrations += 1;
    event.analytics.totalRevenue += event.registrationFee;

    // ---- Decrement Stock for Merchandise ----
    if (event.type === 'Merchandise' && event.merchandiseDetails) {
      event.merchandiseDetails.stockQuantity -= 1;
    }

    await event.save();
    console.log(`[REGISTER] ${user.email} registered for ${event.name} - ticketId: ${ticketId}`);

    // ---- Send Ticket Email ----
    sendTicketEmail({
      user,
      event,
      ticketId,
      qrCodeDataUrl,
      organizer: event.organizer
    }).then(sent => {
      if (!sent) console.warn(`[EMAIL] Failed to send ticket to ${user.email}`);
    }).catch(err => console.error('[EMAIL] Unexpected error:', err));

    res.status(200).json({
      success: true,
      message: `Successfully ${event.type === 'Merchandise' ? 'purchased' : 'registered'}! Ticket sent to your email.`,
      ticketId,
      qrCode: qrCodeDataUrl,
      event: {
        _id: event._id,
        name: event.name,
        type: event.type,
        startDate: event.startDate,
        organizer: event.organizer
      }
    });

  } catch (error) {
    console.error('Registration Error:', error);
    res.status(500).json({ success: false, message: 'Failed to register for event' });
  }
};

// ================= CANCEL REGISTRATION =================
exports.cancelRegistration = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user._id;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    const regs = event.participants.filter(p => p.user.toString() === userId.toString());
    if (!regs.length) {
      return res.status(400).json({ success: false, message: 'You are not registered for this event' });
    }

    if (regs.some(r => r.teamId)) {
      return res.status(400).json({ success: false, message: 'Team registrations cannot be cancelled here' });
    }

    if (regs.some(r => r.attended)) {
      return res.status(400).json({ success: false, message: 'Cannot cancel after attendance is marked' });
    }

    if (new Date() > new Date(event.registrationDeadline)) {
      return res.status(400).json({ success: false, message: 'Cancellation window has closed' });
    }

    const removeCount = regs.length;
    event.participants = event.participants.filter(p => p.user.toString() !== userId.toString());

    if (!event.analytics) {
      event.analytics = { totalRegistrations: 0, totalRevenue: 0, attendanceCount: 0 };
    }
    event.analytics.totalRegistrations = Math.max(0, event.analytics.totalRegistrations - removeCount);
    event.analytics.totalRevenue = Math.max(0, event.analytics.totalRevenue - (event.registrationFee * removeCount));

    if (event.type === 'Merchandise' && event.merchandiseDetails) {
      event.merchandiseDetails.stockQuantity += removeCount;
    }

    await event.save();

    res.status(200).json({
      success: true,
      message: 'Registration cancelled successfully'
    });
  } catch (error) {
    console.error('Cancel Registration Error:', error);
    res.status(500).json({ success: false, message: 'Failed to cancel registration' });
  }
};

// ================= GET TICKET =================
exports.getTicket = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const userId = req.user._id;

    const event = await Event.findOne({ 'participants.ticketId': ticketId })
      .populate('organizer', 'name category contactEmail');

    if (!event) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    const registration = event.participants.find(p => p.ticketId === ticketId);

    // Security: only owner can view their ticket
    if (registration.user.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const user = await User.findById(userId);

    // ---- Resolve team info if exists ----
    let teamName = null;
    let teamRole = null;

    if (registration.teamId) {
      try {
        const team = await Team.findById(registration.teamId).select('name leader');
        if (team) {
          teamName = team.name;
          teamRole = team.leader.toString() === userId.toString() ? 'Leader' : 'Member';
        }
      } catch (teamErr) {
        console.warn('[TICKET] Could not fetch team info:', teamErr.message);
      }
    }

    // ---- Regenerate QR code on demand ----
    const qrData = {
      ticketId,
      eventId: event._id.toString(),
      eventName: event.name,
      participantId: userId.toString(),
      participantName: `${user.firstName} ${user.lastName}`,
      participantEmail: user.email,
      type: event.type,
      generatedAt: registration.registrationDate
    };
    const qrCodeDataUrl = await generateQRCode(qrData);

    res.status(200).json({
      success: true,
      ticket: {
        ticketId,
        qrCode: qrCodeDataUrl,
        event: {
          _id: event._id,
          name: event.name,
          type: event.type,
          description: event.description,
          startDate: event.startDate,
          endDate: event.endDate,
          eligibility: event.eligibility,
          registrationFee: event.registrationFee,
          organizer: event.organizer,
          merchandiseDetails: event.merchandiseDetails
        },
        participant: {
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          participantType: user.participantType,
          collegeName: user.participantType === 'IIIT' ? null : user.collegeName
        },
        registration: {
          registrationDate: registration.registrationDate,
          paymentStatus: registration.paymentStatus,
          attended: registration.attended,
          teamName,
          teamRole
        }
      }
    });
  } catch (error) {
    console.error('Get Ticket Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch ticket' });
  }
};

// ================= GET TRENDING EVENTS =================
exports.getTrendingEvents = async (req, res) => {
  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const events = await Event.aggregate([
      { $match: { status: { $ne: 'Draft' }, startDate: { $gte: new Date() } } },
      {
        $addFields: {
          recentRegistrations: {
            $size: {
              $filter: {
                input: '$participants',
                as: 'p',
                cond: { $gte: ['$$p.registrationDate', twentyFourHoursAgo] }
              }
            }
          }
        }
      },
      { $sort: { recentRegistrations: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'organizers',
          localField: 'organizer',
          foreignField: '_id',
          as: 'organizer'
        }
      },
      { $unwind: '$organizer' }
    ]);

    res.status(200).json({ success: true, events });
  } catch (error) {
    console.error('Trending Events Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch trending events' });
  }
};
