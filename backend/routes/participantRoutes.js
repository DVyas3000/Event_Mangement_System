const express = require('express');
const router = express.Router();
const {
  getProfile,
  updateProfile,
  toggleFollowClub,
  changePassword,
  getAvailableClubs,
  getMyEvents,
  getClubDetails
} = require('../controllers/participantController');

const {
  browseEvents,
  getEventById,
  registerForEvent,
  cancelRegistration,
  getTrendingEvents,
  getTicket
} = require('../controllers/eventController');

const { verifyToken, authorize } = require('../middleware/auth');

router.use(verifyToken);
router.use(authorize('participant'));

router.get('/profile', getProfile);
router.put('/profile', updateProfile);

router.get('/clubs', getAvailableClubs);
router.post('/follow/:clubId', toggleFollowClub);

router.get('/clubs/:id', getClubDetails);

router.put('/change-password', changePassword);

router.get('/my-events', getMyEvents);

// Event browsing and registration
router.get('/events/browse', browseEvents);
router.get('/events/trending', getTrendingEvents);

// Ticket route must come before :eventId to avoid conflict
router.get('/ticket/:ticketId', getTicket);

router.get('/events/:eventId', getEventById);
router.post('/events/:eventId/register', registerForEvent);
router.delete('/events/:eventId/register', cancelRegistration);

module.exports = router;
