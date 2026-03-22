/**
 * src/routes/feedback.routes.js
 */
const router = require('express').Router();
const { submitFeedback, getUserFeedback, getFeedbackByTicket } = require('../controllers/feedback.controller');
const { requireAuth, optionalAuth } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');
const aiImageCheck = require('../middleware/aiImageCheck.middleware');

// aiImageCheck runs after multer (buffer ready) but before the controller.
// It is a lightweight, additive guard — does not modify submitFeedback or upload behaviour.
router.post('/', optionalAuth, upload.single('photo'), aiImageCheck, submitFeedback);
router.get('/user', requireAuth, getUserFeedback);
router.get('/ticket/:ticketId', optionalAuth, getFeedbackByTicket);

module.exports = router;
