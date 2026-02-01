// app.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/authRoutes.js";
import campaignRoutes from "./routes/campaignRoutes.js";
import mediaRoutes from "./routes/mediaRoutes.js";
import path from "path";
import { fileURLToPath } from "url";
import userRoutes from "./routes/userRoutes.js";
import adsRoutes from "./routes/adsRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import trendRoutes from "./routes/trendRoutes.js";

// ✅ NEW
import brandKitRoutes from "./routes/brandKitRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";

dotenv.config();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-ingest-key"],
  })
);

/**
 * ✅ STRIPE WEBHOOK FIX
 * Stripe requires the raw body for signature verification.
 * So we mount raw ONLY for this exact webhook route BEFORE express.json().
 */
app.use("/api/payment/stripe/webhook", express.raw({ type: "application/json" }));

// Now safe to parse JSON for everything else
app.use(express.json());

// Static uploads
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/campaigns", campaignRoutes);
app.use("/api/media", mediaRoutes);
app.use("/api/users", userRoutes);
app.use("/api/ads", adsRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/trends", trendRoutes);

// ✅ NEW
app.use("/api/brandkit", brandKitRoutes);
app.use("/api/ai", aiRoutes);

export default app;
