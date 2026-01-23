// models/SyntheticExample.js
import mongoose from "mongoose";

const syntheticExampleSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    task: { type: String, required: true, index: true },
    niche: { type: String, default: "", index: true },
    tones: { type: [String], default: [] },

    // store full record for few-shot injection
    raw: { type: Object, required: true },
  },
  { timestamps: true }
);

syntheticExampleSchema.index({ task: 1, niche: 1 });

export default mongoose.model("SyntheticExample", syntheticExampleSchema);
