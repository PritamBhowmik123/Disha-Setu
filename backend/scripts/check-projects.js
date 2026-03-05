require('dotenv').config();
const { query } = require('../src/config/db');

query("SELECT COUNT(*) as count FROM projects WHERE name LIKE '%Hospital%'")
    .then(r => {
        const count = parseInt(r.rows[0].count);
        console.log(`\nHospital projects in database: ${count}\n`);
        if (count === 0) {
            console.log('ℹ️  No hospital projects found.');
            console.log('   Run initial migration to create sample data:');
            console.log('   node migrations/run.js 001_init\n');
        } else {
            console.log('✅ Hospital projects exist!');
            console.log('   Re-run indoor migration to create sample building:');
            console.log('   node migrations/run.js 002_indoor_navigation\n');
        }
        process.exit(0);
    })
    .catch(e => {
        console.error('Error:', e.message);
        process.exit(1);
    });
