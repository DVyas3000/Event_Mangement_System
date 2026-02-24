const User      = require('../models/User');
const Organizer = require('../models/Organizer');
const Admin     = require('../models/Admin');
const { generateToken } = require('../middleware/auth');
const axios = require('axios');

// Google reCAPTCHA v2 verification:
// - enforced in production
// - can be enforced in other environments via RECAPTCHA_ENABLED=true
// - skipped in local/dev by default to avoid blocking auth when reCAPTCHA is not configured
const isCaptchaEnforced = () => {
  const enabledFlag = String(process.env.RECAPTCHA_ENABLED || '').toLowerCase() === 'true';
  return process.env.NODE_ENV === 'production' || enabledFlag;
};

const verifyCaptcha = async (token) => {
  if (!isCaptchaEnforced()) return true;
  const secret = (process.env.RECAPTCHA_SECRET || '').trim();
  if (!secret) return false;
  if (!token) return false;
  try {
    const body = new URLSearchParams({ secret, response: token });
    const res = await axios.post('https://www.google.com/recaptcha/api/siteverify', body.toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
    return res.data?.success === true;
  } catch { return false; }
};

// POST /api/auth/register
exports.registerParticipant = async (req, res) => {
  try {
    const { firstName, lastName, email, password, participantType, collegeName, contactNumber, captchaToken } = req.body;

    if (!await verifyCaptcha(captchaToken))
      return res.status(400).json({ success: false, message: 'CAPTCHA verification failed. Please try again.' });

    if (!firstName || !lastName || !email || !password || !participantType)
      return res.status(400).json({ success: false, message: 'Please provide all required fields' });

    if (participantType === 'IIIT' && !/iiit\.ac\.in$/i.test(email))
      return res.status(400).json({ success: false, message: 'IIIT participants must use IIIT email address (@iiit.ac.in)' });

    if (await User.findOne({ email }))
      return res.status(400).json({ success: false, message: 'User with this email already exists' });

    const user = await User.create({
      firstName, lastName, email, password, participantType,
      collegeName: participantType === 'NON_IIIT' ? collegeName : 'IIIT', contactNumber
    });
    const token = generateToken(user._id, 'participant');
    res.status(201).json({
      success: true, message: 'Registration successful', token,
      user: { id: user._id, firstName: user.firstName, lastName: user.lastName, email: user.email, participantType: user.participantType, role: 'participant' }
    });
  } catch (error) {
    console.error('Registration Error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error during registration' });
  }
};

// POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password, role, captchaToken } = req.body;

    if (!await verifyCaptcha(captchaToken))
      return res.status(400).json({ success: false, message: 'CAPTCHA verification failed. Please try again.' });

    if (!email || !password || !role)
      return res.status(400).json({ success: false, message: 'Please provide email, password, and role' });

    let user, userRole;
    if (role === 'participant')    { user = await User.findOne({ email }).select('+password');     userRole = 'participant'; }
    else if (role === 'organizer') { user = await Organizer.findOne({ email }).select('+password'); userRole = 'organizer'; }
    else if (role === 'admin')     { user = await Admin.findOne({ email }).select('+password');     userRole = 'admin'; }
    else return res.status(400).json({ success: false, message: 'Invalid role specified' });

    if (userRole === 'organizer' && user && !user.isActive)
      return res.status(403).json({ success: false, message: 'Your account has been deactivated. Please contact admin.' });

    if (!user || !await user.comparePassword(password))
      return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const token = generateToken(user._id, userRole);
    let userData;
    if (userRole === 'participant') userData = { id: user._id, firstName: user.firstName, lastName: user.lastName, email: user.email, participantType: user.participantType, role: userRole };
    else if (userRole === 'organizer') userData = { id: user._id, name: user.name, email: user.email, category: user.category, role: userRole };
    else userData = { id: user._id, email: user.email, role: userRole };

    res.status(200).json({ success: true, message: 'Login successful', token, user: userData });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error during login' });
  }
};

// GET /api/auth/me
exports.getCurrentUser = async (req, res) => {
  try { res.status(200).json({ success: true, user: req.user, role: req.userRole }); }
  catch (error) { res.status(500).json({ success: false, message: error.message || 'Server error' }); }
};

// POST /api/auth/logout
exports.logout = async (req, res) => {
  try { res.status(200).json({ success: true, message: 'Logout successful' }); }
  catch (error) { res.status(500).json({ success: false, message: error.message || 'Server error' }); }
};