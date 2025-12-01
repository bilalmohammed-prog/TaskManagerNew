import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/user.js';

const router = express.Router();

function requireAuth(req, res, next) {
  const token = req.cookies?.session;
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.sub;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

router.post('/api/users/complete-profile', requireAuth, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({ error: 'Name is required and must be at least 2 characters' });
    }
    const cleaned = name.trim();
    const user = await User.findByIdAndUpdate(req.userId, { name: cleaned }, { new: true }).exec();
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json({ ok: true, user: { id: user._id, email: user.email, name: user.name, empID: user.empID } });
  } catch (err) {
    console.error('complete-profile error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.get('/api/users/me', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).lean();
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json({ ok: true, user: { id: user._id, email: user.email, name: user.name, empID: user.empID } });
  } catch (err) {
    console.error('users/me error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router;
