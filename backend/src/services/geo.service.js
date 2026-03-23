/**
 * src/services/geo.service.js
 * PostGIS geospatial query helpers
 */
const { query } = require('../config/db');

/**
 * Get projects sorted by distance from user location
 * @param {number} lat
 * @param {number} lng
 * @param {number} limit
 */
const getProjectsSortedByDistance = async (lat, lng, limit = 50) => {
    const result = await query(
        `SELECT
            p.id,
            p.name,
            p.category,
            p.status,
            p.progress_percentage  AS progress,
            p.area,
            p.district,
            p.budget_display       AS budget,
            p.completion_display   AS "expectedCompletion",
            p.image_url            AS image,
            p.geofence_radius,
            p.last_updated,
            d.name                 AS department,
            c.name                 AS contractor,
            ST_X(p.location::geometry) AS lng,
            ST_Y(p.location::geometry) AS lat,
            ROUND(
                ST_Distance(
                    p.location::geography,
                    ST_MakePoint($2, $1)::geography
                )::numeric, 0
            ) AS distance_m
         FROM projects p
         LEFT JOIN departments d ON d.id = p.department_id
         LEFT JOIN contractors  c ON c.id = p.contractor_id
         ORDER BY distance_m ASC
         LIMIT $3`,
        [lat, lng, limit]
    );
    return result.rows;
};

/**
 * Get projects within a radius (meters) using PostGIS ST_DWithin
 */
const getProjectsNearby = async (lat, lng, radiusMeters = 5000) => {
    const result = await query(
        `SELECT
            p.id,
            p.name,
            p.category,
            p.status,
            p.progress_percentage  AS progress,
            p.area,
            p.district,
            p.budget_display       AS budget,
            p.completion_display   AS "expectedCompletion",
            p.image_url            AS image,
            p.geofence_radius,
            d.name                 AS department,
            c.name                 AS contractor,
            ST_X(p.location::geometry) AS lng,
            ST_Y(p.location::geometry) AS lat,
            ROUND(
                ST_Distance(
                    p.location::geography,
                    ST_MakePoint($2, $1)::geography
                )::numeric, 0
            ) AS distance_m
         FROM projects p
         LEFT JOIN departments d ON d.id = p.department_id
         LEFT JOIN contractors  c ON c.id = p.contractor_id
         WHERE ST_DWithin(
             p.location::geography,
             ST_MakePoint($2, $1)::geography,
             $3
         )
         ORDER BY distance_m ASC`,
        [lat, lng, radiusMeters]
    );
    return result.rows;
};

/**
 * Get projects within each user's geofence radius.
 * Used by the background job: returns (user_id, project_id) pairs
 * for users who have a stored location.
 */
const getUsersNearProjectGeofences = async () => {
    const result = await query(
        `SELECT
            ul.user_id,
            p.id           AS project_id,
            p.name         AS project_name,
            p.status,
            p.geofence_radius,
            ROUND(
                ST_Distance(ul.location::geography, p.location::geography)::numeric, 0
            ) AS distance_m
         FROM user_locations ul
         JOIN projects p ON ST_DWithin(ul.location::geography, p.location::geography, p.geofence_radius)
         WHERE ul.location IS NOT NULL`,
    );
    return result.rows;
};

/**
 * Get projects within a specific user's stored geofence radius.
 */
const getProjectsNearUser = async (userId) => {
    const result = await query(
        `SELECT
            ul.user_id,
            p.id           AS project_id,
            p.name         AS project_name,
            p.status,
            p.geofence_radius,
            ROUND(
                ST_Distance(ul.location::geography, p.location::geography)::numeric, 0
            ) AS distance_m
         FROM user_locations ul
         JOIN projects p ON ST_DWithin(ul.location::geography, p.location::geography, p.geofence_radius)
         WHERE ul.user_id = $1`,
        [userId]
    );
    return result.rows;
};

/**
 * Update a user's stored location (for geo-fence detection)
 */
const updateUserLocation = async (userId, lat, lng) => {
    await query(
        `INSERT INTO user_locations (user_id, location, updated_at)
         VALUES ($1, ST_MakePoint($3, $2)::geography, NOW())
         ON CONFLICT (user_id)
         DO UPDATE SET location = EXCLUDED.location, updated_at = NOW()`,
        [userId, lat, lng]
    );
};

module.exports = {
    getProjectsSortedByDistance,
    getProjectsNearby,
    getUsersNearProjectGeofences,
    getProjectsNearUser,
    updateUserLocation,
};
