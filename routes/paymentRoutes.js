import express from "express";
import { verifyKhaltiPayment } from "../controllers/paymentController.js";
import auth from "../middlewares/auth.js";

const router = express.Router();
router.post("/verify", auth, verifyKhaltiPayment);

export default router;
