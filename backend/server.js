/**
 * server.js
 * HTTP server + Socket.io bootstrap
 */
require('dotenv').config();
const http = require('http');
const app = require('./src/app');
const initSocket = require('./src/sockets');

// Background jobs
const { startGeofenceJob } = require('./src/jobs/geofence.job');
const { startAnalyticsJob } = require('./src/jobs/analytics.job');

const PORT = process.env.PORT || 3000;

// Create HTTP server and attach Socket.io
const server = http.createServer(app);
initSocket(server);

server.listen(PORT, '0.0.0.0', () => {
    console.log(`
╔═══════════════════════════════════════╗
║   DishaSetu Backend                   ║
║   Port   : ${PORT}                        ║
║   Env    : ${(process.env.NODE_ENV || 'development').padEnd(11)}           ║
╚═══════════════════════════════════════╝
    `);

    // Start background jobs
    startGeofenceJob();
    startAnalyticsJob();
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    server.close(() => {
        console.log('HTTP server closed.');
        process.exit(0);
    });
});

module.exports = server; // for testing
