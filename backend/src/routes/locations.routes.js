/**
 * src/routes/locations.routes.js
 *
 * Mounts: GET /api/locations
 * Public — no auth required (location names are not sensitive)
 */
const router = require('express').Router();
const { getLocations } = require('../controllers/locations.controller');

router.get('/', getLocations);

module.exports = router;
