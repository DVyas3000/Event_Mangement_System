const express = require('express');
const router = express.Router();
const {
  getProfile, updateProfile, changePassword, getStats,
  getEvents, createEvent, getEvent, updateEvent, publishEvent, deleteEvent,
  scanAttendance, overrideAttendance, exportAttendance,
  submitRequest, getMyResetRequests
} = require('../controllers/organizerController');
const { verifyToken, authorize } = require('../middleware/auth');

router.use(verifyToken);
router.use(authorize('organizer'));

// Profile
router.get('/profile',          getProfile);
router.put('/profile',          updateProfile);
router.put('/change-password',  changePassword);

// Stats
router.get('/stats', getStats);

// Password reset requests
router.post('/password-reset-request',   submitRequest);
router.get('/password-reset-requests',   getMyResetRequests);

// Events
router.get('/events',                              getEvents);
router.post('/events',                             createEvent);
router.get('/events/:id',                          getEvent);
router.put('/events/:id',                          updateEvent);
router.patch('/events/:id/publish',                publishEvent);
router.delete('/events/:id',                       deleteEvent);
router.post('/events/:id/attendance/scan',         scanAttendance);
router.post('/events/:id/attendance/override',     overrideAttendance);
router.get('/events/:id/attendance/export',        exportAttendance);

module.exports = router;