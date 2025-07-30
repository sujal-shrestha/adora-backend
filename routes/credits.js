// routes/credits.js
import express from 'express';
import axios from 'axios';
import auth from '../middlewares/auth.js';
import User from '../models/User.js';
import Payment from '../models/Payment.js';
const router = express.Router();

const KHALTI_SECRET = process.env.KHALTI_SECRET_KEY;
const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
const KHALTI_API = 'https://dev.khalti.com/api/v2/epayment';

router.post('/initiate', auth, async (req, res) => {
  try {
    const { amount } = req.body; // e.g. 50
    const amountPaisa = amount * 100;
    const resp = await axios.post(
      `${KHALTI_API}/initiate/`,
      {
        return_url: `${BASE_URL}/api/credits/verify`,
        website_url: BASE_URL,
        amount: amountPaisa,
        purchase_order_id: `order_${req.user.id}_${Date.now()}`,
        purchase_order_name: 'Adora Credits',
      },
      {
        headers: {
          Authorization: `Key ${KHALTI_SECRET}`,
          'Content-Type': 'application/json',
        },
      }
    );
    res.json({ go_link: resp.data.go_link, pidx: resp.data.pidx });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ message: 'Failed to initiate payment' });
  }
});

router.post('/verify', auth, async (req, res) => {
  try {
    const { pidx, amount } = req.body;
    const resp = await axios.post(
      `${KHALTI_API}/lookup/`,
      { pidx },
      {
        headers: {
          Authorization: `Key ${KHALTI_SECRET}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (resp.data.status === 'Completed') {
      const creditsToAdd = amount / 10; // 1 credit = NPR‑10
      await Payment.create({
        user: req.user.id,
        pidx,
        amount,
        status: resp.data.status,
      });
      const user = await User.findById(req.user.id);
      user.credits = (user.credits || 0) + creditsToAdd;
      await user.save();
      return res.json({ success: true, credits: user.credits });
    }
    res.status(400).json({ message: 'Payment not completed' });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ message: 'Payment verification failed' });
  }
});

export default router;
