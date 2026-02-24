const ChatMessage = require('../models/ChatMessage');
const Team = require('../models/Team');

// Verify user is a member of the team
const isTeamMember = (team, userId) => {
  const uid = userId.toString();
  return team.leader.toString() === uid ||
    team.members.some(m => m.user.toString() === uid && m.status === 'Accepted');
};

// GET /api/participant/teams/:teamId/chat
exports.getMessages = async (req, res) => {
  try {
    const { teamId } = req.params;
    const userId = req.user._id;

    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });
    if (!isTeamMember(team, userId))
      return res.status(403).json({ success: false, message: 'You are not a member of this team' });

    const messages = await ChatMessage.find({ team: teamId })
      .sort({ createdAt: 1 })
      .limit(100);

    res.status(200).json({ success: true, messages });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch messages' });
  }
};

// POST /api/participant/teams/:teamId/chat
exports.sendMessage = async (req, res) => {
  try {
    const { teamId } = req.params;
    const { content, type, fileName, fileUrl } = req.body;
    const userId = req.user._id;

    if (!content || !content.trim())
      return res.status(400).json({ success: false, message: 'Message content required' });

    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });
    if (!isTeamMember(team, userId))
      return res.status(403).json({ success: false, message: 'You are not a member of this team' });

    const msg = await ChatMessage.create({
      team: teamId,
      sender: userId,
      senderName: `${req.user.firstName} ${req.user.lastName}`,
      type: type || 'text',
      content: content.trim(),
      fileName: fileName || '',
      fileUrl: fileUrl || ''
    });

    res.status(201).json({ success: true, message: msg });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to send message' });
  }
};