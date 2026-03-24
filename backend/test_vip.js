require('dotenv').config();
const { query } = require('./src/config/db');

async function checkVip() {
    try {
        const res = await query(`SELECT id, name, type, is_accessible, is_landmark FROM rooms WHERE name ILIKE '%vip%'`);
        console.log("VIP Rooms:", JSON.stringify(res.rows, null, 2));

        if (res.rows.length > 0) {
            const roomId = res.rows[0].id;
            const conns = await query(`SELECT * FROM connections WHERE from_room = $1 OR to_room = $1`, [roomId]);
            console.log("Connected edges:", conns.rows.length);
            console.log(JSON.stringify(conns.rows, null, 2));
        }
    } catch (e) {
        console.error("DB Query error:", e.message);
    } finally {
        process.exit();
    }
}
checkVip();
