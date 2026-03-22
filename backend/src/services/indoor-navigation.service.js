/**
 * src/services/indoor-navigation.service.js
 * Indoor navigation pathfinding using Dijkstra's algorithm
 */
const { query } = require('../config/db');

/**
 * Dijkstra's shortest path algorithm
 * @param {Object} graph - Adjacency list representation
 * @param {string} startId - Starting room ID
 * @param {string} endId - Destination room ID
 * @param {boolean} accessibleOnly - Only use wheelchair-accessible routes
 * @returns {Object} { path: [roomIds], distance: number, steps: [directions] }
 */
function dijkstra(graph, startId, endId, accessibleOnly = false) {
    const distances = {};
    const previous = {};
    const unvisited = new Set();

    // Initialize
    for (const nodeId in graph) {
        distances[nodeId] = Infinity;
        previous[nodeId] = null;
        unvisited.add(nodeId);
    }
    distances[startId] = 0;

    while (unvisited.size > 0) {
        // Find unvisited node with minimum distance
        let currentId = null;
        let minDist = Infinity;

        for (const nodeId of unvisited) {
            if (distances[nodeId] < minDist) {
                minDist = distances[nodeId];
                currentId = nodeId;
            }
        }

        // If no reachable nodes left or reached destination
        if (currentId === null || distances[currentId] === Infinity) {
            break;
        }

        if (currentId === endId) {
            break;
        }

        unvisited.delete(currentId);

        // Update distances to neighbors
        const neighbors = graph[currentId] || [];
        for (const neighbor of neighbors) {
            if (!unvisited.has(neighbor.id)) continue;

            // Skip non-accessible routes if accessibility required
            if (accessibleOnly && !neighbor.accessible) continue;

            const altDistance = distances[currentId] + neighbor.distance;
            if (altDistance < distances[neighbor.id]) {
                distances[neighbor.id] = altDistance;
                previous[neighbor.id] = currentId;
            }
        }
    }

    // Reconstruct path
    const path = [];
    let current = endId;

    while (current !== null) {
        path.unshift(current);
        current = previous[current];
    }

    // If path doesn't start with startId, no path found
    if (path[0] !== startId) {
        return { path: [], distance: Infinity, found: false };
    }

    return {
        path,
        distance: distances[endId],
        found: true,
    };
}

/**
 * Build graph from database connections
 */
async function buildGraph(accessibleOnly = false) {
    const graph = {};

    // Fetch all connections
    const result = await query(
        `SELECT c.from_room, c.to_room, c.distance, c.is_bidirectional, c.is_accessible
         FROM connections c`
    );

    for (const conn of result.rows) {
        const fromId = conn.from_room;
        const toId = conn.to_room;
        const distance = parseFloat(conn.distance);
        const accessible = conn.is_accessible;

        // Initialize adjacency lists
        if (!graph[fromId]) graph[fromId] = [];
        if (!graph[toId]) graph[toId] = [];

        // Add forward edge
        if (!accessibleOnly || accessible) {
            graph[fromId].push({ id: toId, distance, accessible });
        }

        // Add backward edge if bidirectional
        if (conn.is_bidirectional) {
            if (!accessibleOnly || accessible) {
                graph[toId].push({ id: fromId, distance, accessible });
            }
        }
    }

    return graph;
}

/**
 * Get room details by ID
 */
async function getRoomDetails(roomId) {
    const result = await query(
        `SELECT r.*, f.floor_number, f.name AS floor_name, 
                b.id AS building_id, b.name AS building_name
         FROM rooms r
         JOIN floors f ON r.floor_id = f.id
         JOIN buildings b ON f.building_id = b.id
         WHERE r.id = $1`,
        [roomId]
    );

    return result.rows[0] || null;
}

/**
 * Generate turn-by-turn directions
 */
async function generateDirections(path) {
    if (path.length === 0) return [];

    const directions = [];

    for (let i = 0; i < path.length; i++) {
        const room = await getRoomDetails(path[i]);
        if (!room) continue;

        let instruction = '';

        if (i === 0) {
            instruction = `Start at ${room.name} (Floor ${room.floor_number})`;
        } else if (i === path.length - 1) {
            instruction = `Arrive at ${room.name} (Floor ${room.floor_number})`;
        } else {
            // Check for floor changes
            const prevRoom = await getRoomDetails(path[i - 1]);

            if (prevRoom && prevRoom.floor_number !== room.floor_number) {
                if (room.type === 'elevator') {
                    instruction = `Take elevator to Floor ${room.floor_number}`;
                } else if (room.type === 'stairs') {
                    instruction = `Take stairs to Floor ${room.floor_number}`;
                } else {
                    instruction = `Proceed to Floor ${room.floor_number} using ${room.name}`;
                }
            } else {
                if (room.type === 'elevator' || room.type === 'stairs') {
                    instruction = `Proceed to ${room.name}`;
                } else {
                    instruction = `Continue to ${room.name}`;
                }
            }
        }

        directions.push({
            step: i + 1,
            roomId: room.id,
            roomName: room.name,
            roomType: room.type,
            floorNumber: room.floor_number,
            instruction,
        });
    }

    return directions;
}

/**
 * Find route between two rooms
 */
async function findRoute(fromRoomId, toRoomId, options = {}) {
    const { accessibleOnly = false } = options;

    // Validate rooms exist
    const fromRoom = await getRoomDetails(fromRoomId);
    const toRoom = await getRoomDetails(toRoomId);

    if (!fromRoom) {
        throw new Error('Starting room not found');
    }
    if (!toRoom) {
        throw new Error('Destination room not found');
    }

    // Check if rooms are in the same building
    if (fromRoom.building_id !== toRoom.building_id) {
        throw new Error('Rooms are in different buildings. Indoor navigation only works within a single building.');
    }

    // Build graph
    const graph = await buildGraph(accessibleOnly);

    // Run Dijkstra
    const result = dijkstra(graph, fromRoomId, toRoomId, accessibleOnly);

    if (!result.found || result.distance === Infinity) {
        return {
            found: false,
            message: accessibleOnly
                ? 'No accessible route found. Try without accessibility filter.'
                : 'No route found between these locations.',
        };
    }

    // Generate turn-by-turn directions
    const directions = await generateDirections(result.path);

    return {
        found: true,
        distance: result.distance,
        path: result.path,
        directions,
        from: {
            id: fromRoom.id,
            name: fromRoom.name,
            floor: fromRoom.floor_number,
        },
        to: {
            id: toRoom.id,
            name: toRoom.name,
            floor: toRoom.floor_number,
        },
        buildingId: fromRoom.building_id,
        buildingName: fromRoom.building_name,
    };
}

/**
 * Search rooms by name or keywords
 */
async function searchRooms(searchTerm, buildingId = null) {
    let sql = `
        SELECT r.id, r.name, r.type, r.room_number, r.keywords,
               f.floor_number, f.name AS floor_name,
               b.id AS building_id, b.name AS building_name
        FROM rooms r
        JOIN floors f ON r.floor_id = f.id
        JOIN buildings b ON f.building_id = b.id
        WHERE (
            LOWER(r.name) LIKE LOWER($1)
            OR EXISTS (
                SELECT 1 FROM unnest(r.keywords) k 
                WHERE LOWER(k) LIKE LOWER($1)
            )
        )
    `;

    const params = [`%${searchTerm}%`];

    if (buildingId) {
        sql += ` AND b.id = $2`;
        params.push(buildingId);
    }

    sql += ` ORDER BY r.is_landmark DESC, r.name LIMIT 20`;

    const result = await query(sql, params);
    return result.rows;
}

/**
 * Get all buildings with indoor navigation
 */
async function getBuildings() {
    const result = await query(
        `SELECT b.*, p.name AS project_name, p.category AS project_category,
                ST_X(b.location::geometry) AS lng,
                ST_Y(b.location::geometry) AS lat,
                COUNT(DISTINCT f.id) AS floor_count,
                COUNT(DISTINCT r.id) AS room_count
         FROM buildings b
         LEFT JOIN projects p ON b.project_id = p.id
         LEFT JOIN floors f ON f.building_id = b.id
         LEFT JOIN rooms r ON r.floor_id = f.id
         GROUP BY b.id, p.name, p.category
         ORDER BY b.created_at DESC`
    );

    return result.rows;
}

/**
 * Get building details with floors
 */
async function getBuildingById(buildingId) {
    const buildingResult = await query(
        `SELECT b.*, p.name AS project_name, p.id AS project_id,
                ST_X(b.location::geometry) AS lng,
                ST_Y(b.location::geometry) AS lat
         FROM buildings b
         LEFT JOIN projects p ON b.project_id = p.id
         WHERE b.id = $1`,
        [buildingId]
    );

    if (buildingResult.rows.length === 0) {
        return null;
    }

    const building = buildingResult.rows[0];

    // Get floors
    const floorsResult = await query(
        `SELECT f.*, COUNT(r.id) AS room_count
         FROM floors f
         LEFT JOIN rooms r ON r.floor_id = f.id
         WHERE f.building_id = $1
         GROUP BY f.id
         ORDER BY f.floor_number`,
        [buildingId]
    );

    building.floors = floorsResult.rows;

    return building;
}

/**
 * Get floor details with rooms
 */
async function getFloorById(floorId) {
    const floorResult = await query(
        `SELECT f.*, b.id AS building_id, b.name AS building_name
         FROM floors f
         JOIN buildings b ON f.building_id = b.id
         WHERE f.id = $1`,
        [floorId]
    );

    if (floorResult.rows.length === 0) {
        return null;
    }

    const floor = floorResult.rows[0];

    // Get rooms
    const roomsResult = await query(
        `SELECT * FROM rooms WHERE floor_id = $1 ORDER BY name`,
        [floorId]
    );

    floor.rooms = roomsResult.rows;

    return floor;
}

module.exports = {
    findRoute,
    searchRooms,
    getBuildings,
    getBuildingById,
    getFloorById,
    getRoomDetails,
    generateDirections,
    dijkstra,
};
