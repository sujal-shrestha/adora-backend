import Stripe from "stripe";
import User from "../models/User.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// amounts are in cents for USD
const PACKS = {
  starter: { credits: 10, amount: 1000 }, // $10.00
  pro: { credits: 50, amount: 5000 },     // $50.00
  mega: { credits: 120, amount: 10000 },  // $100.00
};

// ✅ Create checkout session
export const createStripeCheckoutSession = async (req, res) => {
  try {
    const { pack = "pro" } = req.body || {};
    const chosen = PACKS[pack];

    if (!chosen) {
      return res.status(400).json({ message: "Invalid pack." });
    }

    // ✅ IMPORTANT: your auth middleware sets req.userId
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized (missing userId)." });
    }

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: chosen.amount,
            product_data: { name: `Nova Credits (${chosen.credits})` },
          },
          quantity: 1,
        },
      ],
      success_url: `${frontendUrl}/dashboard/ads?paid=1`,
      cancel_url: `${frontendUrl}/dashboard/ads?paid=0`,
      metadata: {
        userId: String(userId),
        creditsToAdd: String(chosen.credits),
        pack: String(pack),
      },
    });

    return res.json({ url: session.url });
  } catch (err) {
    console.error("❌ createStripeCheckoutSession:", err);
    return res.status(500).json({ message: "Failed to start Stripe checkout." });
  }
};

// ✅ Stripe webhook: verify signature, then add credits
export const stripeWebhook = async (req, res) => {
  let event;

  try {
    const sig = req.headers["stripe-signature"];
    const whsec = process.env.STRIPE_WEBHOOK_SECRET;

    if (!whsec) {
      console.error("❌ STRIPE_WEBHOOK_SECRET missing");
      return res.status(500).send("Webhook secret missing");
    }

    // ✅ req.body MUST be raw Buffer
    event = stripe.webhooks.constructEvent(req.body, sig, whsec);
  } catch (err) {
    console.error("❌ Webhook signature error:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;

      const userId = session?.metadata?.userId;
      const creditsToAdd = Number(session?.metadata?.creditsToAdd || 0);

      if (userId && creditsToAdd > 0) {
        await User.findByIdAndUpdate(userId, { $inc: { credits: creditsToAdd } });
        console.log(`✅ Added ${creditsToAdd} credits to user ${userId}`);
      }
    }

    return res.json({ received: true });
  } catch (err) {
    console.error("❌ Webhook handler failed:", err.message);
    return res.status(500).send("Webhook handler error");
  }
};
