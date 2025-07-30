// models/Media.js
import mongoose from 'mongoose';

const mediaSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  url: { type: String, required: true },
  filename: { type: String, required: true },
}, { timestamps: true });

export default mongoose.model('Media', mediaSchema);
