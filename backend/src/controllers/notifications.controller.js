/**
 * src/controllers/notifications.controller.js
 */
const { query } = require('../config/db');

const { createNotification } = require('../services/notifications.service');

// ── GET /api/notifications ─────────────────────────────────────
const getNotifications = async (req, res, next) => {
    try {
        const limit = parseInt(req.query.limit) || 30;

        const result = await query(
            `SELECT
                n.id, n.type, n.title, n.message,
                n.is_read AS read, n.created_at AS time,
                p.id   AS "projectId",
                p.name AS "projectName"
             FROM notifications n
             LEFT JOIN projects p ON p.id = n.project_id
             WHERE n.user_id = $1
             ORDER BY n.created_at DESC
             LIMIT $2`,
            [req.user.id, limit]
        );

        const unread = result.rows.filter(n => !n.read).length;

        res.json({
            notifications: result.rows,
            unreadCount: unread,
        });
    } catch (err) {
        next(err);
    }
};

// ── POST /api/notifications/read ───────────────────────────────
// Mark one or all notifications as read
const markRead = async (req, res, next) => {
    try {
        const { ids } = req.body; // array of IDs, or empty to mark all

        if (ids && ids.length > 0) {
            // Mark specific IDs that belong to this user
            await query(
                `UPDATE notifications
                 SET is_read = TRUE
                 WHERE user_id = $1 AND id = ANY($2::uuid[])`,
                [req.user.id, ids]
            );
        } else {
            // Mark all
            await query(
                `UPDATE notifications SET is_read = TRUE WHERE user_id = $1`,
                [req.user.id]
            );
        }

        res.json({ message: 'Notifications marked as read' });
    } catch (err) {
        next(err);
    }
};

// ── POST /api/notifications/test ───────────────────────────────
const testPush = async (req, res, next) => {
    try {
        await createNotification({
            userId: req.user.id,
            type: 'geo_fence_alert',
            title: 'Test Push Notification',
            message: 'Hello! Your push notifications are successfully configured and working.'
        });
        res.json({ message: 'Test notification queued successfully.' });
    } catch (err) {
        next(err);
    }
};

// ── GET /api/notifications/geofence-trigger ────────────────────
const triggerGeofence = async (req, res, next) => {
    try {
        const { runGeofenceCheck } = require('../jobs/geofence.job');
        await runGeofenceCheck();
        res.json({ message: 'Geofence scan executed manually.' });
    } catch (err) {
        next(err);
    }
};

// ── GET /api/notifications/clear-cooldowns ─────────────────────
const clearCooldowns = async (req, res, next) => {
    try {
        const { clearRecentAlerts } = require('../jobs/geofence.job');
        
        // Clear in-memory map
        clearRecentAlerts();

        // Optional: clear DB notifications for this user within 24h to allow re-testing
        const { query } = require('../config/db');
        await query(
            `DELETE FROM notifications 
             WHERE user_id = $1 AND type = 'geo_fence_alert' 
             AND created_at > NOW() - INTERVAL '24 hours'`,
            [req.user.id]
        );

        res.json({ message: 'Alert cooldowns cleared for your account.' });
    } catch (err) {
        next(err);
    }
};

module.exports = { getNotifications, markRead, testPush, triggerGeofence, clearCooldowns };
