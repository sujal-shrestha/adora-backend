import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import app from '../app.js';
import User from '../models/User.js';
import Campaign from '../models/campaign.js';

dotenv.config();

let token;
let createdCampaignId;

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI);

  const user = await User.create({
    name: 'Test User',
    email: 'test-campaign@example.com',
    password: 'hashedpass123' // assumed hashed or bypassed middleware
  });

  token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
});

afterAll(async () => {
  await Campaign.deleteMany({});
  await User.deleteMany({});
  await mongoose.connection.close();
});

describe('Campaign API', () => {
  // ✅ Create
  it('should create a new campaign', async () => {
    const res = await request(app)
      .post('/api/campaigns')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Test Campaign',
        description: 'A campaign for testing',
        date: new Date().toISOString()
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.name).toBe('Test Campaign');
    createdCampaignId = res.body._id;
  });

  // ✅ Get all
  it('should fetch all campaigns', async () => {
    const res = await request(app)
      .get('/api/campaigns')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  // ✅ Update
  it('should update the campaign name', async () => {
    const res = await request(app)
      .put(`/api/campaigns/${createdCampaignId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Updated Campaign Name' });

    expect(res.statusCode).toBe(200);
    expect(res.body.name).toBe('Updated Campaign Name');
  });

  // ✅ Unauthorized
  it('should fail to create campaign without token', async () => {
    const res = await request(app)
      .post('/api/campaigns')
      .send({
        name: 'No Auth Campaign',
        description: 'No token provided',
        date: new Date().toISOString()
      });

    expect(res.statusCode).toBe(401);
  });

  // ✅ Delete
  it('should delete the campaign', async () => {
    const res = await request(app)
      .delete(`/api/campaigns/${createdCampaignId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Campaign deleted');
  });
});
