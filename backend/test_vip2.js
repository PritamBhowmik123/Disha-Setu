require('dotenv').config();
const { query } = require('./src/config/db');
const fs = require('fs');

async function checkVip() {
    try {
        const res = await query(`SELECT id, name, type, is_accessible, is_landmark FROM rooms WHERE name ILIKE '%vip%'`);
        let output = { vip_rooms: res.rows, edges: [] };

        if (res.rows.length > 0) {
            const roomId = res.rows[0].id;
            const conns = await query(`SELECT * FROM connections WHERE from_room = $1 OR to_room = $1`, [roomId]);
            output.edges = conns.rows;
        }
        fs.writeFileSync('vip_result.json', JSON.stringify(output, null, 2), 'utf-8');
    } catch (e) {
        console.error("DB Query error:", e.message);
    } finally {
        process.exit();
    }
}
checkVip();
