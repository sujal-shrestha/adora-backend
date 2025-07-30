jest.setTimeout(30000);
import request from 'supertest';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import app from '../app.js';
import User from '../models/User.js';

dotenv.config();

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});

beforeEach(async () => {
  await User.deleteMany(); // Clean slate before each test
});

// ==============================
// 🧪 TEST 1: Register new user
// ==============================
test('should register a new user', async () => {
  const res = await request(app).post('/api/auth/register').send({
    name: 'Test User',
    email: 'test@example.com',
    password: 'password123',
  });

  expect(res.statusCode).toBe(201);
  expect(res.body.user.email).toBe('test@example.com');
  expect(res.body.token).toBeDefined();
});

// ==============================
// 🧪 TEST 2: Register with missing fields
// ==============================
test('should not register with missing fields', async () => {
  const res = await request(app).post('/api/auth/register').send({
    email: 'missing@example.com',
  });

  expect(res.statusCode).toBe(400);
  expect(res.body.message).toMatch(/all fields/i);
});

// ==============================
// 🧪 TEST 3: Register with duplicate email
// ==============================
test('should not register with duplicate email', async () => {
  await request(app).post('/api/auth/register').send({
    name: 'First User',
    email: 'dupe@example.com',
    password: 'password123',
  });

  const res = await request(app).post('/api/auth/register').send({
    name: 'Second User',
    email: 'dupe@example.com',
    password: 'anotherpass',
  });

  expect(res.statusCode).toBe(409);
  expect(res.body.message).toMatch(/already exists/i);
});

// ==============================
// 🧪 TEST 4: Login with correct credentials
// ==============================
test('should login with valid credentials', async () => {
  await request(app).post('/api/auth/register').send({
    name: 'Login User',
    email: 'login@example.com',
    password: 'mypassword',
  });

  const res = await request(app).post('/api/auth/login').send({
    email: 'login@example.com',
    password: 'mypassword',
  });

  expect(res.statusCode).toBe(200);
  expect(res.body.token).toBeDefined();
  expect(res.body.user.email).toBe('login@example.com');
});

// ==============================
// 🧪 TEST 5: Login with non-existent email
// ==============================
test('should not login with non-existent email', async () => {
  const res = await request(app).post('/api/auth/login').send({
    email: 'noone@example.com',
    password: 'any',
  });

  expect(res.statusCode).toBe(401);
  expect(res.body.message).toMatch(/invalid/i);
});

// ==============================
// 🧪 TEST 6: Fetch profile with valid token
// ==============================
test('should fetch profile with valid token', async () => {
  const regRes = await request(app).post('/api/auth/register').send({
    name: 'Token Guy',
    email: 'token@example.com',
    password: 'abc12345',
  });

  const token = regRes.body.token;

  const res = await request(app)
    .get('/api/users/me')
    .set('Authorization', `Bearer ${token}`);

  expect(res.statusCode).toBe(200);
  expect(res.body.email).toBe('token@example.com');
});

// ==============================
// 🧪 TEST 7: Fail to fetch profile with no token
// ==============================
test('should not fetch profile without token', async () => {
  const res = await request(app).get('/api/users/me');
  expect(res.statusCode).toBe(401);
  expect(res.body.message).toMatch(/access denied/i);
});

// ==============================
// 🧪 TEST 8: Fail to update profile with invalid token
// ==============================
test('should not update profile with invalid token', async () => {
  const res = await request(app)
    .put('/api/users/me')
    .set('Authorization', 'Bearer faketoken')
    .send({ name: 'New Name' });

  expect(res.statusCode).toBe(400);
  expect(res.body.message).toMatch(/invalid token/i);
});
