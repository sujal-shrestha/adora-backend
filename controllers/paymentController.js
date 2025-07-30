import axios from "axios";
import User from "../models/User.js";

export const verifyKhaltiPayment = async (req, res) => {
  const { pidx } = req.body;
  const userId = req.user.id;

  if (!pidx) return res.status(400).json({ message: "Missing pidx" });

  try {
    const khaltiRes = await axios.post(
      "https://a.khalti.com/api/v2/payment/verify/",
      { pidx },
      {
        headers: {
          Authorization: "Key test_secret_key_6a501cc997fa4e65a06cf405285b339e", // 🔐 Use env in prod
        },
      }
    );

    const { data } = khaltiRes;

    if (data.status !== "Completed") {
      return res.status(400).json({ message: "Payment not completed" });
    }

    // 💰 Calculate credits from amount (e.g. Rs. 50 = 5 credits)
    const amountNPR = data.amount / 100; // amount is in paisa
    const creditsToAdd = Math.floor(amountNPR / 10);

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.credits = (user.credits || 0) + creditsToAdd;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Credits added successfully",
      creditsAdded: creditsToAdd,
      totalCredits: user.credits,
    });
  } catch (err) {
    console.error("❌ Khalti verify error:", err.response?.data || err.message);
    res.status(500).json({ message: "Payment verification failed" });
  }
};
