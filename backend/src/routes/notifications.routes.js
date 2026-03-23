/**
 * src/routes/notifications.routes.js
 */
const router = require('express').Router();
const { getNotifications, markRead, testPush, triggerGeofence, clearCooldowns } = require('../controllers/notifications.controller');
const { requireAuth } = require('../middleware/auth.middleware');

router.get('/', requireAuth, getNotifications);
router.post('/read', requireAuth, markRead);
router.post('/test', requireAuth, testPush);
router.post('/geofence-trigger', requireAuth, triggerGeofence);
router.post('/clear-cooldowns', requireAuth, clearCooldowns);

module.exports = router;
