// server.js
import express from 'express';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import authRoutes from './routes/auth.js';

app.use('/api/auth', authRoutes);


dotenv.config();

const app = express();
app.use(express.json());

// Connect to DB
connectDB();

// Example Route
app.get('/', (req, res) => {
  res.send('Adora Backend Running');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
