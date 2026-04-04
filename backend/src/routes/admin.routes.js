/**
 * src/routes/admin.routes.js
 * Admin-only API routes
 */
const router = require('express').Router();
const { requireAdmin } = require('../middleware/admin.middleware');
const adminController = require('../controllers/admin.controller');
const upload = require('../middleware/upload.middleware');

// ═══════════════════════════════════════════════════════════
// All routes require admin role
// ═══════════════════════════════════════════════════════════
router.use(requireAdmin);

// ── Dashboard ──────────────────────────────────────────────
router.get('/dashboard/stats', adminController.getDashboardStats);

// ── Feedback Management ────────────────────────────────────
router.get('/feedback', adminController.getAllFeedback);
router.patch('/feedback/:id/status', adminController.updateFeedbackStatus);
router.delete('/feedback/:id', adminController.deleteFeedback);

// ── Feedback Analytics ─────────────────────────────────────
router.get('/analytics/feedback', adminController.getFeedbackAnalytics);

// ── Indoor Navigation Management ───────────────────────────
router.get('/navigation/data', adminController.getNavigationData);

// Rooms
router.post('/navigation/rooms', adminController.addRoom);
router.patch('/navigation/rooms/:id', adminController.updateRoom);
router.delete('/navigation/rooms/:id', adminController.deleteRoom);

// Connections
router.post('/navigation/connections', adminController.addConnection);
router.delete('/navigation/connections/:id', adminController.deleteConnection);

// Buildings & Floors
router.post('/navigation/buildings', adminController.addBuilding);
router.post('/navigation/floors', adminController.addFloor);

// Blueprint Scan
router.post('/navigation/scan-blueprint', upload.single('blueprint'), adminController.scanBlueprint);

// ── User Management ────────────────────────────────────────
router.get('/users', adminController.getAllUsers);
router.patch('/users/:id/role', adminController.updateUserRole);

// ── Incident Management ────────────────────────────────────
router.get('/incidents', adminController.getAllIncidents);
router.post('/incidents', adminController.createIncidentAdmin);
router.put('/incidents/:id', adminController.updateIncident);
router.patch('/incidents/:id/active', adminController.toggleIncidentActive);
router.delete('/incidents/:id', adminController.deleteIncident);

module.exports = router;
