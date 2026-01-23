// routes/brandKitRoutes.js
import express from "express";
import auth from "../middlewares/auth.js";
import { getMyBrandKit, upsertMyBrandKit } from "../controllers/brandKitController.js";

const router = express.Router();

router.get("/me", auth, getMyBrandKit);
router.post("/", auth, upsertMyBrandKit);
router.put("/me", auth, upsertMyBrandKit);

export default router;
