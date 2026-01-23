// models/AIJob.js
import mongoose from "mongoose";

const aiJobSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    task: { type: String, required: true, index: true },

    brandKitId: { type: mongoose.Schema.Types.ObjectId, ref: "BusinessProfile" },

    input: { type: Object, default: {} },
    constraints: { type: Object, default: {} },

    status: { type: String, enum: ["queued", "running", "done", "failed"], default: "queued" },
    error: { type: String, default: "" },

    creditsUsed: { type: Number, default: 0 },
    provider: { type: String, default: "openai" },
    model: { type: String, default: "" },

    output: { type: Object, default: null }, // final structured response
  },
  { timestamps: true }
);

export default mongoose.model("AIJob", aiJobSchema);
