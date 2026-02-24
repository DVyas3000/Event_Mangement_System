const express  = require('express');
const router   = express.Router();
const {
  getStats, getOrganizers, createOrganizer, deleteOrganizer, toggleOrganizerStatus,
  getPasswordResets, approvePasswordReset, rejectPasswordReset
} = require('../controllers/adminController');
const { verifyToken, authorize } = require('../middleware/auth');
const security = require('../middleware/securityMiddleware');

router.use(verifyToken);
router.use(authorize('admin'));

router.get('/stats',                          getStats);
router.get('/organizers',                     getOrganizers);
router.post('/organizers',                    createOrganizer);
router.delete('/organizers/:id',              deleteOrganizer);
router.patch('/organizers/:id/toggle',        toggleOrganizerStatus);

// Password reset routes
router.get('/password-resets',                getPasswordResets);
router.patch('/password-resets/:id/approve',  approvePasswordReset);
router.patch('/password-resets/:id/reject',   rejectPasswordReset);

// Security endpoints
router.get('/security/events',      (req, res) => res.json({ success: true, events:  security.getSecurityEvents() }));
router.get('/security/blocked',     (req, res) => res.json({ success: true, blocked: security.getBlockedIPs() }));
router.post('/security/block',      (req, res) => {
  const { ip, reason } = req.body;
  if (!ip) return res.status(400).json({ success: false, message: 'IP required' });
  security.manualBlock(ip, reason);
  res.json({ success: true, message: `${ip} blocked` });
});
router.delete('/security/block/:ip', (req, res) => {
  security.unblockIP(decodeURIComponent(req.params.ip));
  res.json({ success: true, message: 'IP unblocked' });
});

module.exports = router;