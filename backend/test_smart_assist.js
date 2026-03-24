require('dotenv').config();
const { analyzeDocumentAndRoute } = require('./src/services/document-analysis.service');
const fs = require('fs');

async function testSmartAssist() {
    try {
        const textBuffer = Buffer.from("I need to go to Conference Hall 1 now.");
        const { query } = require('./src/config/db');
        const bRes = await query(`SELECT id FROM buildings WHERE name ILIKE '%Bharat%'`);
        const bId = bRes.rows[0].id;

        const result = await analyzeDocumentAndRoute(textBuffer, 'text/plain', bId);
        fs.writeFileSync('sa_result2.json', JSON.stringify(result, null, 2), 'utf-8');
    } catch(e) {
        console.error("Error:", e);
    } finally {
        process.exit();
    }
}
testSmartAssist();
