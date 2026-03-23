/**
 * src/routes/projects.routes.js
 */
const router = require('express').Router();
const { getProjects, getNearbyProjects, getProjectById,
    updateUserLocation, getProjectFeedback } = require('../controllers/projects.controller');
const { optionalAuth, requireAuth } = require('../middleware/auth.middleware');
const updatesRoutes = require('./updates.routes');

// NOTE: static routes MUST come before /:id to avoid route collision
router.get('/', optionalAuth, getProjects);
router.get('/nearby', optionalAuth, getNearbyProjects);
router.post('/location', requireAuth, updateUserLocation);
router.get('/:id', optionalAuth, getProjectById);
router.get('/:id/feedback', optionalAuth, getProjectFeedback);

// Nest updates sub-router: GET/POST /api/projects/:id/updates
// (mergeParams: true is set in updates.routes.js so it can access :id)
router.use('/:id/updates', updatesRoutes);

module.exports = router;
