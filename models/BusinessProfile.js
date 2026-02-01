// models/BusinessProfile.js
import mongoose from "mongoose";

const businessProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      // ✅ remove index:true to avoid duplicate index warning
    },

    businessName: { type: String, required: true, trim: true },
    niche: { type: String, required: true, trim: true },

    tagline: { type: String, default: "", trim: true },

    tones: { type: [String], default: [] },
    audience: { type: String, default: "", trim: true },
    offer: { type: String, default: "", trim: true },

    usps: { type: [String], default: [] },
    claimsAllowed: { type: [String], default: [] },

    wordsToUse: { type: String, default: "", trim: true },
    wordsToAvoid: { type: String, default: "", trim: true },

    colors: { type: [String], default: [] },
    styleNotes: { type: String, default: "", trim: true },
    platforms: { type: [String], default: ["Meta", "TikTok", "Google", "Email"] },
  },
  { timestamps: true }
);

// ✅ keep the unique “one kit per user”
businessProfileSchema.index({ user: 1 }, { unique: true });

export default mongoose.model("BusinessProfile", businessProfileSchema);
