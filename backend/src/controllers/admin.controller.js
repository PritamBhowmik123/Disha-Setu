/**
 * src/controllers/admin.controller.js
 * Admin dashboard operations
 */
const { query, getClient } = require('../config/db');
const indoorNavService = require('../services/indoor-navigation.service');
const incidentService = require('../services/incident-routing.service');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const miroService = require('../services/miro.service');

// ═══════════════════════════════════════════════════════════
// DASHBOARD OVERVIEW
// ═══════════════════════════════════════════════════════════

/**
 * Automatically links rooms with the same name and vertical type (stairs, elevators)
 * across different floors within the same building.
 */
async function linkVerticalConnectors(buildingId) {
    console.log(`[Vertical Link] Linking connectors for building: ${buildingId}`);
    try {
        // Find all vertical rooms in this building
        const res = await query(`
            SELECT r.id, r.name, r.type, f.floor_number, f.id as floor_id
            FROM rooms r
            JOIN floors f ON r.floor_id = f.id
            WHERE f.building_id = $1 AND r.type IN ('stairs', 'elevator', 'escalator')
        `, [buildingId]);

        const verticalRooms = res.rows;
        if (verticalRooms.length < 2) return;

        // Group by name
        const grouped = {};
        verticalRooms.forEach(r => {
            const key = `${r.name.toLowerCase().trim()}_${r.type.toLowerCase().trim()}`;
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(r);
        });

        // Link rooms within each group (all-to-all across different floors)
        for (const key in grouped) {
            const rooms = grouped[key];
            if (rooms.length < 2) continue;

            for (let i = 0; i < rooms.length; i++) {
                for (let j = i + 1; j < rooms.length; j++) {
                    const r1 = rooms[i];
                    const r2 = rooms[j];

                    // Only link if on different floors
                    if (r1.floor_id !== r2.floor_id) {
                        // Create bidirectional connection
                        // Use 5m as default vertical distance (one floor height approx)
                        const distance = Math.abs(r1.floor_number - r2.floor_number) * 4; 

                        // Check if already exists to avoid duplicates
                        const exists = await query(`
                            SELECT 1 FROM connections 
                            WHERE (from_room = $1 AND to_room = $2)
                               OR (from_room = $2 AND to_room = $1)
                        `, [r1.id, r2.id]);

                        if (exists.rowCount === 0) {
                            console.log(`[Vertical Link] Linking ${r1.name} (F${r1.floor_number}) <-> ${r2.name} (F${r2.floor_number})`);
                            await query(`
                                INSERT INTO connections (from_room, to_room, distance, is_bidirectional, is_accessible)
                                VALUES ($1, $2, $3, true, true)
                            `, [r1.id, r2.id, distance]);
                        }
                    }
                }
            }
        }
    } catch (err) {
        console.error("[Vertical Link] Error linking connectors:", err);
    }
}

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
        
        if (!floor_id || !req.file) {
            return res.status(400).json({ error: 'floor_id and floor plan image are required' });
        }

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

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) return res.status(500).json({ error: 'Gemini API key not configured' });
        
        const genAI = new GoogleGenerativeAI(apiKey);
        const modelsToTry = ['gemini-2.5-flash', 'gemini-3.1-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
        
        let result = null;
        let lastError = null;

        for (const modelName of modelsToTry) {
            try {
                console.log(`[Blueprint Scan] Attempting with model: ${modelName}...`);
                const model = genAI.getGenerativeModel({ model: modelName });
                result = await model.generateContent([prompt, image]);
                console.log(`[Blueprint Scan] Success using ${modelName}!`);
                break; 
            } catch (err) {
                console.warn(`[Blueprint Scan] Model ${modelName} failed:`, err.message);
                lastError = err;
            }
        }

        if (!result) throw lastError || new Error("All Gemini models failed");

        const responseText = result.response.text();
        const jsonString = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
        const blueprintData = JSON.parse(jsonString);

        // 1. Get Floor details for naming
        const floorRes = await query(`
            SELECT f.name as floor_name, b.name as building_name 
            FROM floors f 
            JOIN buildings b ON f.building_id = b.id 
            WHERE f.id = $1`, 
            [floor_id]
        );
        const name = floorRes.rows[0] ? `${floorRes.rows[0].building_name} - ${floorRes.rows[0].floor_name}` : 'New Analysis';

        // 2. Create or Get Miro Board
        let boardId;
        const currentFloor = await query(`SELECT miro_board_id FROM floors WHERE id = $1`, [floor_id]);
        if (currentFloor.rows[0]?.miro_board_id) {
            boardId = currentFloor.rows[0].miro_board_id;
        } else {
            boardId = await miroService.createBoard(name);
            await query(`UPDATE floors SET miro_board_id = $1 WHERE id = $2`, [boardId, floor_id]);
        }

        // 3. Populate Miro Board
        const { boardUrl } = await miroService.populateBoard(boardId, blueprintData);
        res.status(200).json({ message: 'Blueprint analyzed and sent to Miro', miroBoardUrl: boardUrl });

    } catch (err) {
        console.error("Blueprint Scan Error:", err);
        next(err);
    }
};

const syncFromMiro = async (req, res, next) => {
    try {
        const { floor_id } = req.body;
        if (!floor_id) return res.status(400).json({ error: 'floor_id is required' });

        const floorResult = await query(`SELECT miro_board_id FROM floors WHERE id = $1`, [floor_id]);
        const boardId = floorResult.rows[0]?.miro_board_id;
        if (!boardId) return res.status(404).json({ error: 'No Miro board found for this floor' });

        console.log(`[Miro Sync] Syncing from board: ${boardId}`);
        const graph = await miroService.getBoardGraph(boardId);
        
        const client = await getClient();
        try {
            await client.query('BEGIN');
            // Delete old rooms for this floor (cascades to connections)
            await client.query(`DELETE FROM rooms WHERE floor_id = $1`, [floor_id]);

            const miroToDbId = {};
            const allowedTypes = ['entrance', 'exit', 'elevator', 'stairs', 'escalator', 'office', 'department', 'classroom', 'lab', 'auditorium', 'restroom', 'cafeteria', 'shop', 'atm', 'parking', 'emergency', 'medical', 'reception', 'waiting', 'pharmacy', 'laboratory', 'ward', 'icu', 'surgery', 'radiology', 'corridor', 'room', 'other'];

            for (const room of graph.rooms) {
                const validatedType = allowedTypes.includes(room.type?.toLowerCase()) ? room.type.toLowerCase() : 'room';
                const roomRes = await client.query(
                    `INSERT INTO rooms (floor_id, name, type) VALUES ($1, $2, $3) RETURNING id`, 
                    [floor_id, room.name, validatedType]
                );
                miroToDbId[room.id] = roomRes.rows[0].id;
            }

            for (const conn of graph.connections) {
                const fromId = miroToDbId[conn.source];
                const toId = miroToDbId[conn.target];
                if (fromId && toId) {
                    await client.query(
                        `INSERT INTO connections (from_room, to_room, distance, is_bidirectional, is_accessible) 
                         VALUES ($1, $2, $3, true, true)`, 
                        [fromId, toId, conn.distance || 5]
                    );
                }
            }

            await client.query(`UPDATE floors SET last_miro_sync = NOW() WHERE id = $1`, [floor_id]);
            await client.query('COMMIT');

            // 4. Automatically link vertical connectors (stairs/elevators) across floors in this building
            const floorInfo = await query(`SELECT building_id FROM floors WHERE id = $1`, [floor_id]);
            if (floorInfo.rows[0]) {
                await linkVerticalConnectors(floorInfo.rows[0].building_id);
            }

            console.log("[Blueprint Scan] Database transaction committed successfully");
            res.status(200).json({ 
                success: true, 
                message: `Successfully synced from Miro: added ${graph.rooms.length} rooms and ${graph.connections.length} connections.`
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
    syncFromMiro,
    
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
