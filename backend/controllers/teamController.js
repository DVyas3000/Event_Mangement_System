// controllers/teamController.js
const Team    = require('../models/Team');
const Event   = require('../models/Event');
const User    = require('../models/User');
const crypto  = require('crypto');
const QRCode  = require('qrcode');
const nodemailer = require('nodemailer');

const genInviteCode = () => crypto.randomBytes(4).toString('hex').toUpperCase();
const genTicketId   = () =>
  `TKT-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

const createTransporter = () =>
  nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
  });

const generateQR = async (data) => {
  try {
    return await QRCode.toDataURL(JSON.stringify(data), {
      errorCorrectionLevel: 'H', width: 256, margin: 1
    });
  } catch { return null; }
};

// send ticket email to one member
const sendTeamTicketEmail = async ({ user, event, team, ticketId, qrDataUrl }) => {
  try {
    const transporter = createTransporter();
    const qrBuffer = qrDataUrl
      ? Buffer.from(qrDataUrl.split(',')[1], 'base64') : null;

    const dateStr = new Date(event.startDate).toLocaleDateString('en-GB',
      { day:'2-digit', month:'2-digit', year:'2-digit' });

    await transporter.sendMail({
      from: `"Felicity Events" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: `Team Ticket - ${event.name}`,
      html: `
<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
  body{font-family:Arial,sans-serif;background:#f5f5f5;margin:0;padding:20px;}
  .container{max-width:600px;margin:0 auto;background:#fff;border:1px solid #d4d4d4;}
  .header{background:#111;color:#fff;padding:24px 28px;}
  .header h1{margin:0;font-size:22px;}
  .body{padding:24px 28px;}
  .ticket-id{background:#f0f0f0;border:1px solid #d4d4d4;padding:12px 16px;
    font-family:monospace;font-size:18px;font-weight:700;letter-spacing:2px;margin:16px 0;}
  .info-row{display:flex;gap:8px;margin-bottom:8px;font-size:14px;}
  .label{color:#888;min-width:120px;font-weight:600;}
  .qr-section{text-align:center;padding:20px;background:#fafafa;
    border:1px solid #d4d4d4;margin:20px 0;}
  .team-badge{display:inline-block;background:#111;color:#fff;
    padding:4px 12px;font-size:12px;font-weight:700;letter-spacing:1px;}
</style></head><body>
<div class="container">
  <div class="header">
    <h1>Team Registration Confirmed</h1>
    <p style="margin:4px 0 0;color:#ccc;">Your team is ready for ${event.name}</p>
  </div>
  <div class="body">
    <p>Hi ${user.firstName},</p>
    <p>Your team <strong>${team.name}</strong> has been successfully formed. Here is your personal ticket.</p>
    <div class="ticket-id">${ticketId}</div>
    <div class="info-row"><span class="label">Event</span><span>${event.name}</span></div>
    <div class="info-row"><span class="label">Date</span><span>${dateStr}</span></div>
    <div class="info-row"><span class="label">Team</span><span>${team.name}</span></div>
    <div class="info-row"><span class="label">Role</span>
      <span class="team-badge">${team.leader.toString()===user._id.toString()?'Leader':'Member'}</span>
    </div>
    <div class="qr-section">
      <p style="margin:0 0 12px;font-weight:700;">Your QR Code</p>
      ${qrBuffer ? '<img src="cid:qrcode" width="180" height="180" />' : '<p>QR unavailable</p>'}
      <p style="font-size:12px;color:#888;margin:8px 0 0;">Show this at the event entrance</p>
    </div>
    <p style="font-size:12px;color:#888;">This ticket is non-transferable.</p>
  </div>
</div>
</body></html>`,
      attachments: qrBuffer ? [{ filename:'qrcode.png', content:qrBuffer,
        contentType:'image/png', cid:'qrcode' }] : []
    });
    return true;
  } catch (err) {
    console.error('[EMAIL] Team ticket error:', err.message);
    return false;
  }
};

// POST /api/participant/teams/create
exports.createTeam = async (req, res) => {
  try {
    const { eventId, teamName, maxSize } = req.body;
    const leaderId = req.user._id;

    if (!eventId || !teamName || !maxSize)
      return res.status(400).json({ success:false, message:'eventId, teamName, maxSize required' });
    if (maxSize < 2 || maxSize > 10)
      return res.status(400).json({ success:false, message:'Team size must be between 2 and 10' });

    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ success:false, message:'Event not found' });
    if (!['Published','Ongoing'].includes(event.status))
      return res.status(400).json({ success:false, message:'Event is not open for registration' });
    if (event.type !== 'Hackathon')
      return res.status(400).json({ success:false, message:'This event does not support team registration' });
    if (new Date() > new Date(event.registrationDeadline))
      return res.status(400).json({ success:false, message:'Registration deadline has passed' });

    // check leader not already in a team for this event
    const existing = await Team.findOne({
      event: eventId,
      $or: [{ leader: leaderId }, { 'members.user': leaderId, 'members.status': 'Accepted' }]
    });
    if (existing)
      return res.status(400).json({ success:false, message:'You are already in a team for this event' });

    // check event capacity (count teams that are Complete or Forming)
    const teamCount = await Team.countDocuments({ event: eventId, status: { $ne:'Cancelled' } });
    if (teamCount >= event.registrationLimit)
      return res.status(400).json({ success:false, message:'Event team capacity is full' });

    // generate unique invite code
    let inviteCode, codeExists = true;
    while (codeExists) {
      inviteCode = genInviteCode();
      codeExists = await Team.findOne({ inviteCode });
    }

    const team = await Team.create({
      name: teamName,
      event: eventId,
      leader: leaderId,
      maxSize,
      inviteCode,
      members: [],
      status: 'Forming'
    });

    res.status(201).json({
      success: true,
      message: 'Team created! Share the invite code with your members.',
      team: {
        _id:        team._id,
        name:       team.name,
        inviteCode: team.inviteCode,
        maxSize:    team.maxSize,
        status:     team.status,
        members:    []
      }
    });
  } catch (err) {
    console.error('Create Team Error:', err);
    res.status(500).json({ success:false, message:'Failed to create team' });
  }
};

// POST /api/participant/teams/join
exports.joinTeam = async (req, res) => {
  try {
    const { inviteCode } = req.body;
    const userId = req.user._id;

    if (!inviteCode)
      return res.status(400).json({ success:false, message:'Invite code required' });

    const team = await Team.findOne({ inviteCode }).populate('event');
    if (!team) return res.status(404).json({ success:false, message:'Invalid invite code' });
    if (team.status !== 'Forming')
      return res.status(400).json({ success:false, message:'Team is no longer accepting members' });

    const event = team.event;
    if (new Date() > new Date(event.registrationDeadline))
      return res.status(400).json({ success:false, message:'Registration deadline has passed' });

    // can't join own team as leader
    if (team.leader.toString() === userId.toString())
      return res.status(400).json({ success:false, message:'You are the leader of this team' });

    // already a member?
    if (team.members.some(m => m.user.toString() === userId.toString()))
      return res.status(400).json({ success:false, message:'You have already been invited to this team' });

    // in another team?
    const existing = await Team.findOne({
      event: event._id,
      $or: [{ leader: userId }, { 'members.user': userId, 'members.status': 'Accepted' }]
    });
    if (existing)
      return res.status(400).json({ success:false, message:'You are already in another team for this event' });

    const acceptedCount = team.members.filter(m => m.status === 'Accepted').length + 1; // +1 leader
    if (acceptedCount >= team.maxSize) {
      return res.status(400).json({ success:false, message:'Team is already full' });
    }

    // add directly as Accepted
    team.members.push({ user: userId, status: 'Accepted', joinedAt: new Date() });
    await team.save();

    const accepted = team.members.filter(m => m.status === 'Accepted');
    const totalMembers = accepted.length + 1; // +1 for leader
    if (totalMembers >= team.maxSize) {
      await _finaliseTeam(team);
    }

    res.status(200).json({
      success: true,
      message: 'You have joined the team.',
      teamId: team._id,
      teamName: team.name,
      eventName: event.name,
      teamStatus: team.status
    });
  } catch (err) {
    console.error('Join Team Error:', err);
    res.status(500).json({ success:false, message:'Failed to join team' });
  }
};

// PATCH /api/participant/teams/:teamId/respond
exports.respondToInvite = async (req, res) => {
  try {
    const { teamId } = req.params;
    const { action } = req.body; // 'accept' | 'decline'
    const userId = req.user._id;

    const team = await Team.findById(teamId).populate('event');
    if (!team) return res.status(404).json({ success:false, message:'Team not found' });

    const memberEntry = team.members.find(m => m.user.toString() === userId.toString());
    if (!memberEntry)
      return res.status(404).json({ success:false, message:'You have no pending invite for this team' });
    if (memberEntry.status !== 'Pending')
      return res.status(400).json({ success:false, message:'Invite already responded to' });

    if (action === 'decline') {
      memberEntry.status = 'Declined';
      await team.save();
      return res.status(200).json({ success:true, message:'Invite declined' });
    }

    if (action !== 'accept')
      return res.status(400).json({ success:false, message:'action must be accept or decline' });

    // accept
    memberEntry.status  = 'Accepted';
    memberEntry.joinedAt = new Date();
    await team.save();

    // check if team is now full -> generate tickets for everyone
    const accepted = team.members.filter(m => m.status === 'Accepted');
    const totalMembers = accepted.length + 1; // +1 for leader

    if (totalMembers >= team.maxSize) {
      await _finaliseTeam(team);
    }

    res.status(200).json({
      success: true,
      message: 'You have joined the team!',
      teamStatus: team.status
    });
  } catch (err) {
    console.error('Respond Invite Error:', err);
    res.status(500).json({ success:false, message:'Failed to respond to invite' });
  }
};

// GET /api/participant/teams/my?eventId=xxx
exports.getMyTeam = async (req, res) => {
  try {
    const { eventId } = req.query;
    const userId = req.user._id;

    const team = await Team.findOne({
      event: eventId,
      $or: [{ leader: userId }, { 'members.user': userId }]
    })
      .populate('leader', 'firstName lastName email')
      .populate('members.user', 'firstName lastName email')
      .populate('event', 'name startDate registrationFee');

    if (!team) return res.status(404).json({ success:false, message:'No team found' });

    res.status(200).json({ success:true, team });
  } catch (err) {
    console.error('Get My Team Error:', err);
    res.status(500).json({ success:false, message:'Failed to fetch team' });
  }
};

// GET /api/participant/teams/preview/:inviteCode
exports.previewTeam = async (req, res) => {
  try {
    const team = await Team.findOne({ inviteCode: req.params.inviteCode })
      .populate('leader', 'firstName lastName')
      .populate('event', 'name startDate eligibility registrationFee');

    if (!team) return res.status(404).json({ success:false, message:'Invalid invite code' });

    res.status(200).json({
      success: true,
      team: {
        _id:        team._id,
        name:       team.name,
        status:     team.status,
        maxSize:    team.maxSize,
        memberCount: team.members.filter(m => m.status === 'Accepted').length + 1,
        leader:     team.leader,
        event:      team.event
      }
    });
  } catch (err) {
    res.status(500).json({ success:false, message:'Failed to preview team' });
  }
};

// GET /api/organizer/events/:eventId/teams
exports.getEventTeams = async (req, res) => {
  try {
    const teams = await Team.find({ event: req.params.eventId })
      .populate('leader', 'firstName lastName email')
      .populate('members.user', 'firstName lastName email')
      .sort({ createdAt: -1 });

    res.status(200).json({ success:true, teams });
  } catch (err) {
    res.status(500).json({ success:false, message:'Failed to fetch teams' });
  }
};

// DELETE /api/participant/teams/:teamId
exports.deleteTeam = async (req, res) => {
  try {
    const { teamId } = req.params;
    const userId = req.user._id;

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ success:false, message:'Team not found' });
    }
    if (team.leader.toString() !== userId.toString()) {
      return res.status(403).json({ success:false, message:'Only the team leader can delete the team' });
    }
    if (team.status !== 'Forming') {
      return res.status(400).json({ success:false, message:'Only forming teams can be deleted' });
    }

    await Team.deleteOne({ _id: teamId });
    return res.status(200).json({ success:true, message:'Team deleted successfully' });
  } catch (err) {
    console.error('Delete Team Error:', err);
    return res.status(500).json({ success:false, message:'Failed to delete team' });
  }
};

async function _finaliseTeam(team) {
  try {
    const event = await Event.findById(team.event).populate('organizer', 'name');
    if (!event) {
      console.error('[TEAM] Event not found during finalise, teamId:', team._id);
      return;
    }

    const leader = await User.findById(team.leader);
    if (!leader) {
      console.error('[TEAM] Leader not found during finalise, leaderId:', team.leader);
      return;
    }

    // Ensure analytics sub-doc exists (safety for events created before analytics field was added)
    if (!event.analytics) {
      event.analytics = { totalRegistrations: 0, totalRevenue: 0, attendanceCount: 0 };
    }

    // All accepted members fetched from DB
    const acceptedMembers = await User.find({
      _id: { $in: team.members.filter(m => m.status === 'Accepted').map(m => m.user) }
    });

    // Leader is ALWAYS first  they must always get a ticket regardless of member count
    const allEntries = [
      { user: leader, teamRole: 'Leader' },
      ...acceptedMembers.map(u => ({ user: u, teamRole: 'Member' }))
    ];

    for (const { user, teamRole } of allEntries) {
      // Idempotent: skip if already registered (handles re-runs)
      const alreadyIn = event.participants.some(
        p => p.user && p.user.toString() === user._id.toString()
      );
      if (alreadyIn) {
        console.log(`[TEAM] ${user.email} already registered, skipping`);
        continue;
      }

      const ticketId = genTicketId();
      const qrData = {
        ticketId,
        eventId:            event._id.toString(),
        eventName:          event.name,
        participantId:      user._id.toString(),
        participantName:    `${user.firstName} ${user.lastName}`,
        participantEmail:   user.email,
        teamId:             team._id.toString(),
        teamName:           team.name,
        teamRole,
        isTeamRegistration: true,
        generatedAt:        new Date().toISOString()
      };
      const qrDataUrl = await generateQR(qrData);

      event.participants.push({
        user:             user._id,
        registrationDate: new Date(),
        paymentStatus:    'Approved',
        ticketId,
        teamId:           team._id
      });

      event.analytics.totalRegistrations += 1;
      event.analytics.totalRevenue       += (event.registrationFee || 0);

      // Send ticket email fire-and-forget 
      sendTeamTicketEmail({ user, event, team, ticketId, qrDataUrl }).catch(
        err => console.error(`[EMAIL] Failed sending ticket to ${user.email}:`, err.message)
      );
    }

    team.status = 'Complete';
    await Promise.all([team.save(), event.save()]);
    console.log(`[TEAM] Finalised "${team.name}"  ${allEntries.length} ticket(s) issued for "${event.name}"`);
  } catch (err) {
    console.error('[TEAM] Finalise error:', err.message, err.stack);
  }
}
