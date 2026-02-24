const express  = require('express');
const router   = express.Router();
const { registerParticipant, login, getCurrentUser, logout } = require('../controllers/authController');
const { verifyToken } = require('../middleware/auth');
const { checkBlocked, trackFailedAttempt, rateLimiter } = require('../middleware/securityMiddleware');

const authGuard = [checkBlocked, rateLimiter(10, 60_000), trackFailedAttempt];

router.post('/register', ...authGuard, registerParticipant);
router.post('/login',    ...authGuard, login);
router.get('/me',        verifyToken, getCurrentUser);
router.post('/logout',   verifyToken, logout);

module.exports = router;