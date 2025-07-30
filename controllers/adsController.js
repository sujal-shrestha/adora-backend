// controllers/adsController.js
import dotenv from 'dotenv';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import FormData from 'form-data';
import Media from '../models/Media.js';
import User from '../models/User.js';

dotenv.config();

export const generateAd = async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ message: 'Prompt is required' });
    }

    const user = await User.findById(req.user.id);
    if (!user || user.credits < 5) {
      return res.status(403).json({ message: 'Not enough credits' });
    }

    // 🔄 Create multipart form data
    const formData = new FormData();
    formData.append('prompt', prompt);
    formData.append('output_format', 'png');

    // 🔄 Stability API call (Core endpoint)
    const stabilityRes = await axios.post(
      'https://api.stability.ai/v2beta/stable-image/generate/core',
      formData,
      {
        headers: {
          Authorization: `Bearer ${process.env.STABILITY_API_KEY}`,
          Accept: 'image/*',
          ...formData.getHeaders(), // 🔑 Required for multipart/form-data
        },
        responseType: 'arraybuffer', // Important to get image buffer
      }
    );

    // 🔄 Save image buffer to file
    const filename = `generated_${Date.now()}.png`;
    const uploadPath = path.join('uploads', filename);
    fs.writeFileSync(uploadPath, stabilityRes.data);

    // 🔄 Save to MongoDB
    const newMedia = new Media({
      user: req.user.id,
      filename,
      url: `/uploads/${filename}`,
    });
    await newMedia.save();

    user.credits -= 5;
    await user.save();

    return res.json({
      message: 'Ad image generated successfully',
      image: `/uploads/${filename}`,
      remainingCredits: user.credits,
    });
  } catch (err) {
    console.error('🔥 Stability error:', err?.response?.data || err.message);
    return res.status(500).json({ message: 'Failed to generate ad image' });
  }
};
