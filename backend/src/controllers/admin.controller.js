/**
 * src/controllers/admin.controller.js
 * Admin dashboard operations
 */
const { query, getClient } = require('../config/db');
const indoorNavService = require('../services/indoor-navigation.service');
const incidentService = require('../services/incident-routing.service');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// ═══════════════════════════════════════════════════════════
// DASHBOARD OVERVIEW
// ═══════════════════════════════════════════════════════════

const getDashboardStats = async (req, res, next) => {
    try {
        // Total feedback count
        const feedbackResult = await query(
            `SELECT COUNT(*) as total FROM feedback_reports`
        );

        // Total buildings
        const buildingsResult = await query(
            `SELECT COUNT(*) as total FROM buildings`
        );

        // Total rooms (navigation nodes)
        const roomsResult = await query(
            `SELECT COUNT(*) as total FROM rooms`
        );

        // Total projects
        const projectsResult = await query(
            `SELECT COUNT(*) as total FROM projects`
        );

        // Feedback by status
        const feedbackByStatus = await query(
            `SELECT status, COUNT(*) as count 
             FROM feedback_reports 
             GROUP BY status`
        );

        // Recent activity
        const recentActivity = await query(
            `SELECT id, ticket_id, category, status, created_at
             FROM feedback_reports
             ORDER BY created_at DESC
             LIMIT 10`
        );

        res.json({
            stats: {
                totalFeedback: parseInt(feedbackResult.rows[0].total),
                totalBuildings: parseInt(buildingsResult.rows[0].total),
                totalRooms: parseInt(roomsResult.rows[0].total),
                totalProjects: parseInt(projectsResult.rows[0].total),
            },
            feedbackByStatus: feedbackByStatus.rows,
            recentActivity: recentActivity.rows,
        });
    } catch (err) {
        next(err);
    }
};

// ═══════════════════════════════════════════════════════════
// FEEDBACK MANAGEMENT
// ═══════════════════════════════════════════════════════════

const getAllFeedback = async (req, res, next) => {
    try {
        const { status, category, limit = 50, offset = 0 } = req.query;

        const conditions = [];
        const params = [];
        let idx = 1;

        if (status) {
            conditions.push(`fr.status = $${idx++}`);
            params.push(status);
        }
        if (category) {
            conditions.push(`fr.category = $${idx++}`);
            params.push(category);
        }

        const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
        params.push(parseInt(limit));
        params.push(parseInt(offset));

        const result = await query(
            `SELECT
                fr.id, fr.ticket_id, fr.category, fr.description,
                fr.status, fr.photo_url, fr.created_at, fr.updated_at,
                p.name AS project_name, p.area AS project_area,
                u.name AS user_name, u.phone AS user_phone
             FROM feedback_reports fr
             LEFT JOIN projects p ON p.id = fr.project_id
             LEFT JOIN users u ON u.id = fr.user_id
             ${where}
             ORDER BY fr.created_at DESC
             LIMIT $${idx++} OFFSET $${idx}`,
            params
        );

        // Get total count
        const countResult = await query(
            `SELECT COUNT(*) as total FROM feedback_reports fr ${where}`,
            params.slice(0, params.length - 2)
        );

        res.json({
            feedback: result.rows,
            pagination: {
                total: parseInt(countResult.rows[0].total),
                limit: parseInt(limit),
                offset: parseInt(offset),
            },
        });
    } catch (err) {
        next(err);
    }
};

const updateFeedbackStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const validStatuses = ['Pending', 'Under Review', 'Resolved', 'Rejected'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        const result = await query(
            `UPDATE feedback_reports
             SET status = $1, updated_at = NOW()
             WHERE id = $2
             RETURNING *`,
            [status, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Feedback not found' });
        }

        res.json({
            message: 'Feedback status updated successfully',
            feedback: result.rows[0],
        });
    } catch (err) {
        next(err);
    }
};

const deleteFeedback = async (req, res, next) => {
    try {
        const { id } = req.params;

        const result = await query(
            `DELETE FROM feedback_reports WHERE id = $1 RETURNING ticket_id`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Feedback not found' });
        }

        res.json({
            message: 'Feedback deleted successfully',
            ticketId: result.rows[0].ticket_id,
        });
    } catch (err) {
        next(err);
    }
};

// ═══════════════════════════════════════════════════════════
// FEEDBACK ANALYTICS
// ═══════════════════════════════════════════════════════════

const getFeedbackAnalytics = async (req, res, next) => {
    try {
        // Most reported project locations
        const topProjects = await query(
            `SELECT p.name, p.area, p.district, COUNT(fr.id) as complaint_count
             FROM feedback_reports fr
             JOIN projects p ON p.id = fr.project_id
             GROUP BY p.id, p.name, p.area, p.district
             ORDER BY complaint_count DESC
             LIMIT 10`
        );

        // Most frequent categories
        const categoryBreakdown = await query(
            `SELECT category, COUNT(*) as count
             FROM feedback_reports
             GROUP BY category
             ORDER BY count DESC`
        );

        // Trend over time (last 30 days)
        const trendData = await query(
            `SELECT DATE(created_at) as date, COUNT(*) as count
             FROM feedback_reports
             WHERE created_at >= NOW() - INTERVAL '30 days'
             GROUP BY DATE(created_at)
             ORDER BY date ASC`
        );

        // Status distribution
        const statusData = await query(
            `SELECT status, COUNT(*) as count
             FROM feedback_reports
             GROUP BY status`
        );

        res.json({
            topProjects: topProjects.rows,
            categoryBreakdown: categoryBreakdown.rows,
            trendData: trendData.rows,
            statusData: statusData.rows,
        });
    } catch (err) {
        next(err);
    }
};

// ═══════════════════════════════════════════════════════════
// INDOOR NAVIGATION MANAGEMENT
// ═══════════════════════════════════════════════════════════

const addRoom = async (req, res, next) => {
    try {
        const {
            floor_id, name, type, room_number, description,
            x_coordinate, y_coordinate, is_accessible, is_landmark, keywords
        } = req.body;

        if (!floor_id || !name || !type) {
            return res.status(400).json({ error: 'floor_id, name, and type are required' });
        }

        const result = await query(
            `INSERT INTO rooms 
             (floor_id, name, type, room_number, description, x_coordinate, y_coordinate, is_accessible, is_landmark, keywords)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             RETURNING *`,
            [floor_id, name, type, room_number, description, x_coordinate, y_coordinate, is_accessible, is_landmark, keywords]
        );

        res.status(201).json({
            message: 'Room added successfully',
            room: result.rows[0],
        });
    } catch (err) {
        next(err);
    }
};

const updateRoom = async (req, res, next) => {
    try {
        const { id } = req.params;
        const {
            name, type, room_number, description,
            x_coordinate, y_coordinate, is_accessible, is_landmark, keywords
        } = req.body;

        const result = await query(
            `UPDATE rooms
             SET name = COALESCE($1, name),
                 type = COALESCE($2, type),
                 room_number = COALESCE($3, room_number),
                 description = COALESCE($4, description),
                 x_coordinate = COALESCE($5, x_coordinate),
                 y_coordinate = COALESCE($6, y_coordinate),
                 is_accessible = COALESCE($7, is_accessible),
                 is_landmark = COALESCE($8, is_landmark),
                 keywords = COALESCE($9, keywords),
                 updated_at = NOW()
             WHERE id = $10
             RETURNING *`,
            [name, type, room_number, description, x_coordinate, y_coordinate, is_accessible, is_landmark, keywords, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Room not found' });
        }

        res.json({
            message: 'Room updated successfully',
            room: result.rows[0],
        });
    } catch (err) {
        next(err);
    }
};

const deleteRoom = async (req, res, next) => {
    try {
        const { id } = req.params;

        // Delete connections first (CASCADE should handle this, but explicit is safer)
        await query(
            `DELETE FROM connections WHERE from_room = $1 OR to_room = $1`,
            [id]
        );

        const result = await query(
            `DELETE FROM rooms WHERE id = $1 RETURNING name`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Room not found' });
        }

        res.json({
            message: 'Room and its connections deleted successfully',
            roomName: result.rows[0].name,
        });
    } catch (err) {
        next(err);
    }
};

const addConnection = async (req, res, next) => {
    try {
        const { from_room, to_room, distance, is_bidirectional, is_accessible, notes } = req.body;

        if (!from_room || !to_room || !distance) {
            return res.status(400).json({ error: 'from_room, to_room, and distance are required' });
        }

        if (from_room === to_room) {
            return res.status(400).json({ error: 'Cannot connect room to itself' });
        }

        const result = await query(
            `INSERT INTO connections (from_room, to_room, distance, is_bidirectional, is_accessible, notes)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [from_room, to_room, distance, is_bidirectional ?? true, is_accessible ?? true, notes]
        );

        res.status(201).json({
            message: 'Connection added successfully',
            connection: result.rows[0],
        });
    } catch (err) {
        next(err);
    }
};

const deleteConnection = async (req, res, next) => {
    try {
        const { id } = req.params;

        const result = await query(
            `DELETE FROM connections WHERE id = $1 RETURNING *`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Connection not found' });
        }

        res.json({
            message: 'Connection deleted successfully',
        });
    } catch (err) {
        next(err);
    }
};

const getNavigationData = async (req, res, next) => {
    try {
        const { building_id } = req.query;

        // Get all rooms for a building
        const roomsResult = await query(
            `SELECT r.*, f.floor_number, f.name as floor_name, b.name as building_name
             FROM rooms r
             JOIN floors f ON r.floor_id = f.id
             JOIN buildings b ON f.building_id = b.id
             ${building_id ? 'WHERE b.id = $1' : ''}
             ORDER BY f.floor_number, r.name`,
            building_id ? [building_id] : []
        );

        // Get all connections
        const connectionsResult = await query(
            `SELECT c.*, 
                    r1.name as from_room_name,
                    r2.name as to_room_name
             FROM connections c
             JOIN rooms r1 ON c.from_room = r1.id
             JOIN rooms r2 ON c.to_room = r2.id
             ${building_id ? 
               'WHERE r1.floor_id IN (SELECT id FROM floors WHERE building_id = $1)' : ''}
             ORDER BY c.created_at DESC`,
            building_id ? [building_id] : []
        );

        res.json({
            rooms: roomsResult.rows,
            connections: connectionsResult.rows,
        });
    } catch (err) {
        next(err);
    }
};

// ═══════════════════════════════════════════════════════════
// BUILDING MANAGEMENT
// ═══════════════════════════════════════════════════════════

const addBuilding = async (req, res, next) => {
    try {
        const { project_id, name, campus, description, address, lat, lng, total_floors, image_url } = req.body;

        if (!name || !lat || !lng) {
            return res.status(400).json({ error: 'name, lat, and lng are required' });
        }

        const result = await query(
            `INSERT INTO buildings (project_id, name, campus, description, address, location, total_floors, image_url)
             VALUES ($1, $2, $3, $4, $5, ST_MakePoint($6, $7)::geography, $8, $9)
             RETURNING *,
                       ST_X(location::geometry) AS lng,
                       ST_Y(location::geometry) AS lat`,
            [project_id, name, campus, description, address, lng, lat, total_floors || 1, image_url]
        );

        res.status(201).json({
            message: 'Building added successfully',
            building: result.rows[0],
        });
    } catch (err) {
        next(err);
    }
};

const addFloor = async (req, res, next) => {
    try {
        const { building_id, floor_number, name, description, map_image_url } = req.body;

        if (!building_id || floor_number === undefined) {
            return res.status(400).json({ error: 'building_id and floor_number are required' });
        }

        const result = await query(
            `INSERT INTO floors (building_id, floor_number, name, description, map_image_url)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [building_id, floor_number, name, description, map_image_url]
        );

        res.status(201).json({
            message: 'Floor added successfully',
            floor: result.rows[0],
        });
    } catch (err) {
        if (err.code === '23505') { // Unique violation
            return res.status(400).json({ error: 'Floor already exists for this building' });
        }
        next(err);
    }
};

// ═══════════════════════════════════════════════════════════
// BLUEPRINT AI SCANNING
// ═══════════════════════════════════════════════════════════

const scanBlueprint = async (req, res, next) => {
    try {
        console.log("[Blueprint Scan] Request received");
        const { building_id, floor_id } = req.body;
        console.log(`[Blueprint Scan] Floor ID: ${floor_id}`);
        
        if (!floor_id) {
            console.error("[Blueprint Scan] Missing floor_id");
            return res.status(400).json({ error: 'floor_id is required' });
        }
        
        if (!req.file) {
            console.error("[Blueprint Scan] No file received");
            return res.status(400).json({ error: 'Blueprint image is required' });
        }

        console.log(`[Blueprint Scan] File size: ${req.file.size} bytes`);

        // Convert file buffer to required Gemini inlineData format
        const image = {
            inlineData: {
                data: req.file.buffer.toString("base64"),
                mimeType: req.file.mimetype,
            },
        };

        const prompt = `You are an expert spatial analyst. Analyze this floor plan and extract the layout into a JSON format representing a graph of rooms and their connections. 
Estimate distances between connected rooms based on standard door frames or walkways if a scale isn't clear.
Respond ONLY with a valid JSON block structured EXACTLY like this:
{
  "rooms": [
    { "id": "room_1", "name": "Main Entrance", "type": "entrance" }
  ],
  "connections": [
    { "source": "room_1", "target": "room_2", "distance": 5 }
  ]
}
Make sure "type" is strictly one of: entrance, exit, elevator, stairs, escalator, office, department, classroom, lab, auditorium, restroom, cafeteria, shop, atm, parking, emergency, medical, reception, waiting, pharmacy, laboratory, ward, icu, surgery, radiology, corridor, room. Defaults to "room".`;

        console.log("[Blueprint Scan] Initializing Gemini with Multi-Model Fallback...");
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.error("[Blueprint Scan] GEMINI_API_KEY is missing from .env");
            return res.status(500).json({ error: 'Gemini API key is not configured on the server. Please check .env file.' });
        }
        
        const genAI = new GoogleGenerativeAI(apiKey);
        const modelsToTry = [
            'gemini-2.0-flash', 
            'gemini-2.5-flash', 
            'gemini-3.1-flash',
            'gemini-1.5-flash', 
            'gemini-1.5-flash-latest', 
            'gemini-1.5-pro'
        ];
        
        let result = null;
        let lastError = null;
        let modelUsed = "";

        for (const modelName of modelsToTry) {
            try {
                console.log(`[Blueprint Scan] Attempting with model: ${modelName}...`);
                const model = genAI.getGenerativeModel({ model: modelName });
                result = await model.generateContent([prompt, image]);
                modelUsed = modelName;
                console.log(`[Blueprint Scan] Success using ${modelName}!`);
                break; 
            } catch (err) {
                console.warn(`[Blueprint Scan] Model ${modelName} failed:`, err.message);
                lastError = err;
            }
        }

        if (!result) {
            console.error("[Blueprint Scan] All Gemini models failed.");
            throw lastError || new Error("All models failed.");
        }

        const responseText = result.response.text();
        const jsonString = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
        const blueprintData = JSON.parse(jsonString);
        console.log(`[Blueprint Scan] Parsed ${blueprintData.rooms.length} rooms`);
        
        // Transaction to insert
        const client = await getClient();
        try {
            await client.query('BEGIN');
            
            // We need a map to store the new UUIDs of inserted rooms
            const roomIdMap = {}; 
            
            // Allowed types from the enum (for validation)
            const allowedTypes = [
                'entrance', 'exit', 'elevator', 'stairs', 'escalator',
                'office', 'department', 'classroom', 'lab', 'auditorium', 
                'restroom', 'cafeteria', 'shop', 'atm', 'parking', 
                'emergency', 'medical', 'reception', 'waiting', 
                'pharmacy', 'laboratory', 'ward', 'icu', 'surgery', 
                'radiology', 'corridor', 'room', 'other'
            ];
            
            for (const room of blueprintData.rooms) {
                // Ensure the type is valid for the PostgreSQL ENUM
                const validatedType = allowedTypes.includes(room.type?.toLowerCase()) 
                    ? room.type.toLowerCase() 
                    : 'room';

                const insertRes = await client.query(
                    `INSERT INTO rooms (floor_id, name, type)
                     VALUES ($1, $2, $3)
                     RETURNING id`,
                    [floor_id, room.name || 'Unnamed Room', validatedType]
                );
                roomIdMap[room.id] = insertRes.rows[0].id;
            }
            
            let connectionsAdded = 0;
            if (blueprintData.connections && Array.isArray(blueprintData.connections)) {
                for (const conn of blueprintData.connections) {
                    const fromId = roomIdMap[conn.source];
                    const toId = roomIdMap[conn.target];
                    
                    if (fromId && toId && fromId !== toId) {
                        await client.query(
                            `INSERT INTO connections (from_room, to_room, distance, is_bidirectional, is_accessible)
                             VALUES ($1, $2, $3, true, true)`,
                            [fromId, toId, conn.distance || 5]
                        );
                        connectionsAdded++;
                    }
                }
            }
            
            await client.query('COMMIT');
            console.log("[Blueprint Scan] Database transaction committed successfully");
            res.status(201).json({ 
                success: true, 
                message: `Successfully scanned blueprint: added ${blueprintData.rooms.length} rooms and ${connectionsAdded} connections.`
            });
            
        } catch (dbErr) {
            console.error("[Blueprint Scan] DB Transaction Error:", dbErr);
            await client.query('ROLLBACK');
            throw dbErr;
        } finally {
            client.release();
        }
        
    } catch (err) {
        console.error("Blueprint Scan Final Catch Error:", err);
        
        if (err.message && err.message.includes('404')) {
            return res.status(404).json({ error: 'Gemini model not found. This can happen if your API key does not have access to gemini-1.5-flash in your region.' });
        }

        if (err instanceof SyntaxError) {
            return res.status(400).json({ error: 'LLM returned malformed JSON.' });
        }
        next(err);
    }
};

// ═══════════════════════════════════════════════════════════
// USER MANAGEMENT
// ═══════════════════════════════════════════════════════════

const getAllUsers = async (req, res, next) => {
    try {
        const { limit = 100, offset = 0 } = req.query;
        
        const result = await query(
            `SELECT id, name, phone, google_id, is_guest, role, civic_level, civic_points, created_at
             FROM users
             ORDER BY created_at DESC
             LIMIT $1 OFFSET $2`,
            [parseInt(limit), parseInt(offset)]
        );
        
        const countResult = await query(`SELECT COUNT(*) as total FROM users`);
        
        res.json({
            users: result.rows,
            pagination: {
                total: parseInt(countResult.rows[0].total),
                limit: parseInt(limit),
                offset: parseInt(offset),
            },
        });
    } catch (err) {
        next(err);
    }
};

const updateUserRole = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { role } = req.body;
        
        const validRoles = ['user', 'admin'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({ error: 'Invalid role' });
        }
        
        const result = await query(
            `UPDATE users SET role = $1, updated_at = NOW()
             WHERE id = $2
             RETURNING id, name, phone, role`,
            [role, id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json({
            message: 'User role updated successfully',
            user: result.rows[0],
        });
    } catch (err) {
        next(err);
    }
};

// ═══════════════════════════════════════════════════════════
// INCIDENT MANAGEMENT (Admin)
// ═══════════════════════════════════════════════════════════

/**
 * GET /api/admin/incidents — all incidents (active and inactive)
 */
const getAllIncidents = async (req, res, next) => {
    try {
        const { building_id } = req.query;
        let sql = `
            SELECT ni.*, r.name AS room_name, r.type AS room_type
            FROM navigation_incidents ni
            LEFT JOIN rooms r ON ni.room_id = r.id
        `;
        const params = [];
        if (building_id) {
            sql += `
                WHERE (ni.room_id IS NULL OR ni.room_id IN (
                    SELECT r2.id FROM rooms r2
                    JOIN floors f ON r2.floor_id = f.id
                    WHERE f.building_id = $1
                ))
            `;
            params.push(building_id);
        }
        sql += ' ORDER BY ni.created_at DESC';
        const result = await query(sql, params);
        res.json({ success: true, data: result.rows });
    } catch (err) { next(err); }
};

/**
 * POST /api/admin/incidents — create a new incident
 */
const createIncidentAdmin = async (req, res, next) => {
    try {
        const { type, room_id, connection_id, message, severity } = req.body;
        if (!type || !message) {
            return res.status(400).json({ error: 'type and message are required' });
        }
        const incident = await incidentService.createIncident({
            type, roomId: room_id || null, connectionId: connection_id || null, message, severity
        });
        res.status(201).json({ success: true, data: incident });
    } catch (err) { next(err); }
};

/**
 * PUT /api/admin/incidents/:id — update incident fields
 */
const updateIncident = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { type, message, severity, room_id, connection_id } = req.body;
        const result = await query(
            `UPDATE navigation_incidents
             SET type            = COALESCE($1, type),
                 message         = COALESCE($2, message),
                 severity        = COALESCE($3, severity),
                 room_id         = COALESCE($4, room_id),
                 connection_id   = COALESCE($5, connection_id)
             WHERE id = $6
             RETURNING *`,
            [type, message, severity, room_id, connection_id, id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Incident not found' });
        incidentService.invalidateCache();
        res.json({ success: true, data: result.rows[0] });
    } catch (err) { next(err); }
};

/**
 * PATCH /api/admin/incidents/:id/active — toggle is_active
 */
const toggleIncidentActive = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { is_active } = req.body; // true or false
        const result = await query(
            `UPDATE navigation_incidents SET is_active = $1 WHERE id = $2 RETURNING *`,
            [is_active !== undefined ? is_active : true, id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Incident not found' });
        incidentService.invalidateCache();
        res.json({ success: true, data: result.rows[0] });
    } catch (err) { next(err); }
};

/**
 * DELETE /api/admin/incidents/:id — permanently delete an incident
 */
const deleteIncident = async (req, res, next) => {
    try {
        const { id } = req.params;
        const result = await query(`DELETE FROM navigation_incidents WHERE id = $1 RETURNING id`, [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Incident not found' });
        incidentService.invalidateCache();
        res.json({ success: true, message: 'Incident deleted' });
    } catch (err) { next(err); }
};

module.exports = {
    // Dashboard
    getDashboardStats,
    
    // Feedback Management
    getAllFeedback,
    updateFeedbackStatus,
    deleteFeedback,
    getFeedbackAnalytics,
    
    // Indoor Navigation
    addRoom,
    updateRoom,
    deleteRoom,
    addConnection,
    deleteConnection,
    getNavigationData,
    addBuilding,
    addFloor,
    scanBlueprint,
    
    // User Management
    getAllUsers,
    updateUserRole,

    // Incident Management
    getAllIncidents,
    createIncidentAdmin,
    updateIncident,
    toggleIncidentActive,
    deleteIncident,
};
