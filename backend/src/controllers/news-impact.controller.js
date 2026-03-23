const { getProjectNews } = require('../services/news-impact.service');

exports.extractNewsImpact = async (req, res) => {
    try {
        const { project } = req.body;
        const projectMetadata = project || { name: '', area: '', category: '' };

        const result = await getProjectNews(projectMetadata.name, projectMetadata.area, projectMetadata.category);

        // Ensure we explicitly return the `{ articles: [], insights: [] }` format strictly matching the spec
        res.status(200).json(result);
    } catch (err) {
        console.error('[NewsImpact Controller] Error:', err);
        res.status(500).json({ error: 'Failed to extract insights from news.' });
    }
};
