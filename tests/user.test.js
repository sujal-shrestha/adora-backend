import { jest } from '@jest/globals'; // ✅ Fix for ESM
import request from 'supertest';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import app from '../app.js';
import User from '../models/User.js';

dotenv.config();
jest.setTimeout(30000);


let token;
let server;
let userId;

beforeAll(async () => {
  server = app.listen(10030);
  await mongoose.connect(process.env.MONGO_URI);

  const hashed = await bcrypt.hash('testpass', 10);
  const user = await User.create({
    name: 'Test User',
    email: 'testuser@example.com',
    password: hashed,
  });

  userId = user._id.toString();
  token = jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '1d' });
});

afterAll(async () => {
  await User.deleteMany();
  await mongoose.connection.close();
  server.close();
});

// ✅ Test: Fetch profile with valid token
it('should fetch user profile', async () => {
  const res = await request(server)
    .get('/api/users/me')
    .set('Authorization', `Bearer ${token}`);

  expect(res.statusCode).toBe(200);
  expect(res.body.email).toBe('testuser@example.com');
});

// ✅ Test: Update user profile
it('should update user profile', async () => {
  const res = await request(server)
    .put('/api/users/me')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'Updated User', email: 'updated@example.com' });

  expect(res.statusCode).toBe(200);
  expect(res.body.name).toBe('Updated User');
  expect(res.body.email).toBe('updated@example.com');
});

// ✅ Test: Change password with correct current password
it('should change user password', async () => {
  const res = await request(server)
    .put('/api/users/me/password')
    .set('Authorization', `Bearer ${token}`)
    .send({ currentPassword: 'testpass', newPassword: 'newpass123' });

  expect(res.statusCode).toBe(200);
  expect(res.body.message).toBe('Password updated successfully ✅');
});

// ✅ Test: Fail password change with wrong current password
it('should fail with wrong current password', async () => {
  const res = await request(server)
    .put('/api/users/me/password')
    .set('Authorization', `Bearer ${token}`)
    .send({ currentPassword: 'wrongpass', newPassword: 'newpass123' });

  expect(res.statusCode).toBe(400);
  expect(res.body.message).toBe('Current password is incorrect');
});

// ✅ Test: Delete user account
it('should delete user account', async () => {
  const res = await request(server)
    .delete('/api/users/me')
    .set('Authorization', `Bearer ${token}`);

  expect(res.statusCode).toBe(200);
  expect(res.body.message).toBe('Your account has been deleted');
});

// ✅ Test: Fetch profile after deletion (should 404)
it('should not find user after deletion', async () => {
  const res = await request(server)
    .get('/api/users/me')
    .set('Authorization', `Bearer ${token}`);

  expect(res.statusCode).toBe(404);
});
