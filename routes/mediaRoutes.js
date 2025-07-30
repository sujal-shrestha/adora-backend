import express from 'express';
import {
  uploadMedia,
  getMyMedia,
  deleteMedia,
  renameMedia
} from '../controllers/mediaController.js';
import auth from '../middlewares/auth.js';
import upload from '../middlewares/upload.js';

const router = express.Router();

// Upload file
router.post('/me/media', auth, upload.single('file'), uploadMedia);

// Get all media for user
router.get('/me/media', auth, getMyMedia);

// Delete media by ID
router.delete('/me/media/:id', auth, deleteMedia);

// ✅ Rename media by ID
router.put('/me/media/:id', auth, renameMedia);

export default router;
