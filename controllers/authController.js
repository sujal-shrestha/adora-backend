import bcrypt from 'bcryptjs';
import User from '../models/User.js';

// Register User
export const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    console.log('🔍 Request received:', { name, email, password });

    if (!name || !email || !password) {
      console.log('❌ Missing fields');
      return res.status(400).json({ message: 'All fields are required' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log('⚠️ User already exists');
      return res.status(409).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashedPassword });

    console.log('✅ User created:', user);
    return res.status(201).json({
      message: 'Registered successfully',
      user: { id: user._id, email: user.email },
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

    res.status(200).json({
      message: 'Login successful',
      user: { id: user._id, email: user.email },
    });
  } catch (error) {
    console.error('Login Error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};
