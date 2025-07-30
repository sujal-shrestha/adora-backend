import mongoose from 'mongoose';
import dotenv from 'dotenv';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app.js';
import User from '../models/User.js';
import Campaign from '../models/campaign.js';

dotenv.config();

let token;

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI);

  const user = await User.create({
    name: 'JWT Test User',
    email: 'jwt@example.com',
    password: 'securepass123',
  });

  token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
}, 30000); // ✅ give beforeAll 30s timeout

afterAll(async () => {
  await User.deleteMany({});
  await Campaign.deleteMany({});
  await mongoose.connection.close();
}, 15000); // ✅ optional: allow more time for cleanup


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
