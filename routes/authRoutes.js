import express from 'express';
import { registerUser, loginUser, getUserProfile } from '../controllers/authController.js';
import authMiddleware from '../middlewares/auth.js';

const router = express.Router();

router.get('/me', authMiddleware, getUserProfile);
router.post('/register', registerUser);
router.post('/login', loginUser);

export default router;
