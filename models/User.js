import mongoose from 'mongoose';

const mediaSchema = new mongoose.Schema({
  url: { type: String, required: true },
  public_id: { type: String },
}, { _id: false });

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  profilePic: { type: String, default: '' },

  media: [mediaSchema],
}, { timestamps: true });

userSchema.post('save', function (doc) {
  console.log('📝 New user saved:', doc);
});

export default mongoose.model('User', userSchema);
