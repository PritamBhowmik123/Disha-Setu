/**
 * src/controllers/locations.controller.js
 *
 * GET /api/locations
 * Returns distinct project locations derived from live project data.
 * Used by the frontend "Test Location / Preset Areas" picker.
 *
 * Strategy:
 *  - GROUP BY LOWER(area), LOWER(district) to collapse case variants
 *  - Return AVG(lat/lng) when multiple projects share the same area
 *  - Exclude rows where the PostGIS location column is NULL
 *  - Results ordered alphabetically by district, then area
 */
const { query } = require('../config/db');

const getLocations = async (req, res, next) => {
    try {
        const result = await query(
            `SELECT
                MIN(p.area)                                         AS name,
                ROUND(AVG(ST_Y(p.location::geometry))::numeric, 6) AS lat,
                ROUND(AVG(ST_X(p.location::geometry))::numeric, 6) AS lng,
                COUNT(*)                                            AS project_count
             FROM projects p
             WHERE p.location IS NOT NULL
               AND p.area     IS NOT NULL
             GROUP BY LOWER(p.area)
             ORDER BY MIN(p.area) ASC`
        );

        const locations = result.rows.map(row => ({
            name:         row.name,
            district:     row.name,
            lat:          parseFloat(row.lat),
            lng:          parseFloat(row.lng),
            projectCount: parseInt(row.project_count, 10),
            desc:         `${row.project_count} project${row.project_count !== '1' ? 's' : ''}`,
        }));

        res.json({ locations });
    } catch (err) {
        next(err);
    }
};

module.exports = { getLocations };
