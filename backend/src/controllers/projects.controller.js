/**
 * src/controllers/projects.controller.js
 */
const { query } = require('../config/db');
const geoService = require('../services/geo.service');

// ── GET /api/projects ──────────────────────────────────────────
// Returns all projects, optionally sorted by distance if lat/lng provided
const getProjects = async (req, res, next) => {
    try {
        const { lat, lng, limit = 50, status, category } = req.query;

        if (lat && lng) {
            const projects = await geoService.getProjectsSortedByDistance(
                parseFloat(lat), parseFloat(lng), parseInt(limit)
            );
            return res.json({ projects });
        }

        // No location — paginated list with optional filters
        const conditions = [];
        const params = [];
        let idx = 1;

        if (status) { conditions.push(`p.status = $${idx++}`); params.push(status); }
        if (category) { conditions.push(`p.category = $${idx++}`); params.push(category); }
        params.push(parseInt(limit));

        const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
        const result = await query(
            `SELECT p.id, p.name, p.category, p.status,
                    p.progress_percentage AS progress, p.area, p.district,
                    p.budget_display AS budget, p.completion_display AS "expectedCompletion",
                    p.image_url AS image, p.last_updated,
                    d.name AS department, c.name AS contractor,
                    ST_X(p.location::geometry) AS lng,
                    ST_Y(p.location::geometry) AS lat
             FROM projects p
             LEFT JOIN departments d ON d.id = p.department_id
             LEFT JOIN contractors c ON c.id = p.contractor_id
             ${where}
             ORDER BY p.created_at DESC
             LIMIT $${idx}`,
            params
        );

        res.json({ projects: result.rows });
    } catch (err) {
        next(err);
    }
};

// ── GET /api/projects/nearby ────────────────────────────────────
const getNearbyProjects = async (req, res, next) => {
    try {
        const { lat, lng, radius = 5000 } = req.query;
        if (!lat || !lng) {
            return res.status(400).json({ error: 'lat and lng query params are required' });
        }

        const projects = await geoService.getProjectsNearby(
            parseFloat(lat), parseFloat(lng), parseInt(radius)
        );
        res.json({ projects });
    } catch (err) {
        next(err);
    }
};

// ── GET /api/projects/:id ────────────────────────────────────────
const getProjectById = async (req, res, next) => {
    try {
        const { id } = req.params;

        // Full project detail
        const projResult = await query(
            `SELECT
                p.*,
                d.name AS department,
                c.name AS contractor,
                ST_X(p.location::geometry) AS lng,
                ST_Y(p.location::geometry) AS lat
             FROM projects p
             LEFT JOIN departments d ON d.id = p.department_id
             LEFT JOIN contractors c ON c.id = p.contractor_id
             WHERE p.id = $1`,
            [id]
        );
        if (projResult.rows.length === 0) {
            return res.status(404).json({ error: 'Project not found' });
        }

        // Milestones
        const milestonesResult = await query(
            `SELECT id, title, completed, target_date AS date, sort_order
             FROM milestones WHERE project_id = $1 ORDER BY sort_order ASC`,
            [id]
        );

        // Latest 5 updates
        const updatesResult = await query(
            `SELECT id, title, body, update_type, old_status, new_status, created_at
             FROM project_updates WHERE project_id = $1 ORDER BY created_at DESC LIMIT 5`,
            [id]
        );

        const project = projResult.rows[0];
        project.milestones = milestonesResult.rows;
        project.recentUpdates = updatesResult.rows;

        res.json({ project });
    } catch (err) {
        next(err);
    }
};

// ── POST /api/projects/:id/location ─────────────────────────────
// Update calling user's location (for geo-fencing)
const updateUserLocation = async (req, res, next) => {
    try {
        const { lat, lng } = req.body;
        if (!lat || !lng) return res.status(400).json({ error: 'lat and lng required' });

        await geoService.updateUserLocation(req.user.id, parseFloat(lat), parseFloat(lng));
        res.json({ message: 'Location updated' });
    } catch (err) {
        next(err);
    }
};

// ── GET /api/projects/:id/feedback ──────────────────────────────
// Returns all public feedback reports for a project
const getProjectFeedback = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { page = 1, limit = 10 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        const result = await query(
            `SELECT
                fr.ticket_id, fr.category, fr.description, fr.photo_url,
                fr.status, fr.created_at,
                u.name AS user_name
             FROM feedback_reports fr
             LEFT JOIN users u ON u.id = fr.user_id
             WHERE fr.project_id = $1 AND fr.status != 'Rejected'
             ORDER BY fr.created_at DESC
             LIMIT $2 OFFSET $3`,
            [id, parseInt(limit), offset]
        );

        res.json({ feedback: result.rows });
    } catch (err) {
        next(err);
    }
};

module.exports = { getProjects, getNearbyProjects, getProjectById, updateUserLocation, getProjectFeedback };
