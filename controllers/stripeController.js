// controllers/stripeController.js
import Stripe from "stripe";
import User from "../models/User.js";
import { CREDIT_PACKS } from "../config/creditPacks.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

function toSmallestUnit(amount, currency) {
  // Most currencies use 2 decimals.
  return Math.round(Number(amount) * 100);
}

export const createCheckoutSession = async (req, res) => {
  try {
    const { packId } = req.body;

    const pack = CREDIT_PACKS?.[packId];
    if (!pack) {
      return res.status(400).json({ message: "Invalid packId" });
    }

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: pack.currency,
            product_data: { name: `Nova Credits — ${pack.label}` },
            unit_amount: toSmallestUnit(pack.amount, pack.currency),
          },
          quantity: 1,
        },
      ],
      success_url: `${frontendUrl}/dashboard/ads?stripe_success=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/dashboard/ads?stripe_cancel=1`,
      metadata: {
        userId: String(req.userId), // ✅ guaranteed now
        credits: String(pack.credits),
        packId: String(packId),
      },
    });

    return res.json({ url: session.url });
  } catch (err) {
    console.error("Stripe checkout error:", err);
    return res.status(500).json({ message: "Failed to create Stripe checkout session" });
  }
};

export const stripeWebhook = async (req, res) => {
  let event;

  try {
    const sig = req.headers["stripe-signature"];
    event = stripe.webhooks.constructEvent(
      req.body, // raw buffer
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;

      const userId = session?.metadata?.userId;
      const credits = Number(session?.metadata?.credits || 0);

      if (userId && credits > 0) {
        await User.findByIdAndUpdate(userId, { $inc: { credits } });
        console.log(`✅ Added ${credits} credits to user ${userId}`);
      }
    }

    return res.json({ received: true });
  } catch (err) {
    console.error("Webhook handler error:", err.message);
    return res.status(500).json({ message: "Webhook handler failed" });
  }
};
