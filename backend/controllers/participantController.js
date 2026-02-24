const User = require('../models/User');
const Organizer = require('../models/Organizer');
const Event = require('../models/Event');
const Team = require('../models/Team');

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('followedClubs', 'name category description').select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.status(200).json({ success: true, profile: user });
  } catch (error) {
    console.error('Get Profile Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch profile' });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, contactNumber, collegeName, areasOfInterest } = req.body;
    const updateData = {};
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (contactNumber !== undefined) updateData.contactNumber = contactNumber;
    if (collegeName !== undefined) updateData.collegeName = collegeName;
    if (areasOfInterest !== undefined) updateData.areasOfInterest = areasOfInterest;
    const user = await User.findByIdAndUpdate(req.user._id, updateData, { new: true, runValidators: true }).select('-password');
    res.status(200).json({ success: true, message: 'Profile updated successfully', profile: user });
  } catch (error) {
    console.error('Update Profile Error:', error);
    res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    if (!currentPassword || !newPassword || !confirmPassword)
      return res.status(400).json({ success: false, message: 'Please provide all required fields' });
    if (newPassword !== confirmPassword)
      return res.status(400).json({ success: false, message: 'New passwords do not match' });
    if (newPassword.length < 6)
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    const user = await User.findById(req.user._id).select('+password');
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch)
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    user.password = newPassword;
    await user.save();
    res.status(200).json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change Password Error:', error);
    res.status(500).json({ success: false, message: 'Failed to change password' });
  }
};

exports.getClubDetails = async (req, res) => {
  try {
    const organizerId = req.params.id;
    const organizer = await Organizer.findById(organizerId).select('name category description contactEmail');
    if (!organizer) return res.status(404).json({ success: false, message: 'Organizer not found' });
    const events = await Event.find({
      organizer: organizerId,
      status: { $in: ['Published', 'Ongoing', 'Completed', 'Cancelled', 'Closed'] }
    }).select('name type startDate endDate status venue registrationFee').sort({ startDate: 1 }).lean();
    return res.status(200).json({ success: true, organizer, events });
  } catch (error) {
    console.error('Get Club Details Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load organizer details' });
  }
};

exports.getAvailableClubs = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('followedClubs');
    const clubs = await Organizer.find({ isActive: true }).select('name category description contactEmail');
    const clubsWithFollow = clubs.map(club => ({
      ...club.toObject(),
      isFollowed: user.followedClubs.some(id => id.toString() === club._id.toString())
    }));
    res.status(200).json({ success: true, clubs: clubsWithFollow });
  } catch (error) {
    console.error('Get Clubs Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch clubs' });
  }
};

exports.toggleFollowClub = async (req, res) => {
  try {
    const { clubId } = req.params;
    const user = await User.findById(req.user._id);
    const isFollowing = user.followedClubs.some(id => id.toString() === clubId);
    if (isFollowing) {
      user.followedClubs = user.followedClubs.filter(id => id.toString() !== clubId);
    } else {
      user.followedClubs.push(clubId);
    }
    await user.save();
    res.status(200).json({
      success: true,
      message: isFollowing ? 'Unfollowed successfully' : 'Followed successfully',
      isFollowed: !isFollowing
    });
  } catch (error) {
    console.error('Toggle Follow Error:', error);
    res.status(500).json({ success: false, message: 'Failed to update follow status' });
  }
};

exports.getMyEvents = async (req, res) => {
  try {
    const userId = req.user._id;
    const now = new Date();

    const allEvents = await Event.find({ 'participants.user': userId })
      .populate('organizer', 'name category').lean();

    const myTeams = await Team.find({
      $or: [{ leader: userId }, { 'members.user': userId }]
    })
      .populate({
        path: 'event',
        select: 'name type startDate endDate registrationFee organizer status',
        populate: { path: 'organizer', select: 'name category' }
      })
      .populate('leader', 'firstName lastName')
      .populate('members.user', 'firstName lastName')
      .lean();

    const teamByEventId = new Map();
    for (const team of myTeams) {
      if (team.event?._id) {
        teamByEventId.set(team.event._id.toString(), team);
      }
    }

    const upcoming = [];
    const normal = [];
    const merchandise = [];
    const hackathon = [];
    const completed = [];
    // FIX #11: renamed to cancelled/rejected — only 'Rejected' is a valid paymentStatus enum value
    const cancelled = [];

    const buildTeamMeta = (team) => {
      if (!team) return {};
      const acceptedCount = team.members.filter(m => m.status === 'Accepted').length + 1;
      const maxSize = team.maxSize || 0;
      const slotsLeft = Math.max(0, maxSize - acceptedCount);
      const members = [
        { name: `${team.leader.firstName} ${team.leader.lastName}`, status: 'Leader' },
        ...team.members.map(m => ({
          name: `${m.user.firstName} ${m.user.lastName}`,
          status: m.status
        }))
      ];
      return {
        teamId: team._id,
        teamName: team.name,
        teamStatus: team.status,
        teamInviteCode: team.inviteCode,
        teamLeaderId: team.leader?._id || team.leader,
        teamMaxSize: maxSize,
        teamAcceptedCount: acceptedCount,
        teamSlotsLeft: slotsLeft,
        teamMembers: members
      };
    };

    const registeredEventIds = new Set(allEvents.map(e => e._id.toString()));

    for (const event of allEvents) {
      const registration = event.participants.find(p => p.user.toString() === userId.toString());
      if (!registration) continue;
      const teamMeta = teamByEventId.get(event._id.toString());
      const teamInfo = buildTeamMeta(teamMeta);

      const eventData = {
        _id: event._id, name: event.name, type: event.type,
        organizer: event.organizer, startDate: event.startDate, endDate: event.endDate,
        registrationFee: event.registrationFee, status: event.status,
        ticketId: registration.ticketId, registrationDate: registration.registrationDate,
        paymentStatus: registration.paymentStatus, attended: registration.attended,
        teamName: teamInfo.teamName || registration.teamName || null,
        teamStatus: teamInfo.teamStatus || null,
        teamInviteCode: teamInfo.teamInviteCode || null,
        teamLeaderId: teamInfo.teamLeaderId || null,
        teamMaxSize: teamInfo.teamMaxSize || null,
        teamAcceptedCount: teamInfo.teamAcceptedCount || null,
        teamSlotsLeft: teamInfo.teamSlotsLeft || null,
        teamMembers: teamInfo.teamMembers || null,
        itemDetails: event.merchandiseDetails?.itemDetails || null,
        venue: event.venue || null
      };

      const paymentStatus = registration.paymentStatus;

      // FIX #11: Only 'Rejected' is a valid paymentStatus — removed invalid 'Cancelled' check
      // Also handle closed events separately (they go into normal history, not cancelled)
      if (paymentStatus === 'Rejected') {
        cancelled.push({ ...eventData, status: 'Rejected' });
        continue;
      }

      if (event.status === 'Completed' || new Date(event.endDate) < now) {
        completed.push({ ...eventData, status: 'Completed' });
        if (event.type === 'Normal') {
          normal.push({ ...eventData, status: 'Completed' });
        } else if (event.type === 'Merchandise') {
          merchandise.push({ ...eventData, status: 'Approved' });
        } else if (event.type === 'Hackathon') {
          hackathon.push({ ...eventData, status: 'Completed' });
        }
        continue;
      }

      // Upcoming: approved registrations for future events
      if (new Date(event.startDate) > now && paymentStatus === 'Approved') {
        upcoming.push({ ...eventData, status: 'Registered' });
      }

      if (event.type === 'Normal') {
        normal.push({ ...eventData, status: paymentStatus === 'Approved' ? 'Registered' : paymentStatus });
      } else if (event.type === 'Merchandise') {
        merchandise.push({ ...eventData, status: paymentStatus });
      } else if (event.type === 'Hackathon') {
        const teamStatus = eventData.teamStatus;
        const hackathonStatus = teamStatus === 'Forming' ? 'Forming' : 'Registered';
        hackathon.push({ ...eventData, status: hackathonStatus });
      }
    }

    // Add hackathon team entries where user is in a team but not yet in event.participants (still forming)
    for (const team of myTeams) {
      const teamEvent = team.event;
      if (!teamEvent || teamEvent.type !== 'Hackathon') continue;
      if (registeredEventIds.has(teamEvent._id.toString())) continue;

      const teamInfo = buildTeamMeta(team);
      const baseData = {
        _id: teamEvent._id,
        name: teamEvent.name,
        type: teamEvent.type,
        organizer: teamEvent.organizer,
        startDate: teamEvent.startDate,
        endDate: teamEvent.endDate,
        registrationFee: teamEvent.registrationFee,
        status: team.status === 'Forming' ? 'Forming' : teamEvent.status,
        ticketId: null,
        registrationDate: null,
        paymentStatus: 'Approved',
        attended: false,
        itemDetails: null,
        venue: teamEvent.venue || null,
        ...teamInfo
      };

      hackathon.push(baseData);
      if (new Date(teamEvent.startDate) > now) {
        upcoming.push(baseData);
      }
    }

    console.log(`[PARTICIPANT] getMyEvents for ${userId}: upcoming=${upcoming.length}, normal=${normal.length}, merchandise=${merchandise.length}, completed=${completed.length}, cancelled=${cancelled.length}`);

    res.status(200).json({
      success: true,
      events: { upcoming, normal, merchandise, hackathon, completed, cancelled }
    });
  } catch (error) {
    console.error('Get My Events Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch your events' });
  }
};