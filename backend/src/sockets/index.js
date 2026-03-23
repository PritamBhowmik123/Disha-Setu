/**
 * src/sockets/index.js
 * Socket.io server — real-time project updates and notifications
 *
 * Rooms:
 *   project:{projectId}  — subscribe to project updates
 *   user:{userId}        — receive personal notifications
 *
 * Events emitted by server:
 *   project_update   — a project was updated by admin
 *   new_notification — a personal notification arrived
 *   geo_alert        — user is near a project geofence
 */
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

let io;

const initSocket = (httpServer) => {
    io = new Server(httpServer, {
        cors: {
            origin: '*', // Tighten in production using CORS_ORIGINS
            methods: ['GET', 'POST'],
        },
        transports: ['websocket', 'polling'],
    });

    // Optional JWT auth on connection
    io.use((socket, next) => {
        const token = socket.handshake.auth?.token || socket.handshake.query?.token;
        if (token) {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                socket.userId = decoded.sub;
            } catch (_) {
                // Not authenticated — still allow for public project rooms
            }
        }
        next();
    });

    io.on('connection', (socket) => {
        const userId = socket.userId;
        console.log(`[Socket] Connected: ${socket.id}${userId ? ` (user: ${userId})` : ' (anon)'}`);

        // Auto-join the user's personal room
        if (userId) {
            socket.join(`user:${userId}`);
        }

        // Client subscribes to a project room
        socket.on('subscribe_project', (projectId) => {
            if (projectId) {
                socket.join(`project:${projectId}`);
                socket.emit('subscribed', { projectId });
            }
        });

        socket.on('unsubscribe_project', (projectId) => {
            if (projectId) socket.leave(`project:${projectId}`);
        });

        // Client sends their location for geo-fencing (lightweight, in-band)
        socket.on('update_location', ({ lat, lng }) => {
            if (userId && lat && lng) {
                const geoService = require('../services/geo.service');
                const { checkUserGeofence } = require('../jobs/geofence.job');

                geoService.updateUserLocation(userId, parseFloat(lat), parseFloat(lng))
                    .then(() => {
                        // Trigger immediate check for this user
                        checkUserGeofence(userId);
                    })
                    .catch(err => console.error('[Socket] updateUserLocation error:', err.message));
            }
        });

        socket.on('disconnect', (reason) => {
            console.log(`[Socket] Disconnected: ${socket.id} — ${reason}`);
        });
    });

    return io;
};

/**
 * Get the Socket.io instance (after initialization)
 */
const getIO = () => {
    if (!io) throw new Error('Socket.io not initialized yet');
    return io;
};

module.exports = initSocket;
module.exports.getIO = getIO;
