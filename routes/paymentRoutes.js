// routes/paymentRoutes.js
import express from "express";
import auth from "../middlewares/auth.js";
import { createCheckoutSession, stripeWebhook } from "../controllers/stripeController.js";

const router = express.Router();

router.post("/stripe/create-checkout-session", auth, createCheckoutSession);

// webhook must be raw body (we’ll handle this in app.js)
router.post("/stripe/webhook", stripeWebhook);

export default router;
