import Campaign from '../models/campaign.js';

// CREATE
export const createCampaign = async (req, res) => {
  try {
    console.log('👉 req.user:', req.user);
    const campaign = new Campaign({ ...req.body, createdBy: req.user.id });
    const savedCampaign = await campaign.save();
    res.status(201).json(savedCampaign);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// READ ALL
export const getCampaigns = async (req, res) => {
  try {
    const campaigns = await Campaign.find({ createdBy: req.user.id });
    res.json(campaigns);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// READ ONE
export const getCampaign = async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    res.json(campaign);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// UPDATE
export const updateCampaign = async (req, res) => {
  try {
    const updated = await Campaign.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE
export const deleteCampaign = async (req, res) => {
  try {
    await Campaign.findByIdAndDelete(req.params.id);
    res.json({ message: 'Campaign deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
