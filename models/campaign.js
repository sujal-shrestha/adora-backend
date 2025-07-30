// models/Campaign.js
import mongoose from 'mongoose';

const CampaignSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Campaign name is required'],
    trim: true,
  },
  description: {
    type: String,
    default: '',
  },
  date: {
    type: Date,
    required: [true, 'Campaign date is required'],
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  }
}, { timestamps: true });

const Campaign = mongoose.model('Campaign', CampaignSchema);

export default Campaign;
