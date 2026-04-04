require('dotenv').config();
const { query } = require('./src/config/db');

async function checkAmri() {
    try {
        const buildings = await query("SELECT id, name FROM buildings WHERE name ILIKE '%AMRI%'");
        console.log("Buildings:", buildings.rows);
        
        if (buildings.rows.length === 0) return;
        
        const bId = buildings.rows[0].id;
        const floors = await query("SELECT id, name, floor_number FROM floors WHERE building_id = $1 ORDER BY floor_number", [bId]);
        console.log("Floors:", floors.rows);
        
        for (const floor of floors.rows) {
            const rooms = await query("SELECT id, name, type FROM rooms WHERE floor_id = $1", [floor.id]);
            const vertical = rooms.rows.filter(r => r.type === 'elevator' || r.type === 'stairs');
            console.log(`Floor ${floor.floor_number} Vertical Connectors (${vertical.length}):`, vertical.map(v => ({ id: v.id, name: v.name, type: v.type })));
        }
        
        const crossFloorConnections = await query(`
            SELECT c.*, r1.name as from_name, r2.name as to_name, f1.floor_number as from_floor, f2.floor_number as to_floor
            FROM connections c
            JOIN rooms r1 ON c.from_room = r1.id
            JOIN rooms r2 ON c.to_room = r2.id
            JOIN floors f1 ON r1.floor_id = f1.id
            JOIN floors f2 ON r2.floor_id = f2.id
            WHERE f1.building_id = $1 AND f1.floor_number != f2.floor_number
        `, [bId]);
        
        console.log("Cross-floor Connections:", crossFloorConnections.rows);
        
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

checkAmri();
