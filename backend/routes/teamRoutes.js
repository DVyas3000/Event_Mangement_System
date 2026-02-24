const express = require('express');
const router  = express.Router();
const {
  createTeam, joinTeam, deleteTeam,
  getMyTeam, previewTeam, getEventTeams
} = require('../controllers/teamController');
const { getMessages, sendMessage } = require('../controllers/chatController');
const { verifyToken, authorize } = require('../middleware/auth');

router.use(verifyToken);

// Participant routes
router.post('/create',                 authorize('participant'), createTeam);
router.post('/join',                   authorize('participant'), joinTeam);
router.delete('/:teamId',              authorize('participant'), deleteTeam);
router.get('/my',                      authorize('participant'), getMyTeam);
router.get('/preview/:inviteCode',     authorize('participant'), previewTeam);

// Chat routes
router.get('/:teamId/chat',            authorize('participant'), getMessages);
router.post('/:teamId/chat',           authorize('participant'), sendMessage);

// Organizer route
router.get('/event/:eventId',          authorize('organizer'), getEventTeams);

module.exports = router;