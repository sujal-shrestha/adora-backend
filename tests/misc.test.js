jest.setTimeout(30000);
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app.js';
import User from '../models/User.js';
import Campaign from '../models/campaign.js';
import jwt from 'jsonwebtoken';

let token;

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI);

  const user = await User.create({
    name: 'JWT Test User',
    email: 'jwt@example.com',
    password: 'securepass123',
  });

  token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
});

afterAll(async () => {
  await User.deleteMany({});
  await Campaign.deleteMany({});
  await mongoose.connection.close();
});

// ✅ Test 20: Access protected route with valid JWT
it('should access protected route with valid token', async () => {
  const res = await request(app)
    .get('/api/users/me')
    .set('Authorization', `Bearer ${token}`);

  expect(res.statusCode).toBe(200);
  expect(res.body.email).toBe('jwt@example.com');
});

// ✅ Test 21: Access protected route without token
it('should not access protected route without token', async () => {
  const res = await request(app).get('/api/users/me');
  expect(res.statusCode).toBe(401);
});

// ✅ Test 22: Delete account and ensure removal
it('should delete user account', async () => {
  const res = await request(app)
    .delete('/api/users/me')
    .set('Authorization', `Bearer ${token}`);

  expect(res.statusCode).toBe(200);
  expect(res.body.message).toMatch(/deleted/i);
});

// ✅ Test 23: Access profile after account deletion
it('should fail to fetch profile after deletion', async () => {
  const res = await request(app)
    .get('/api/users/me')
    .set('Authorization', `Bearer ${token}`);

  expect(res.statusCode).toBe(404);
});

// ✅ Test 24: Register with invalid email format
it('should reject registration with invalid email', async () => {
  const res = await request(app)
    .post('/api/auth/register')
    .send({
      name: 'Invalid Email User',
      email: 'invalid-email-format',
      password: 'pass1234',
    });

  expect(res.statusCode).toBe(400);
});

// ✅ Test 25: Update campaign with missing title
it('should fail to update campaign with missing title', async () => {
  // Create user and campaign again
  const user = await User.create({
    name: 'Recreate User',
    email: 'recreate@example.com',
    password: 'pass1234',
  });
  const newToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET);

  const campaign = await Campaign.create({
    title: 'Temp Campaign',
    objective: 'Leads',
    platform: 'Facebook',
    budget: 100,
    user: user._id,
  });

  const res = await request(app)
    .put(`/api/campaigns/${campaign._id}`)
    .set('Authorization', `Bearer ${newToken}`)
    .send({ title: '' });

  expect(res.statusCode).toBe(400);
});
