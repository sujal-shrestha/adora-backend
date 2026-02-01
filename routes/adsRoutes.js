// routes/adsRoutes.js
import express from "express";
import auth from "../middlewares/auth.js";
import { generateAd, regenerateAd, saveGeneratedToMedia } from "../controllers/adsController.js";

const router = express.Router();

router.post("/generate", auth, generateAd);
router.post("/regenerate", auth, regenerateAd); // ✅ 3 credits
router.post("/save", auth, saveGeneratedToMedia); // ✅ saves to My Media

export default router;
