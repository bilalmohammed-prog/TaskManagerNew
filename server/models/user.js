import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  googleId: { type: String, unique: true, sparse: true },
  email: { type: String, unique: true, required: true },
  name: { type: String, default: null },
  empID: { type: String, unique: true, sparse: true },
  managerID: { type: String, default: null },
  verified: { type: Boolean, default: false },
  roles: { type: [String], default: ['user'] },
  status: { type: String, default: 'active' },
  lastLoginAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
}, { collection: 'empID' });

// Ensure the model name is `User` so Mongoose maps it to the expected `users` collection
export default mongoose.models.User || mongoose.model('User', userSchema);
