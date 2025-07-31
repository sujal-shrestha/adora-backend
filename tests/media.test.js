// tests/media.test.js
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import request from 'supertest';
import { describe, beforeAll, afterAll, test, expect } from '@jest/globals';

import app from '../app.js';
import User from '../models/User.js';
import Media from '../models/Media.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let token = '';
let mediaId = '';

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI);

  // Register user
  await request(app).post('/api/auth/register').send({
    name: 'Media Tester',
    email: 'media@test.com',
    password: 'test1234',
  });

  // Login
  const res = await request(app).post('/api/auth/login').send({
    email: 'media@test.com',
    password: 'test1234',
  });

  token = res.body.token;
});

afterAll(async () => {
  await Media.deleteMany({});
  await User.deleteMany({});
  await mongoose.disconnect();
});

describe('📸 Media API', () => {
  test('should upload an image', async () => {
    const res = await request(app)
      .post('/api/media/me/media')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', path.resolve(__dirname, 'test-image.png')); // Ensure this file exists

    expect(res.statusCode).toBe(201);
    expect(res.body.url).toBeDefined();
    expect(res.body.filename).toBeDefined();

    mediaId = res.body._id;
  });

  test('should fetch media list', async () => {
    const res = await request(app)
      .get('/api/media/me/media')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  test('should rename a media file', async () => {
    const res = await request(app)
      .put(`/api/media/me/media/${mediaId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ filename: 'renamed-test-image.png' });

    expect(res.statusCode).toBe(200);
    expect(res.body.filename).toBe('renamed-test-image.png');
  });

  test('should delete the media file', async () => {
    const res = await request(app)
      .delete(`/api/media/me/media/${mediaId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Media deleted successfully');
  });
});