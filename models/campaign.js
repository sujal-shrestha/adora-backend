<<<<<<< HEAD
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
=======
import mongoose from 'mongoose';

const CampaignSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  startDate: Date,
  endDate: Date,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
>>>>>>> a8b778167760f2e9a239c8eb976c43ec6a6e8577
}, { timestamps: true });

const Campaign = mongoose.model('Campaign', CampaignSchema);

export default Campaign;
