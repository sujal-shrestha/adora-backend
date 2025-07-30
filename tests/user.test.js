jest.setTimeout(30000);
// tests/user.test.js
import request from 'supertest';
import app from '../app.js';
import mongoose from 'mongoose';
import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

let server;
let token;
let userId;

beforeAll(async () => {
  server = app.listen(10020);
  const hashed = await bcrypt.hash('testpass', 10);
  const user = await User.create({ name: 'Test User', email: 'testuser@example.com', password: hashed });
  userId = user._id.toString();
  token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
});

afterAll(async () => {
  await User.deleteMany();
  await mongoose.connection.close();
  server.close();
});

// test 1 - fetch profile with valid token
it('should fetch user profile with valid token', async () => {
  const res = await request(server)
    .get('/api/users/me')
    .set('Authorization', `Bearer ${token}`);

  expect(res.status).toBe(200);
  expect(res.body.email).toBe('testuser@example.com');
});

// test 2 - fetch profile without token
it('should not fetch profile without token', async () => {
  const res = await request(server).get('/api/users/me');
  expect(res.status).toBe(401);
});

// test 3 - update user profile
it('should update user profile', async () => {
  const res = await request(server)
    .put('/api/users/me')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'Updated Name', email: 'updated@example.com' });

  expect(res.status).toBe(200);
  expect(res.body.name).toBe('Updated Name');
  expect(res.body.email).toBe('updated@example.com');
});

// test 4 - change password with correct current password
it('should change password with correct current password', async () => {
  const res = await request(server)
    .put('/api/users/me/password')
    .set('Authorization', `Bearer ${token}`)
    .send({ currentPassword: 'testpass', newPassword: 'newpass123' });

  expect(res.status).toBe(200);
  expect(res.body.message).toBe('Password updated successfully ✅');
});

// test 5 - fail to change password with incorrect current password
it('should fail to change password with wrong current password', async () => {
  const res = await request(server)
    .put('/api/users/me/password')
    .set('Authorization', `Bearer ${token}`)
    .send({ currentPassword: 'wrongpass', newPassword: 'newpass123' });

  expect(res.status).toBe(400);
  expect(res.body.message).toBe('Current password is incorrect');
});

// test 6 - delete user account
it('should delete user account', async () => {
  const res = await request(server)
    .delete('/api/users/me')
    .set('Authorization', `Bearer ${token}`);

  expect(res.status).toBe(200);
  expect(res.body.message).toBe('Your account has been deleted');
});
