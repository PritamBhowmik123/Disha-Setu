/**
 * src/controllers/feedback.controller.js
 */
const { query } = require('../config/db');
const { generateTicketId } = require('../utils/ticketId');
const { uploadToCloud } = require('../utils/cloudStorage');
const { createNotification } = require('../services/notifications.service');

// ── POST /api/feedback ─────────────────────────────────────────
const submitFeedback = async (req, res, next) => {
    try {
        const { project_id, category, description } = req.body;
        const userId = req.user?.id || null;

        if (!project_id || !category || !description) {
            return res.status(400).json({ error: 'project_id, category, and description are required' });
        }
        if (description.trim().length < 10) {
            return res.status(400).json({ error: 'Description must be at least 10 characters' });
        }

        const validCategories = ['delay', 'safety', 'noise', 'traffic', 'corruption', 'other'];
        if (!validCategories.includes(category)) {
            return res.status(400).json({ error: 'Invalid category' });
        }

        // Handle optional photo upload
        let photoUrl = null;
        if (req.file) {
            try {
                photoUrl = await uploadToCloud(req.file.buffer, 'dishasetu/feedback');
            } catch (uploadErr) {
                console.error('[Upload] Cloudinary error:', uploadErr.message);
                // Don't fail the whole request — just skip photo
            }
        }

        const ticketId = generateTicketId();

        // Ensure ticket ID uniqueness (retry once on collision)
        let finalTicketId = ticketId;
        try {
            const result = await query(
                `INSERT INTO feedback_reports
                    (ticket_id, user_id, project_id, category, description, photo_url)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 RETURNING id, ticket_id, status, created_at`,
                [finalTicketId, userId, project_id, category, description.trim(), photoUrl]
            );

            const report = result.rows[0];

            // Log user activity
            if (userId) {
                await query(
                    `INSERT INTO user_activity (user_id, project_id, type, metadata)
                     VALUES ($1, $2, 'feedback', $3)`,
                    [userId, project_id, JSON.stringify({ ticket_id: finalTicketId })]
                );

                // Add civic points
                await query(
                    `UPDATE users SET civic_points = civic_points + 10 WHERE id = $1`,
                    [userId]
                );
            }

            res.status(201).json({
                message: 'Feedback submitted successfully',
                ticketId: report.ticket_id,
                status: report.status,
                id: report.id,
            });
        } catch (dbErr) {
            if (dbErr.code === '23505') {
                // Duplicate ticket ID — retry with a new one
                finalTicketId = generateTicketId() + '-' + Date.now().toString(36);
                await query(
                    `INSERT INTO feedback_reports
                        (ticket_id, user_id, project_id, category, description, photo_url)
                     VALUES ($1, $2, $3, $4, $5, $6)`,
                    [finalTicketId, userId, project_id, category, description.trim(), photoUrl]
                );
                return res.status(201).json({ message: 'Feedback submitted', ticketId: finalTicketId });
            }
            throw dbErr;
        }
    } catch (err) {
        next(err);
    }
};

// ── GET /api/feedback/user ─────────────────────────────────────
const getUserFeedback = async (req, res, next) => {
    try {
        const result = await query(
            `SELECT
                fr.id, fr.ticket_id, fr.project_id, fr.category, fr.description,
                fr.status, fr.photo_url, fr.created_at, fr.updated_at,
                p.name AS project_name, p.area AS project_area
             FROM feedback_reports fr
             LEFT JOIN projects p ON p.id = fr.project_id
             WHERE fr.user_id = $1
             ORDER BY fr.created_at DESC`,
            [req.user.id]
        );

        res.json({ reports: result.rows });
    } catch (err) {
        next(err);
    }
};

// ── GET /api/feedback/:ticketId ────────────────────────────────
const getFeedbackByTicket = async (req, res, next) => {
    try {
        const result = await query(
            `SELECT fr.*, p.name AS project_name
             FROM feedback_reports fr
             LEFT JOIN projects p ON p.id = fr.project_id
             WHERE fr.ticket_id = $1`,
            [req.params.ticketId]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Ticket not found' });
        }
        res.json({ report: result.rows[0] });
    } catch (err) {
        next(err);
    }
};

module.exports = { submitFeedback, getUserFeedback, getFeedbackByTicket };