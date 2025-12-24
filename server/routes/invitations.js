import express from 'express';
import jwt from 'jsonwebtoken';
import Invitation from '../models/invitation.js';
import Notification from '../models/notification.js';
import User from '../models/user.js';
import mongoose from 'mongoose';

const router = express.Router();

function requireAuth(req, res, next) {
  const token = req.cookies?.session;
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.sub;
    req.userEmpID = payload.empID;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Create an invitation (manager sends invite)
router.post('/api/invitations', requireAuth, async (req, res) => {
  try {
    const { receiverEmail, receiverEmpID, message, expiresAt } = req.body;
    if (!receiverEmail && !receiverEmpID) return res.status(400).json({ error: 'receiverEmail or receiverEmpID required' });

    const senderUser = await User.findById(req.userId).lean();
    if (!senderUser) return res.status(401).json({ error: 'Sender not found' });

    const normalizedEmail = (receiverEmail || '').toLowerCase();
    if (normalizedEmail && senderUser.email === normalizedEmail) return res.status(400).json({ error: 'Cannot invite yourself' });

    // optional: check existing employee record
    if (receiverEmpID) {
      const existingEmp = await User.findOne({ empID: receiverEmpID }).lean();
      if (existingEmp && existingEmp.managerID) {
        return res.status(409).json({ error: 'Employee already assigned to a manager' });
      }
    }

    // prevent duplicate pending invitation
    const dup = await Invitation.findOne({ senderUserId: req.userId, receiverEmail: normalizedEmail, status: 'pending' }).lean();
    if (dup) return res.status(409).json({ error: 'Pending invitation already exists' });

    const invitation = await Invitation.create({
      senderUserId: req.userId,
      senderEmpID: req.userEmpID || senderUser.empID,
        senderEmail: senderUser.email,
      receiverUserId: null,
      receiverEmpID: receiverEmpID || null,
      receiverEmail: normalizedEmail || '',
      message: message || '',
      status: 'pending',
      expiresAt: expiresAt || null
    });

    // create a notification for the receiver if they have a user record
    const receiverUser = await User.findOne({ email: normalizedEmail }).lean();
    if (receiverUser) {
      await Notification.create({ userId: receiverUser._id, type: 'invitation_received', payload: { invitationId: invitation._id, senderEmpID: invitation.senderEmpID, message: invitation.message } });
    }

    return res.status(201).json({ invitation });
  } catch (err) {
    console.error('Create invitation error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Get invitations (received or sent)
router.get('/api/invitations', requireAuth, async (req, res) => {
  try {
    const q = req.query;
    if (q.received === 'true') {
      const user = await User.findById(req.userId).lean();
      const invites = await Invitation.find({ receiverEmail: user.email.toLowerCase() }).sort({ createdAt: -1 }).lean();
      return res.json({ invitations: invites });
    }
    if (q.sent === 'true') {
      const invites = await Invitation.find({ senderUserId: req.userId }).sort({ createdAt: -1 }).lean();
      return res.json({ invitations: invites });
    }
    return res.status(400).json({ error: 'Specify ?received=true or ?sent=true' });
  } catch (err) {
    console.error('Get invitations error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Respond to invitation (accept/reject)
router.post('/api/invitations/:id/respond', requireAuth, async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const { action, responseNote } = req.body;
    const id = req.params.id;
    if (!['accept','reject'].includes(action)) return res.status(400).json({ error: 'Invalid action' });

    const invitation = await Invitation.findById(id);
    if (!invitation) return res.status(404).json({ error: 'Invitation not found' });
    if (invitation.status !== 'pending') return res.status(400).json({ error: 'Invitation already responded' });

    // ensure current user matches receiver
    const currentUser = await User.findById(req.userId).exec();
    if (!currentUser) return res.status(401).json({ error: 'User not found' });
    if (invitation.receiverEmail && invitation.receiverEmail.toLowerCase() !== currentUser.email.toLowerCase()) {
      return res.status(403).json({ error: 'Not the invitation recipient' });
    }

    if (action === 'accept') {
      // Transaction: set invitation accepted and set employee.managerID
      await session.withTransaction(async () => {
        // mark invitation
        invitation.status = 'accepted';
        invitation.respondedAt = new Date();
        invitation.responseNote = responseNote || null;
        invitation.receiverUserId = invitation.receiverUserId || currentUser._id;
        await invitation.save({ session });

        // find or create employee record for this user
        let employee = await User.findOne({ email: currentUser.email }).session(session);
        if (!employee) {
          // create lightweight employee record
          employee = await User.create([{ email: currentUser.email, name: currentUser.name || '', empID: currentUser.empID || null, verified: true }], { session });
          employee = employee[0];
        }

        // conditional update to avoid race
        const resUpdate = await User.updateOne({ _id: employee._id, $or: [{ managerID: null }, { managerID: '' }] }, { $set: { managerID: invitation.senderEmpID } }).session(session);
        if (resUpdate.matchedCount === 0) {
          throw new Error('Employee already assigned');
        }

        // notify manager
        await Notification.create([{ userId: invitation.senderUserId, type: 'invitation_response', payload: { invitationId: invitation._id, action: 'accepted', responderEmpID: employee.empID || null }, createdAt: new Date() }], { session });
      });

      return res.json({ ok: true, invitation: { id: invitation._id, status: 'accepted' } });
    }

    // reject path
    invitation.status = 'rejected';
    invitation.respondedAt = new Date();
    invitation.responseNote = responseNote || null;
    invitation.receiverUserId = invitation.receiverUserId || currentUser._id;
    await invitation.save();

    // create notification for manager
    await Notification.create({ userId: invitation.senderUserId, type: 'invitation_response', payload: { invitationId: invitation._id, action: 'rejected' } });

    return res.json({ ok: true, invitation: { id: invitation._id, status: 'rejected' } });
  } catch (err) {
    console.error('Respond to invitation error', err);
    if (err.message === 'Employee already assigned') return res.status(409).json({ error: 'Employee already assigned' });
    return res.status(500).json({ error: 'Server error', details: err.message });
  } finally {
    session.endSession();
  }
});

// Cancel invitation (sender only)
router.patch('/api/invitations/:id/cancel', requireAuth, async (req, res) => {
  try {
    const id = req.params.id;
    const invitation = await Invitation.findById(id);
    if (!invitation) return res.status(404).json({ error: 'Invitation not found' });
    if (invitation.senderUserId.toString() !== req.userId.toString()) return res.status(403).json({ error: 'Not the sender' });
    if (invitation.status !== 'pending') return res.status(400).json({ error: 'Only pending invitations can be cancelled' });

    invitation.status = 'cancelled';
    invitation.respondedAt = new Date();
    await invitation.save();

    // notify receiver if they exist
    const receiver = await User.findOne({ email: invitation.receiverEmail }).lean();
    if (receiver) {
      await Notification.create({ userId: receiver._id, type: 'invitation_cancelled', payload: { invitationId: invitation._id } });
    }

    return res.json({ ok: true, invitation: { id: invitation._id, status: 'cancelled' } });
  } catch (err) {
    console.error('Cancel invitation error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});
router.post('/api/employee/drop', requireAuth, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "email required" });

    const manager = req.user; // already loaded by requireAuth
    if (!manager) return res.status(401).json({ error: "Manager not found" });

    const employee = await User.findOne({ email: email.toLowerCase() });
    if (!employee) return res.status(404).json({ error: "Employee not found" });

    if (employee.managerID !== manager.empID)
      return res.status(403).json({ error: "Employee not under this manager" });

    // Prevent self-drop
    if (employee._id.equals(manager._id))
      return res.status(400).json({ error: "You cannot drop yourself" });

    // Remove manager link
    employee.managerID = null;
    await employee.save();

    // Optional notifications if you actually have Notification model
    // safe to keep if exists, otherwise remove
    try {
      await Notification.create([
        {
          userId: employee._id,
          type: "employee_dropped",
          payload: { managerEmpID: manager.empID }
        },
        {
          userId: manager._id,
          type: "employee_dropped_confirm",
          payload: { droppedEmpID: employee.empID }
        }
      ]);
    } catch {}

    res.json({ ok: true });

  } catch (err) {
    console.error("Drop employee error:", err);
    res.status(500).json({ error: "Server error" });
  }
});
router.get('/api/me', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).lean();
    if (!user) return res.status(404).json({ error: "User not found" });

    res.json({
      email: user.email,
      empID: user.empID,
      name: user.name
    });
  } catch (err) {
    console.error("ME route error", err);
    res.status(500).json({ error: "Server error" });
  }
});


export default router;
