// controllers/datasetController.js
import fs from "fs";
import SyntheticExample from "../models/SyntheticExample.js";

function requireIngestKey(req) {
  const key = req.header("x-ingest-key");
  if (!process.env.DATASET_INGEST_KEY || key !== process.env.DATASET_INGEST_KEY) {
    const err = new Error("Unauthorized ingest");
    err.statusCode = 401;
    throw err;
  }
}

export const ingest = async (req, res) => {
  requireIngestKey(req);

  const { filePath } = req.body || {};
  if (!filePath) return res.status(400).json({ message: "filePath is required" });

  if (!fs.existsSync(filePath)) {
    return res.status(400).json({ message: "File not found at filePath" });
  }

  const lines = fs.readFileSync(filePath, "utf8").split("\n").filter(Boolean);

  let inserted = 0;
  let skipped = 0;

  for (const line of lines) {
    try {
      const obj = JSON.parse(line);
      const task = obj.task;
      const niche = obj.brand_kit?.niche || "";
      const tones = obj.brand_kit?.tones || [];

      await SyntheticExample.updateOne(
        { id: obj.id },
        { $set: { id: obj.id, task, niche, tones, raw: obj } },
        { upsert: true }
      );

      inserted += 1;
    } catch (e) {
      skipped += 1;
    }
  }

  return res.json({ success: true, inserted, skipped });
};

export const stats = async (req, res) => {
  const total = await SyntheticExample.countDocuments();
  const byTask = await SyntheticExample.aggregate([
    { $group: { _id: "$task", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  return res.json({ total, byTask });
};
