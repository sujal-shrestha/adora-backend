import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  profilePic: { type: String, default: '' }, // ✅ NEW FIELD
}, { timestamps: true });

// 🔍 Log after saving
userSchema.post('save', function (doc) {
  console.log('📝 New user saved:', doc);
});

// ✅ Export model after hooks are attached
export default mongoose.model('User', userSchema);
