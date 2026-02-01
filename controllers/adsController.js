// controllers/adsController.js
import dotenv from "dotenv";
import axios from "axios";
import fs from "fs";
import path from "path";
import Media from "../models/Media.js";
import User from "../models/User.js";

dotenv.config();

const COST_GENERATE = 5;
const COST_REGENERATE = 3;

function ensureUploadsDir() {
  const uploadsDir = path.join(process.cwd(), "uploads");
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  return uploadsDir;
}

async function runImagen({ apiKey, model, prompt }) {
  const imagenRes = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict`,
    {
      instances: [{ prompt }],
      parameters: { sampleCount: 1 },
    },
    {
      headers: {
        "x-goog-api-key": apiKey,
        "Content-Type": "application/json",
      },
      timeout: 120000,
    }
  );

  const data = imagenRes.data || {};
  const pred0 = Array.isArray(data.predictions) ? data.predictions[0] : null;

  const b64 =
    pred0?.bytesBase64Encoded ||
    pred0?.imageBytes ||
    pred0?.image?.imageBytes ||
    data?.generatedImages?.[0]?.image?.imageBytes ||
    null;

  if (!b64) {
    console.error("🔥 Imagen response (no image bytes):", JSON.stringify(data).slice(0, 2000));
    throw new Error("Failed to generate image (no image bytes returned)");
  }

  return b64;
}

async function chargeCredits(userId, cost) {
  const user = await User.findById(userId);
  if (!user) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }
  if ((user.credits ?? 0) < cost) {
    const err = new Error("Not enough credits");
    err.statusCode = 403;
    throw err;
  }

  user.credits = (user.credits ?? 0) - cost;
  await user.save();

  return user.credits;
}

export const generateAd = async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt?.trim()) {
      return res.status(400).json({ message: "Prompt is required" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ message: "GEMINI_API_KEY missing in .env" });
    }

    const model = process.env.IMAGEN_MODEL || "imagen-4.0-generate-001";

    // ✅ deduct credits only after successful generation
    const b64 = await runImagen({ apiKey, model, prompt });

    const uploadsDir = ensureUploadsDir();
    const filename = `generated_${Date.now()}.png`;
    const uploadPath = path.join(uploadsDir, filename);

    fs.writeFileSync(uploadPath, Buffer.from(b64, "base64"));

    const remainingCredits = await chargeCredits(req.user.id, COST_GENERATE);

    // ✅ DO NOT save to Media automatically
    return res.json({
      message: "Ad image generated successfully",
      image: `/uploads/${filename}`,
      filename,
      remainingCredits,
      cost: COST_GENERATE,
    });
  } catch (err) {
    console.error("🔥 Imagen error:", err?.response?.data || err.message);
    return res.status(err.statusCode || 500).json({
      message: err.message || "Failed to generate ad image",
      details: err?.response?.data || err.message,
    });
  }
};

export const regenerateAd = async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt?.trim()) {
      return res.status(400).json({ message: "Prompt is required" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ message: "GEMINI_API_KEY missing in .env" });
    }

    const model = process.env.IMAGEN_MODEL || "imagen-4.0-generate-001";

    const b64 = await runImagen({ apiKey, model, prompt });

    const uploadsDir = ensureUploadsDir();
    const filename = `generated_${Date.now()}_regen.png`;
    const uploadPath = path.join(uploadsDir, filename);

    fs.writeFileSync(uploadPath, Buffer.from(b64, "base64"));

    const remainingCredits = await chargeCredits(req.user.id, COST_REGENERATE);

    return res.json({
      message: "Ad regenerated successfully",
      image: `/uploads/${filename}`,
      filename,
      remainingCredits,
      cost: COST_REGENERATE,
    });
  } catch (err) {
    console.error("🔥 Imagen error:", err?.response?.data || err.message);
    return res.status(err.statusCode || 500).json({
      message: err.message || "Failed to regenerate ad image",
      details: err?.response?.data || err.message,
    });
  }
};

// ✅ user clicks "Save to My Media"
export const saveGeneratedToMedia = async (req, res) => {
  try {
    const { image, filename } = req.body || {};

    // accept either "image" (/uploads/..png) or "filename"
    const safeFilename = filename || (typeof image === "string" ? image.split("/uploads/")[1] : null);
    if (!safeFilename) {
      return res.status(400).json({ message: "filename or image is required" });
    }

    const url = `/uploads/${safeFilename}`;

    // prevent dupes for this user
    const existing = await Media.findOne({ user: req.user.id, url }).lean();
    if (existing) {
      return res.json({ success: true, media: existing, message: "Already saved" });
    }

    const media = await Media.create({
      user: req.user.id,
      filename: safeFilename,
      url,
    });

    return res.json({ success: true, media });
  } catch (err) {
    console.error("Save generated media error:", err.message);
    return res.status(500).json({ message: "Failed to save to media" });
  }
};
