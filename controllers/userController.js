import User from '../models/User.js';
import bcrypt from 'bcryptjs';

export const changeMyPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: 'Password updated successfully ✅' });
  } catch (err) {
    console.error('🔥 changeMyPassword error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/users/me
export const getMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json(user);
  } catch (err) {
    console.error('🔥 getMyProfile error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// PUT /api/users/me
export const updateMyProfile = async (req, res) => {
  try {
    const { name, email, profilePic } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.name = name || user.name;
    user.email = email || user.email;
    user.profilePic = profilePic || user.profilePic;

    const updatedUser = await user.save();

    res.json({
      id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      profilePic: updatedUser.profilePic,
    });
  } catch (err) {
    console.error('🔥 updateMyProfile error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE /api/users/me
export const deleteMyAccount = async (req, res) => {
  try {
    console.log('🔥 Reached deleteMyAccount route', req.user?.id); // <-- ADD THIS
    await User.findByIdAndDelete(req.user.id);
    res.json({ message: 'Your account has been deleted' });
  } catch (err) {
    console.error('🔥 deleteMyAccount error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

