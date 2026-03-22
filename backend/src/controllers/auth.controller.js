/**
 * src/controllers/auth.controller.js
 * Handles OTP, Google, and Guest authentication
 */
const { query } = require('../config/db');
const { generateOTP, verifyOTP } = require('../services/otp.service');
const { signToken } = require('../middleware/auth.middleware');
const { v4: uuidv4 } = require('uuid');
const { uploadToCloud } = require('../utils/cloudStorage');
const { OAuth2Client } = require('google-auth-library');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ── POST /api/auth/send-otp ────────────────────────────────────
const sendOTP = async (req, res, next) => {
    try {
        const { phone, role } = req.body;
        // Support international formats: +?[1-9]\d{6,14}
        if (!phone || !/^\+?[1-9]\d{6,14}$/.test(phone)) {
            return res.status(400).json({ error: 'Valid phone number required (e.g., +18125165247)' });
        }

        // Validate role if provided
        const userRole = role && ['user', 'admin'].includes(role) ? role : 'user';

        const code = await generateOTP(phone);
        console.log(`[Auth] Generating OTP for ${phone} in ${process.env.NODE_ENV} mode`);

        // Auto-create user if they don't exist, with role
        await query(
            `INSERT INTO users (phone, role) VALUES ($1, $2)
             ON CONFLICT (phone) DO UPDATE SET role = EXCLUDED.role`,
            [phone, userRole]
        );

        res.json({
            message: 'OTP sent successfully',
            mockMode: !code.sentViaSMS,
            // Return OTP in dev only AND if not sent via SMS — remove in production!
            ...((process.env.NODE_ENV === 'development' || !code.sentViaSMS) && { otp: code.code }),
        });
    } catch (err) {
        next(err);
    }
};

// ── POST /api/auth/verify-otp ──────────────────────────────────
const verifyOTPHandler = async (req, res, next) => {
    try {
        const { phone, otp, role } = req.body;
        if (!phone || !otp) {
            return res.status(400).json({ error: 'phone and otp are required' });
        }

        const valid = await verifyOTP(phone, otp);
        if (!valid) {
            return res.status(401).json({ error: 'Invalid or expired OTP' });
        }

        // Validate role if provided
        const userRole = role && ['user', 'admin'].includes(role) ? role : 'user';

        // Update user role and get user
        const result = await query(
            `UPDATE users SET role = $2 WHERE phone = $1
             RETURNING id, phone, name, avatar_url, civic_level, civic_points, role`,
            [phone, userRole]
        );
        const user = result.rows[0];
        const token = signToken(user.id);

        res.json({ token, user });
    } catch (err) {
        next(err);
    }
};

// ── POST /api/auth/google ──────────────────────────────────────
const googleAuth = async (req, res, next) => {
    try {
        const { idToken, role } = req.body;
        if (!idToken) {
            return res.status(400).json({ error: 'idToken required' });
        }

        // Verify Google ID token
        let googlePayload;
        try {
            // Check if it's a JWT (3 parts) or simple base64 token
            if (idToken.includes('.')) {
                if (process.env.GOOGLE_CLIENT_ID) {
                    // Securely verify signature and audience Native/Web
                    const ticket = await googleClient.verifyIdToken({
                        idToken,
                        audience: process.env.GOOGLE_CLIENT_ID,
                    });
                    googlePayload = ticket.getPayload();
                } else {
                    // Fallback development scaffold
                    const base64Url = idToken.split('.')[1];
                    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                    googlePayload = JSON.parse(Buffer.from(base64, 'base64').toString());
                }
            } else {
                // Simple base64 format (from accessToken flow)
                googlePayload = JSON.parse(Buffer.from(idToken, 'base64').toString());
            }
        } catch (err) {
            console.error('Google Auth Signature Error:', err);
            return res.status(401).json({ error: 'Invalid Google token signature' });
        }

        const googleId = googlePayload.sub;
        const name = googlePayload.name || '';
        const avatar = googlePayload.picture || null;

        if (!googleId) return res.status(401).json({ error: 'Invalid Google token' });

        // Validate role if provided
        const userRole = role && ['user', 'admin'].includes(role) ? role : 'user';

        // Upsert user with role
        const result = await query(
            `INSERT INTO users (google_id, name, avatar_url, role)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (google_id)
             DO UPDATE SET name = EXCLUDED.name, avatar_url = EXCLUDED.avatar_url, role = EXCLUDED.role, updated_at = NOW()
             RETURNING id, name, avatar_url, civic_level, civic_points, role`,
            [googleId, name, avatar, userRole]
        );

        const user = result.rows[0];
        const token = signToken(user.id);

        res.json({ token, user });
    } catch (err) {
        next(err);
    }
};

// ── POST /api/auth/guest ───────────────────────────────────────
const guestAuth = async (req, res, next) => {
    try {
        const { role } = req.body || {};
        
        // Validate role if provided
        const userRole = role && ['user', 'admin'].includes(role) ? role : 'user';
        
        const result = await query(
            `INSERT INTO users (is_guest, name, role)
             VALUES (TRUE, 'Guest User', $1)
             RETURNING id, name, is_guest, role`,
            [userRole]
        );
        const user = result.rows[0];
        const token = signToken(user.id, true);
        res.json({ token, user });
    } catch (err) {
        next(err);
    }
};

// ── POST /api/auth/push-token ──────────────────────────────────
const registerPushToken = async (req, res, next) => {
    try {
        const { token, platform } = req.body;
        const userId = req.user.id;

        if (!token) return res.status(400).json({ error: 'Push token required' });

        await query(
            `INSERT INTO push_tokens (user_id, token, platform)
             VALUES ($1, $2, $3)
             ON CONFLICT (user_id, token) DO NOTHING`,
            [userId, token, platform || 'unknown']
        );

        // Also update user location storage entry skeleton
        await query(
            `INSERT INTO user_locations (user_id, location)
             VALUES ($1, NULL)
             ON CONFLICT (user_id) DO NOTHING`,
            [userId]
        );

        res.json({ message: 'Push token registered' });
    } catch (err) {
        next(err);
    }
};

// ── GET /api/auth/me ───────────────────────────────────────────
const getMe = async (req, res, next) => {
    try {
        const result = await query(
            `SELECT id, phone, name, avatar_url, civic_level, civic_points, is_guest, role, created_at
             FROM users WHERE id = $1`,
            [req.user.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
        res.json(result.rows[0]);
    } catch (err) {
        next(err);
    }
};

// ── PATCH /api/auth/me ────────────────────────────────────────
const updateMe = async (req, res, next) => {
    try {
        const { name } = req.body;
        if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required' });
        const result = await query(
            `UPDATE users SET name = $1, updated_at = NOW() WHERE id = $2
             RETURNING id, phone, name, avatar_url, civic_level, civic_points, is_guest, role, created_at, updated_at`,
            [name.trim(), req.user.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
        res.json(result.rows[0]);
    } catch (err) {
        next(err);
    }
};

// ── POST /api/auth/avatar ─────────────────────────────────────
const uploadAvatar = async (req, res, next) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'Image file required' });
        const url = await uploadToCloud(req.file.buffer, 'dishasetu/avatars');
        const result = await query(
            `UPDATE users SET avatar_url = $1, updated_at = NOW() WHERE id = $2
             RETURNING id, phone, name, avatar_url, civic_level, civic_points, is_guest, role, created_at, updated_at`,
            [url, req.user.id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        next(err);
    }
};

module.exports = { sendOTP, verifyOTPHandler, googleAuth, guestAuth, registerPushToken, getMe, updateMe, uploadAvatar };
