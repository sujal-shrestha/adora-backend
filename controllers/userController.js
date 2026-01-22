import User from "../models/User.js";
import bcrypt from "bcryptjs";

// PUT /api/users/me/password
export const changeMyPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "currentPassword and newPassword are required" });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: "Password updated successfully ✅" });
  } catch (err) {
    console.error("🔥 changeMyPassword error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// GET /api/users/me
export const getMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json(user);
  } catch (err) {
    console.error("🔥 getMyProfile error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// PUT /api/users/me
export const updateMyProfile = async (req, res) => {
  try {
    const { name, email, profilePic } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.name = name || user.name;
    user.email = email || user.email;
    user.profilePic = profilePic || user.profilePic;

    const updatedUser = await user.save();

    res.json({
      id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      profilePic: updatedUser.profilePic,
    });
  } catch (err) {
    console.error("🔥 updateMyProfile error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// DELETE /api/users/me
export const deleteMyAccount = async (req, res) => {
  try {
    console.log("🔥 Reached deleteMyAccount route", req.user?.id);
    await User.findByIdAndDelete(req.user.id);
    res.json({ message: "Your account has been deleted" });
  } catch (err) {
    console.error("🔥 deleteMyAccount error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * =========================
 * Nova Brand Kit (Business Brain)
 * =========================
 */

// GET /api/users/me/brand-kit
export const getMyBrandKit = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("brandKit");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ brandKit: user.brandKit || {} });
  } catch (err) {
    console.error("🔥 getMyBrandKit error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// PUT /api/users/me/brand-kit
export const updateMyBrandKit = async (req, res) => {
  try {
    const {
      businessName,
      niche,
      tagline,
      tones,
      wordsToUse,
      wordsToAvoid,
      audience,
      offer,
      usps,
      claimsAllowed,
      colors,
      styleNotes,
      competitors,
      platforms,
    } = req.body || {};

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Minimal validation (keep it flexible)
    if (colors && Array.isArray(colors) && (colors.length < 2 || colors.length > 5)) {
      return res.status(400).json({ message: "colors must be an array of 2–5 hex values" });
    }

    user.brandKit = {
      ...user.brandKit?.toObject?.(),
      businessName: businessName ?? user.brandKit.businessName,
      niche: niche ?? user.brandKit.niche,
      tagline: tagline ?? user.brandKit.tagline,
      tones: Array.isArray(tones) ? tones : user.brandKit.tones,
      wordsToUse: wordsToUse ?? user.brandKit.wordsToUse,
      wordsToAvoid: wordsToAvoid ?? user.brandKit.wordsToAvoid,
      audience: audience ?? user.brandKit.audience,
      offer: offer ?? user.brandKit.offer,
      usps: Array.isArray(usps) ? usps : user.brandKit.usps,
      claimsAllowed: Array.isArray(claimsAllowed) ? claimsAllowed : user.brandKit.claimsAllowed,
      colors: Array.isArray(colors) ? colors : user.brandKit.colors,
      styleNotes: styleNotes ?? user.brandKit.styleNotes,
      competitors: Array.isArray(competitors) ? competitors : user.brandKit.competitors,
      platforms: Array.isArray(platforms) ? platforms : user.brandKit.platforms,
      updatedAt: new Date(),
    };

    await user.save();

    res.json({
      message: "Brand Kit updated ✅",
      brandKit: user.brandKit,
    });
  } catch (err) {
    console.error("🔥 updateMyBrandKit error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
