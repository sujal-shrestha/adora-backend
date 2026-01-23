// controllers/brandKitController.js
import BusinessProfile from "../models/BusinessProfile.js";

const cleanString = (v) => (typeof v === "string" ? v.trim() : "");
const cleanStringArray = (arr) =>
  Array.isArray(arr)
    ? arr.map((x) => cleanString(x)).filter(Boolean)
    : [];

const cleanColorArray = (arr) =>
  Array.isArray(arr)
    ? arr
        .map((x) => cleanString(x))
        .filter((x) => /^#([0-9a-f]{6})$/i.test(x))
    : [];

export const getMyBrandKit = async (req, res) => {
  try {
    const kit = await BusinessProfile.findOne({ user: req.user.id }).lean();
    if (!kit) return res.status(404).json({ message: "Brand kit not found" });
    return res.json(kit);
  } catch (err) {
    console.error("getMyBrandKit error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

export const upsertMyBrandKit = async (req, res) => {
  try {
    const b = req.body || {};

    // ✅ Minimal required
    const businessName = cleanString(b.businessName);
    const niche = cleanString(b.niche);

    if (!businessName || !niche) {
      return res
        .status(400)
        .json({ message: "businessName and niche are required" });
    }

    // ✅ sanitize everything (so your AI engine gets clean data)
    const payload = {
      user: req.user.id,
      businessName,
      niche,
      tagline: cleanString(b.tagline),

      tones: cleanStringArray(b.tones),
      audience: cleanString(b.audience),
      offer: cleanString(b.offer),

      usps: cleanStringArray(b.usps),
      claimsAllowed: cleanStringArray(b.claimsAllowed),

      wordsToUse: cleanString(b.wordsToUse),
      wordsToAvoid: cleanString(b.wordsToAvoid),

      colors: cleanColorArray(b.colors),
      styleNotes: cleanString(b.styleNotes),

      platforms: Array.isArray(b.platforms) && b.platforms.length
        ? cleanStringArray(b.platforms)
        : ["Meta", "TikTok", "Google", "Email"],
    };

    const kit = await BusinessProfile.findOneAndUpdate(
      { user: req.user.id },
      { $set: payload },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    ).lean();

    return res.json(kit);
  } catch (err) {
    // handle unique index collisions nicely
    if (err?.code === 11000) {
      return res.status(409).json({ message: "Brand kit already exists" });
    }

    console.error("upsertMyBrandKit error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
