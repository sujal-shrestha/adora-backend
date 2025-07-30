import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';

// Register User
export const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    console.log('🔍 Register request:', { name, email, password });

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashedPassword });

    // Generate token on register (optional)
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('✅ User registered:', user);

    return res.status(201).json({
  message: 'Registered successfully',
  token,
  user: {
    id: user._id,
    name: user.name,
    email: user.email,
    profilePic: user.profilePic || '',
    credits: user.credits || 0,
  },
});
  } catch (error) {
    console.error('🔥 Registration Error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Login User
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate token on login
    const token = jwt.sign(
      { id: user._id }, // Payload
      process.env.JWT_SECRET, // Secret key
      { expiresIn: '7d' } // Expiration
    );

    console.log('✅ User logged in:', user);

    return res.status(200).json({
    message: 'Login successful',
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      profilePic: user.profilePic || '',
      credits: user.credits || 0,
    },
  });

  } catch (error) {
    console.error('🔥 Login Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error('🔥 Profile Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
