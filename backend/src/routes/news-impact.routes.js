const express = require('express');
const router = express.Router();
const newsImpactController = require('../controllers/news-impact.controller');

router.post('/news-impact', newsImpactController.extractNewsImpact);

module.exports = router;
