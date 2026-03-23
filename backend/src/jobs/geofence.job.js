/**
 * src/jobs/geofence.job.js
 * Background job: detect users near project geofences
 * Runs every N minutes via node-cron
 */
const cron = require('node-cron');
const { getUsersNearProjectGeofences } = require('../services/geo.service');
const { createNotification } = require('../services/notifications.service');
const { query } = require('../config/db');

// Track which (user, project) pairs were already alerted recently to prevent spam
// In production, use Redis; here we use an in-memory Map with TTL
const recentAlerts = new Map();
const ALERT_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour cooldown per (user, project) pair

const runGeofenceCheck = async () => {
    try {
        const pairs = await getUsersNearProjectGeofences();
        if (pairs.length === 0) return;

        console.log(`[Geofence] Checking ${pairs.length} user-project proximity pairs...`);

        for (const pair of pairs) {
            const key = `${pair.user_id}:${pair.project_id}`;
            const lastAlert = recentAlerts.get(key);

            // Skip if recently alerted
            if (lastAlert && (Date.now() - lastAlert) < ALERT_COOLDOWN_MS) continue;

            // Check if notification was already sent in DB (24h window)
            const existingRes = await query(
                `SELECT id FROM notifications
                 WHERE user_id = $1
                   AND project_id = $2
                   AND type = 'geo_fence_alert'
                   AND created_at > NOW() - INTERVAL '24 hours'
                 LIMIT 1`,
                [pair.user_id, pair.project_id]
            );

            if (existingRes.rows.length > 0) {
                recentAlerts.set(key, Date.now());
                continue;
            }

            // Send notification
            const distanceText = pair.distance_m < 1000
                ? `${pair.distance_m}m`
                : `${(pair.distance_m / 1000).toFixed(1)}km`;

            await createNotification({
                userId: pair.user_id,
                projectId: pair.project_id,
                type: 'geo_fence_alert',
                title: `You're near a project site!`,
                message: `${pair.project_name} is ${distanceText} away. Tap to learn more.`,
            });

            // Emit Socket.io geo_alert to user's room
            try {
                const { getIO } = require('../sockets');
                const io = getIO();
                io.to(`user:${pair.user_id}`).emit('geo_alert', {
                    projectId: pair.project_id,
                    projectName: pair.project_name,
                    distanceM: pair.distance_m,
                    status: pair.status,
                });
            } catch (_) {
                // Socket.io may not be initialized yet
            }

            recentAlerts.set(key, Date.now());
            console.log(`[Geofence] Alert sent → user:${pair.user_id}, project:${pair.project_name}, dist:${pair.distance_m}m`);
        }
    } catch (err) {
        console.error('[Geofence] Job error:', err.message);
    }
};

const startGeofenceJob = () => {
    const interval = parseInt(process.env.GEOFENCE_JOB_INTERVAL_MINUTES) || 5;
    const cronExpr = `*/${interval} * * * *`;
    cron.schedule(cronExpr, runGeofenceCheck);
    console.log(`[Geofence] Job started — runs every ${interval} minutes`);
};

const clearRecentAlerts = () => {
    recentAlerts.clear();
    console.log('[Geofence] In-memory alert cooldowns cleared.');
};

module.exports = { startGeofenceJob, runGeofenceCheck, clearRecentAlerts };
