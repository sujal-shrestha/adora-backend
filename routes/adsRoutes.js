// routes/adsRoutes.js
import express from "express";
import auth from "../middlewares/auth.js";
import { generateAd } from "../controllers/adsController.js";

const router = express.Router();

router.post("/generate", auth, generateAd);

export default router;
