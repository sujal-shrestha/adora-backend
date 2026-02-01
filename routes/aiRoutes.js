// routes/aiRoutes.js
import express from "express";
import auth from "../middlewares/auth.js";
import { generate, history, generateMetaAds } from "../controllers/aiEngineController.js";
import { ingest, stats } from "../controllers/datasetController.js";

const router = express.Router();

// Dedicated endpoint (Meta Ads)
router.post("/meta-ads", auth, generateMetaAds);

// Generic engine
router.post("/generate", auth, generate);
router.get("/history", auth, history);

// dataset tools (dev/admin)
router.post("/dataset/ingest", auth, ingest);
router.get("/dataset/stats", auth, stats);

export default router;
