import mongoose from 'mongoose';

const invitationSchema = new mongoose.Schema({
  senderUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  senderEmpID: { type: String, required: true },
  senderEmail: { type: String, required: true },
  receiverUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  receiverEmpID: { type: String, default: null },
  receiverEmail: { type: String, required: true },
  message: { type: String, default: '' },
  status: { type: String, enum: ['pending','accepted','rejected','cancelled','expired'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
  respondedAt: { type: Date, default: null },
  expiresAt: { type: Date, default: null },
  responseNote: { type: String, default: null }
});

// Compound index to prevent duplicate pending invites from same sender
invitationSchema.index({ senderUserId: 1, receiverEmail: 1, status: 1 });

export default mongoose.models.Invitation || mongoose.model('Invitation', invitationSchema);
