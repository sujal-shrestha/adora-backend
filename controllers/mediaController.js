// controllers/mediaController.js
import Media from '../models/Media.js';
import fs from 'fs';
import path from 'path';

export const uploadMedia = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const media = await Media.create({
      user: req.user.id,
      url: req.file.filename,
      filename: req.file.filename
    });

    res.status(201).json(media);
  } catch (err) {
    console.error('🔥 Upload error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getMyMedia = async (req, res) => {
  try {
    const media = await Media.find({ user: req.user.id }).sort({ createdAt: -1 });

    res.json(media.map((file) => ({
    _id: file._id,
    filename: file.filename,
    url: `/uploads/${file.filename}`
    })));
  } catch (err) {
    console.error('🔥 Get media error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteMedia = async (req, res) => {
  try {
    const media = await Media.findOne({ _id: req.params.id, user: req.user.id });
    if (!media) return res.status(404).json({ message: 'Media not found' });

    const filePath = path.join('./uploads', media.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await media.deleteOne();
    res.json({ message: 'Media deleted successfully' });
  } catch (err) {
    console.error('🔥 Delete error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const renameMedia = async (req, res) => {
  try {
    const { filename } = req.body;

    const media = await Media.findOne({ _id: req.params.id, user: req.user.id });
    if (!media) return res.status(404).json({ message: 'Media not found' });

    const oldPath = path.join('./uploads', media.filename);
    const newPath = path.join('./uploads', filename);

    // Rename the physical file
    if (fs.existsSync(oldPath)) {
      fs.renameSync(oldPath, newPath);
    }

    // Update in DB
    media.filename = filename;
    media.url = filename;
    await media.save();

    res.json(media);
  } catch (err) {
    console.error('🔥 Rename error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
