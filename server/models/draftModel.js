import mongoose from "mongoose";

const draftSchema = new mongoose.Schema({
  senderID: { type: String, required: true },
  senderEmail: { type: String, required: true },
  senderName: { type: String, required: true },
  receiverID: { type: String, required: true },
  receiverEmail: { type: String, required: true },
  message: { type: String, required: true },
  timestamp: { type: Number, required: true }
});


export default mongoose.model("Draft", draftSchema);
