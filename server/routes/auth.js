import express from 'express';
import { OAuth2Client } from 'google-auth-library';
import User from '../models/user.js';
import { generateEmpID } from '../utils/empid.js';
import jwt from 'jsonwebtoken';

const router = express.Router();

// Validate environment variables at startup
if (!process.env.GOOGLE_CLIENT_ID) {
  console.error('ERROR: GOOGLE_CLIENT_ID is not set in .env');
}
if (!process.env.JWT_SECRET) {
  console.error('ERROR: JWT_SECRET is not set in .env');
}

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

function createJwt(user) {
  const payload = { sub: user._id.toString(), empID: user.empID, roles: user.roles };
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
}

router.post('/auth/google/token', async (req, res) => {
  try {
    const { id_token } = req.body;
    if (!id_token) {
      console.error('No id_token provided');
      return res.status(400).json({ error: 'id_token required' });
    }

    console.log('Verifying id_token with GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID);
    
    if (!process.env.GOOGLE_CLIENT_ID) {
      console.error('GOOGLE_CLIENT_ID is not set');
      return res.status(500).json({ error: 'Server misconfiguration: GOOGLE_CLIENT_ID not set' });
    }

    const ticket = await client.verifyIdToken({ 
      idToken: id_token, 
      audience: process.env.GOOGLE_CLIENT_ID 
    });
    const payload = ticket.getPayload();
    console.log('Token verified, payload email:', payload?.email);
    
    if (!payload || !payload.email) {
      console.error('Invalid token payload');
      return res.status(401).json({ error: 'Invalid token payload' });
    }

    const googleId = payload.sub;
    const email = payload.email.toLowerCase();
    const emailVerified = payload.email_verified;

    let user = await User.findOne({ googleId }).exec();
    if (!user) {
      user = await User.findOne({ email }).exec();
      if (!user) {
        const empID = await generateEmpID();
        user = new User({ googleId, email, empID, verified: !!emailVerified, name: null });
        await user.save();
        console.log('Created new user:', { email, empID });
      } else {
        user.googleId = googleId;
        user.verified = user.verified || !!emailVerified;
        await user.save();
        console.log('Linked existing user to Google:', email);
      }
    } else {
      user.verified = user.verified || !!emailVerified;
      user.lastLoginAt = new Date();
      await user.save();
      console.log('Updated existing user:', email);
    }

    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not set');
      return res.status(500).json({ error: 'Server misconfiguration: JWT_SECRET not set' });
    }

    const token = createJwt(user);
    res.cookie('session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    console.log('User authenticated:', { googleId, email, needsName: !user.name });
    return res.json({ ok: true, user: { id: user._id, email: user.email, name: user.name, empID: user.empID }, needsName: !user.name });
  } catch (err) {
    console.error('Google token verification failed:', err.message, err.stack);
    return res.status(401).json({ error: 'Token verification failed', details: err.message });
  }
});
// After your fetch to /auth/google/token succeeds:


router.post('/auth/logout', (req, res) => {
  res.clearCookie('session');
  res.json({ ok: true });
});

export default router;
