require('dotenv').config();
const { query } = require('./src/config/db');
const fs = require('fs');

async function check() {
    try {
        const res = await query(`
            SELECT r.id, r.name, r.type, f.floor_number, f.name as floor_name
            FROM rooms r
            JOIN floors f ON r.floor_id = f.id
            JOIN buildings b ON f.building_id = b.id
            WHERE b.name ILIKE '%Bharat%'
        `);
        fs.writeFileSync('bharat_rooms.json', JSON.stringify(res.rows, null, 2));
    } catch(e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
check();
