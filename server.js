import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import connectDB from './config/db.js';
import authRoutes from './routes/authRoutes.js';

dotenv.config();


const app = express();
// Optional: still include cors() for middleware compatibility
app.use(cors({
  origin: '*',
  // methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  // credentials: true, // only needed if you're using cookies or auth header
}));

// Allow specific origin and headers
// app.use((req, res, next) => {
//   res.header('Access-Control-Allow-Origin', 'http://localhost:5173');
//   res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
//   res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
//   res.header('Access-Control-Allow-Credentials', 'true');
//   next();
// });



// Parse JSON body
app.use(express.json());

// Routes
app.use('/api/auth/', authRoutes);

const PORT = process.env.PORT || 10010;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
  });
});
