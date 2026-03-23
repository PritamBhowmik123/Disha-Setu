/**
 * src/app.js
 * Express application factory
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Routes
const authRoutes = require('./routes/auth.routes');
const projectsRoutes = require('./routes/projects.routes');
const feedbackRoutes = require('./routes/feedback.routes');
const notificationsRoutes = require('./routes/notifications.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const indoorNavRoutes = require('./routes/indoor-navigation.routes');
const adminRoutes = require('./routes/admin.routes');
const locationsRoutes = require('./routes/locations.routes');
const docAnalysisRoutes = require('./routes/document-analysis.routes');
const roomInsightsRoutes = require('./routes/room-insights.routes');
const incidentRoutingRoutes = require('./routes/incident-routing.routes');
const newsImpactRoutes = require('./routes/news-impact.routes');


const app = express();

// ── Security Middleware ────────────────────────────────────────
app.use(helmet());

const allowedOrigins = (process.env.CORS_ORIGINS || '').split(',').map(o => o.trim()).filter(Boolean);
app.use(cors({
    origin: (origin, cb) => {
        // Allow Expo Go, localhost, and configured origins
        if (!origin || allowedOrigins.includes(origin) || /^exp:\/\//.test(origin)) {
            return cb(null, true);
        }
        return cb(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true,
}));

// ── Body Parsing ───────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Static Files (Admin Panel) ─────────────────────────────────
app.use('/admin-panel', express.static('public'));

// ── Rate Limiting ──────────────────────────────────────────────
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

// Stricter limit on auth endpoints to prevent brute-force
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 50,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many authentication requests, please try again later.' }
});
app.use('/api/auth', authLimiter);

// ── Health Check ───────────────────────────────────────────────
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'dishasetu-backend', timestamp: new Date().toISOString() });
});

// ── API Routes ─────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/notifications', notificationsRoutes);
// Project updates are served at /api/projects/:id/updates (nested in projects router)
app.use('/api/analytics', analyticsRoutes);
app.use('/api', indoorNavRoutes);  // Indoor navigation routes
app.use('/api/admin', adminRoutes);  // Admin routes (protected)
app.use('/api/locations', locationsRoutes);  // Dynamic preset locations
app.use('/api', docAnalysisRoutes);           // Document-aware navigation (extension)
app.use('/api', roomInsightsRoutes);          // Context-aware room insights
app.use('/api', incidentRoutingRoutes);       // Dynamic incident-based routing
app.use('/api', newsImpactRoutes);            // AI News Impact Extraction


// ── 404 Handler ────────────────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// ── Global Error Handler ──────────────────────────────────────
app.use((err, req, res, next) => {
    console.error('[ERROR]', err.message, err.stack);
    const status = err.status || err.statusCode || 500;
    res.status(status).json({
        error: err.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
});

module.exports = app;
