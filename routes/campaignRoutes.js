import express from 'express';
import * as campaignController from '../controllers/campaignController.js';
import auth from '../middlewares/auth.js';

const router = express.Router();

router.post('/', auth, campaignController.createCampaign);
router.get('/', auth, campaignController.getCampaigns);
router.get('/:id', auth, campaignController.getCampaign);
router.put('/:id', auth, campaignController.updateCampaign);
router.delete('/:id', auth, campaignController.deleteCampaign);

export default router;
ç