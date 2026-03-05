/**
 * src/routes/indoor-navigation.routes.js
 * Indoor navigation API routes
 */
const express = require('express');
const router = express.Router();
const indoorNavController = require('../controllers/indoor-navigation.controller');
const { authenticate } = require('../middleware/auth.middleware');

// Public routes (no auth required)
router.get('/buildings', indoorNavController.getBuildings);
router.get('/buildings/:id', indoorNavController.getBuildingById);
router.get('/buildings/:id/floors', indoorNavController.getBuildingFloors);
router.get('/floors/:id', indoorNavController.getFloorById);
router.get('/floors/:id/rooms', indoorNavController.getFloorRooms);
router.get('/rooms/:id', indoorNavController.getRoomById);

// Navigation routes
router.get('/navigation/search', indoorNavController.searchRooms);
router.get('/navigation/route', indoorNavController.getRoute);

module.exports = router;
