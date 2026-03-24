/**
 * src/controllers/indoor-navigation.controller.js
 * Indoor navigation endpoints
 */
const indoorNavService = require('../services/indoor-navigation.service');
const { query } = require('../config/db');

// ── GET /api/buildings ──────────────────────────────────────────
const getBuildings = async (req, res, next) => {
    try {
        const buildings = await indoorNavService.getBuildings();
        res.json({ buildings });
    } catch (err) {
        next(err);
    }
};

// ── GET /api/buildings/:id ──────────────────────────────────────
const getBuildingById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const building = await indoorNavService.getBuildingById(id);
        
        if (!building) {
            return res.status(404).json({ error: 'Building not found' });
        }
        
        res.json({ building });
    } catch (err) {
        next(err);
    }
};

// ── GET /api/buildings/:id/floors ──────────────────────────────
const getBuildingFloors = async (req, res, next) => {
    try {
        const { id } = req.params;
        const building = await indoorNavService.getBuildingById(id);
        
        if (!building) {
            return res.status(404).json({ error: 'Building not found' });
        }
        
        res.json({ floors: building.floors || [] });
    } catch (err) {
        next(err);
    }
};

// ── GET /api/floors/:id ───────────────────────────────────────
const getFloorById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const floor = await indoorNavService.getFloorById(id);
        
        if (!floor) {
            return res.status(404).json({ error: 'Floor not found' });
        }
        
        res.json({ floor });
    } catch (err) {
        next(err);
    }
};

// ── GET /api/floors/:id/rooms ─────────────────────────────────
const getFloorRooms = async (req, res, next) => {
    try {
        const { id } = req.params;
        const floor = await indoorNavService.getFloorById(id);
        
        if (!floor) {
            return res.status(404).json({ error: 'Floor not found' });
        }
        
        res.json({ rooms: floor.rooms || [] });
    } catch (err) {
        next(err);
    }
};

// ── GET /api/rooms/:id ────────────────────────────────────────
const getRoomById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const room = await indoorNavService.getRoomDetails(id);
        
        if (!room) {
            return res.status(404).json({ error: 'Room not found' });
        }
        
        res.json({ room });
    } catch (err) {
        next(err);
    }
};

// ── GET /api/navigation/search ─────────────────────────────────
const searchRooms = async (req, res, next) => {
    try {
        const { q, building_id } = req.query;
        
        if (!q || q.trim().length < 2) {
            return res.status(400).json({ error: 'Search query must be at least 2 characters' });
        }
        
        const results = await indoorNavService.searchRooms(q.trim(), building_id);
        
        res.json({ results });
    } catch (err) {
        next(err);
    }
};

// ── GET /api/navigation/route ─────────────────────────────────
// Query params: from=<roomId> & to=<roomId> & accessible=true/false
const getRoute = async (req, res, next) => {
    try {
        const { from, to, accessible } = req.query;
        
        if (!from || !to) {
            return res.status(400).json({ 
                error: 'Both "from" and "to" room IDs are required' 
            });
        }
        
        const options = {
            accessibleOnly: accessible === 'true',
        };
        
        const route = await indoorNavService.findRoute(from, to, options);
        
        res.json(route);
    } catch (err) {
        next(err);
    }
};

// ── GET /api/floors/:id/connections ──────────────────────────────
// Returns all corridor connections whose both rooms belong to this floor.
const getFloorConnections = async (req, res, next) => {
    try {
        const { id } = req.params;
        const floor = await indoorNavService.getFloorById(id);
        if (!floor) return res.status(404).json({ error: 'Floor not found' });

        // Fetch connections where BOTH endpoints are on this floor
        const result = await query(
            `SELECT c.from_room AS room_a_id, c.to_room AS room_b_id, c.distance, c.is_accessible
             FROM connections c
             JOIN rooms ra ON c.from_room = ra.id
             JOIN rooms rb ON c.to_room   = rb.id
             WHERE ra.floor_id = $1 AND rb.floor_id = $1`,
            [id]
        );

        res.json({ connections: result.rows });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getBuildings,
    getBuildingById,
    getBuildingFloors,
    getFloorById,
    getFloorRooms,
    getFloorConnections,
    getRoomById,
    searchRooms,
    getRoute,
};
