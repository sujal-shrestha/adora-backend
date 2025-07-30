// tests/campaign.test.js

import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app.js';
import User from '../models/User.js';
import Campaign from '../models/campaign.js';
import jwt from 'jsonwebtoken';

let token;
let createdCampaignId;

beforeAll(async () => {
  // Connect to DB
  await mongoose.connect(process.env.MONGO_URI);

  // Create test user
  const user = await User.create({
    name: 'Test User',
    email: 'test-campaign@example.com',
    password: 'hashedpass123' // Assume already hashed
  });

  // Sign token
  token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
});

afterAll(async () => {
  await User.deleteMany({});
  await Campaign.deleteMany({});
  await mongoose.connection.close();
});

// ✅ Test 1: Create a new campaign
it('should create a new campaign', async () => {
  const res = await request(app)
    .post('/api/campaigns')
    .set('Authorization', `Bearer ${token}`)
    .send({
      title: 'Test Campaign',
      objective: 'Leads',
      platform: 'Facebook',
      budget: 500
    });

  expect(res.statusCode).toBe(201);
  expect(res.body.title).toBe('Test Campaign');
  createdCampaignId = res.body._id;
});

// ✅ Test 2: Fetch all campaigns
it('should fetch all campaigns', async () => {
  const res = await request(app)
    .get('/api/campaigns')
    .set('Authorization', `Bearer ${token}`);

  expect(res.statusCode).toBe(200);
  expect(Array.isArray(res.body)).toBe(true);
});

// ✅ Test 3: Get campaign by ID
it('should get a campaign by ID', async () => {
  const res = await request(app)
    .get(`/api/campaigns/${createdCampaignId}`)
    .set('Authorization', `Bearer ${token}`);

  expect(res.statusCode).toBe(200);
  expect(res.body._id).toBe(createdCampaignId);
});

// ✅ Test 4: Update campaign
it('should update the campaign title', async () => {
  const res = await request(app)
    .put(`/api/campaigns/${createdCampaignId}`)
    .set('Authorization', `Bearer ${token}`)
    .send({ title: 'Updated Title' });

  expect(res.statusCode).toBe(200);
  expect(res.body.title).toBe('Updated Title');
});

// ✅ Test 5: Delete campaign
it('should delete the campaign', async () => {
  const res = await request(app)
    .delete(`/api/campaigns/${createdCampaignId}`)
    .set('Authorization', `Bearer ${token}`);

  expect(res.statusCode).toBe(200);
  expect(res.body.message).toBe('Campaign deleted');
});

// ✅ Test 6: Invalid campaign ID fetch
it('should return 400 for invalid ID', async () => {
  const res = await request(app)
    .get('/api/campaigns/invalidid')
    .set('Authorization', `Bearer ${token}`);

  expect(res.statusCode).toBe(400);
});

// ✅ Test 7: Create campaign without token
it('should fail to create campaign without token', async () => {
  const res = await request(app)
    .post('/api/campaigns')
    .send({
      title: 'No Auth Campaign',
      objective: 'Engagement',
      platform: 'Google',
      budget: 300
    });

  expect(res.statusCode).toBe(401);
});
