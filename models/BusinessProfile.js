// models/BusinessProfile.js
import mongoose from "mongoose";

const businessProfileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },

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

    colors: { type: [String], default: [] }, // ["#RRGGBB", ...]
    styleNotes: { type: String, default: "", trim: true },
    platforms: { type: [String], default: ["Meta", "TikTok", "Google", "Email"] },
  },
  { timestamps: true }
);

businessProfileSchema.index({ user: 1 }, { unique: true }); // one brand kit per user (simple + clean)

export default mongoose.model("BusinessProfile", businessProfileSchema);
