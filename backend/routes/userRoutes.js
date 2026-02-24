const express = require('express');
const router = express.Router();
const { saveInterests } = require('../controllers/userController');
const { verifyToken } = require('../middleware/auth');

// @route   POST /api/user/interests
router.post('/interests', verifyToken, saveInterests);

module.exports = router;