import express from 'express';
import { OAuth2Client } from 'google-auth-library';
import User from '../models/user.js';
import { generateEmpID } from '../utils/empid.js';
import jwt from 'jsonwebtoken';

const router = express.Router();
import cookieParser from 'cookie-parser';


// Required to read cookies from requests
router.use(cookieParser());
router.use(async (req, res, next) => {
  try {
    const token = req.cookies?.session;
    if (!token) return next();

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.sub);

    if (user) req.user = user;
    next();
  } catch (err) {
    res.clearCookie("session");
    next();
  }
});
function requireAuth(req, res, next) {
  // If user is logged in, allow
  if (req.user) {
  return next();
}


  // If request is from browser → redirect
  const acceptsHTML = req.headers.accept?.includes("text/html");

  if (acceptsHTML) {
    return res.redirect("/login.html");
  }

  // If request is API → return 401 JSON
  return res.status(401).json({ error: "Not authenticated" });
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
//ticket contaisn the verified token info
    const ticket = await client.verifyIdToken({ 
      idToken: id_token, 
      audience: process.env.GOOGLE_CLIENT_ID 
    });
    const payload = ticket.getPayload();//payload contains users info
    /**{
  iss: "https://accounts.google.com",   // issuer
  azp: "your-client-id.apps.googleusercontent.com",
  aud: "your-client-id.apps.googleusercontent.com",  // audience
  sub: "123456789012345678901",        // unique Google user ID
  email: "user@gmail.com",             // user's email
  email_verified: true,                // whether email is verified
  name: "John Doe",                    // full name
  given_name: "John",
  family_name: "Doe",
  picture: "https://lh3.googleusercontent.com/...",  // profile image
  iat: 1736000000,                     // issued-at timestamp
  exp: 1736003600                      // expiry timestamp
}**///payload format

    console.log('Token verified, payload email:', payload?.email);
    
    if (!payload || !payload.email) {
      console.error('Invalid token payload');
      return res.status(401).json({ error: 'Invalid token payload' });
    }

    const googleId = payload.sub;
    const email = payload.email.toLowerCase();
    const emailVerified = payload.email_verified;

    let user = await User.findOne({ googleId }).exec();//searches if user exists in User which was exported earlier
    if (!user) {
      user = await User.findOne({ email }).exec();//.exec returns a promise and is more consistent
      if (!user) {
        const empID = await generateEmpID();
        user = new User({ googleId, email, empID, verified: !!emailVerified, name: null });// !! converts to strict true or fasle
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
      sameSite: 'lax'
    });

    console.log('User authenticated:', { googleId, email, needsName: !user.name });
    return res.json({ id: user._id, email: user.email, name: user.name, empID: user.empID });
  } catch (err) {
    console.error('Google token verification failed:', err.message, err.stack);
    return res.status(401).json({ error: 'Token verification failed', details: err.message });
  }
});
// After your fetch to /auth/google/token succeeds:
router.post('/api/users/complete-profile', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    const user = await User.findById(req.user._id);
    user.name = name;
    await user.save();

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/auth/logout', (req, res) => {
  res.clearCookie('session');
  res.json({ ok: true });
});


router.post("/api/users/complete-profile", async (req, res) => {
  // existing logic
});

export default router;
export { requireAuth };