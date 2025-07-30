import express from 'express';
import { getTrends } from '../controllers/trendController.js';

const router = express.Router();
router.post('/', getTrends);

export default router;
