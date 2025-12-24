import express from "express";
import Draft from "../models/draftModel.js";
import User from "../models/user.js";

const router = express.Router();


router.post("/draft", async (req, res) => {
  try {
    const { senderID, senderEmail, senderName, receiverID, message, timestamp } = req.body;

    if (!senderID || !senderEmail || !senderName || !receiverID || !message || !timestamp) {
      return res.status(400).json({ error: "All fields required" });
    }

    // 🔥 Get receiver email safely
    const receiver = await User.findOne({ empID: receiverID }).lean();
    if (!receiver) return res.status(404).json({ error: "Receiver not found" });

    const newDraft = await Draft.create({
      senderID,
      senderEmail,
      senderName,
      receiverID,
      receiverEmail: receiver.email.toLowerCase(),   // ✅ SAVE EMAIL
      message,
      timestamp
    });

    res.status(201).json({ message: "Draft saved", draft: newDraft });

  } catch (err) {
    console.error("Draft save error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET received drafts for current user
router.get("/draft", async (req, res) => {
  try {
    const { receiverID } = req.query;

    if (!receiverID) {
      return res.status(400).json({ error: "receiverID required" });
    }

    const drafts = await Draft.find({ receiverID }).sort({ timestamp: -1 });
    
    res.status(200).json({ drafts });

  } catch (err) {
    console.error("Draft fetch error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET sent drafts for current user
router.get("/draft/sent", async (req, res) => {
  try {
    const { senderID } = req.query;

    if (!senderID) {
      return res.status(400).json({ error: "senderID required" });
    }

    const drafts = await Draft.find({ senderID }).sort({ timestamp: -1 });
    
    res.status(200).json({ drafts });

  } catch (err) {
    console.error("Draft fetch error:", err);
    res.status(500).json({ error: "Server error" });
  }
});
export default router;
