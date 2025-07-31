import { jest } from '@jest/globals';
jest.setTimeout(30000);

import request from 'supertest';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import app from '../app.js';
import User from '../models/User.js';

dotenv.config();

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  await mongoose.connection.collection('users').createIndex({ email: 1 }, { unique: true });
}, 30000);

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
}, 15000);

beforeEach(async () => {
  await User.deleteMany({});
});

describe('🧪 Auth & Profile API Tests', () => {
  test('should register a new user', async () => {
    const email = `test+${Date.now()}@example.com`;
    const res = await request(app).post('/api/auth/register').send({
      name: 'Test User',
      email,
      password: 'password123',
    });

    expect(res.statusCode).toBe(201);
    expect(res.body.user.email).toBe(email);
    expect(res.body.token).toBeDefined();
  });

  test('should not register with missing fields', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'missing@example.com',
    });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/all fields/i);
  });

  test('should not register with duplicate email', async () => {
    const email = `dupe+${Date.now()}@example.com`;

    await request(app).post('/api/auth/register').send({
      name: 'First User',
      email,
      password: 'password123',
    });

    const res = await request(app).post('/api/auth/register').send({
      name: 'Second User',
      email,
      password: 'anotherpass',
    });

    expect(res.statusCode).toBe(409);
    expect(res.body.message).toMatch(/already exists/i);
  });

  test('should not login with non-existent email', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'noone@example.com',
      password: 'any',
    });

    expect(res.statusCode).toBe(401);
    expect(res.body.message).toMatch(/invalid/i);
  });

  test('should not fetch profile without token', async () => {
    const res = await request(app).get('/api/users/me');
    expect(res.statusCode).toBe(401);
    expect(res.body.message).toMatch(/access denied/i);
  });

  test('should not update profile with invalid token', async () => {
    const res = await request(app)
      .put('/api/users/me')
      .set('Authorization', 'Bearer faketoken')
      .send({ name: 'New Name' });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/invalid token/i);
  });
});
