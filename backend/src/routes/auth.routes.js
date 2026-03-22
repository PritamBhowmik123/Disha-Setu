/**
 * src/routes/auth.routes.js
 */
const router = require('express').Router();
const { sendOTP, verifyOTPHandler, googleAuth, guestAuth,
    registerPushToken, getMe, updateMe, uploadAvatar } = require('../controllers/auth.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');

router.post('/send-otp', sendOTP);
router.post('/verify-otp', verifyOTPHandler);
router.post('/google', googleAuth);
router.post('/guest', guestAuth);
router.post('/push-token', requireAuth, registerPushToken);
router.get('/me', requireAuth, getMe);
router.patch('/me', requireAuth, updateMe);
router.post('/avatar', requireAuth, upload.single('photo'), uploadAvatar);

module.exports = router;
