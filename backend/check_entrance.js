require('dotenv').config();
const { query } = require('./src/config/db');

async function check() {
    try {
        const res = await query(`
            SELECT r.id, r.name, r.type, f.building_id, b.name as building_name
            FROM rooms r
            JOIN floors f ON r.floor_id = f.id
            JOIN buildings b ON f.building_id = b.id
            WHERE b.name ILIKE '%Bharat%' AND r.type = 'entrance'
        `);
        console.log("Entrance rooms in Bharat Mandapam:", res.rows);
    } catch(e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
check();
