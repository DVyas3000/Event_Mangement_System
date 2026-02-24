const User = require('../models/User');

// @desc    Save user's selected areas of interest
// @route   POST /api/user/interests
// @access  Private (Participant)
exports.saveInterests = async (req, res) => {
  try {
    const { interests } = req.body;

    if (!Array.isArray(interests)) {
      return res.status(400).json({ success: false, message: 'Interests must be an array' });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        areasOfInterest: interests,
        hasSelectedInterests: true
      },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({ success: true, message: 'Interests saved successfully', user });
  } catch (err) {
    console.error('Save Interests Error:', err);
    res.status(500).json({ success: false, message: 'Failed to save interests' });
  }
};