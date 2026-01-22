import mongoose from "mongoose";

const mediaSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    public_id: { type: String },
  },
  { _id: false }
);

// ✅ Nova Brand Kit Schema (Business Brain)
const brandKitSchema = new mongoose.Schema(
  {
    businessName: { type: String, default: "" },
    niche: { type: String, default: "" },

    tagline: { type: String, default: "" },

    // Tone + writing rules
    tones: { type: [String], default: [] }, // e.g. ["Bold", "Minimal", "Professional"]
    wordsToUse: { type: String, default: "" },
    wordsToAvoid: { type: String, default: "" },

    // Audience & offer (core for strategy)
    audience: { type: String, default: "" }, // who they sell to + pain/desire
    offer: { type: String, default: "" }, // pricing/promo style
    usps: { type: [String], default: [] }, // Unique selling points

    // Safety / compliance guardrails
    claimsAllowed: { type: [String], default: [] }, // claims we’re allowed to make

    // Visual identity
    colors: { type: [String], default: ["#A855F7", "#EC4899", "#0B1220"] }, // 2–5 hex colors
    styleNotes: { type: String, default: "" }, // e.g. "clean, futuristic, glass"

    // Optional intelligence enhancers
    competitors: { type: [String], default: [] }, // names/IG handles
    platforms: { type: [String], default: [] }, // e.g. ["Meta", "TikTok", "Google", "Email"]

    updatedAt: { type: Date, default: null },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },

    profilePic: { type: String, default: "" },

    media: [mediaSchema],
    credits: { type: Number, default: 20 },

    // ✅ Brand Kit stored per user
    brandKit: { type: brandKitSchema, default: () => ({}) },
  },
  { timestamps: true }
);

userSchema.post("save", function (doc) {
  console.log("📝 User saved:", doc.email);
});

export default mongoose.model("User", userSchema);
