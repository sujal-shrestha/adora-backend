// server.js
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import app from './app.js'; 

dotenv.config();

const PORT = process.env.PORT || 10010;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
  });
});
