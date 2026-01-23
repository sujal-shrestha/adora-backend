import express from "express";
import auth from "../middlewares/auth.js";
import { generate, history, generateMetaAds } from "../controllers/aiEngineController.js";
import { ingest, stats } from "../controllers/datasetController.js";

const router = express.Router();

// ✅ Option A: dedicated endpoint (Meta Ads)
router.post("/meta-ads", auth, generateMetaAds);

// Generic engine
router.post("/generate", auth, generate);
router.get("/history", auth, history);

// dataset tools (dev/admin)
router.post("/dataset/ingest", ingest);
router.get("/dataset/stats", stats);

export default router;
