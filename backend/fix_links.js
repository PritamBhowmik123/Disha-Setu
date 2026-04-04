require('dotenv').config();
const { query } = require('./src/config/db');

// We re-implement the logic here for a one-time fix or test
async function linkVerticalConnectorsManual(buildingId) {
    console.log(`[Vertical Link] Manually linking connectors for building: ${buildingId}`);
    try {
        const res = await query(`
            SELECT r.id, r.name, r.type, f.floor_number, f.id as floor_id
            FROM rooms r
            JOIN floors f ON r.floor_id = f.id
            WHERE f.building_id = $1 AND r.type IN ('stairs', 'elevator', 'escalator')
        `, [buildingId]);

        const verticalRooms = res.rows;
        console.log(`Found ${verticalRooms.length} vertical rooms.`);
        if (verticalRooms.length < 2) return;

        const grouped = {};
        verticalRooms.forEach(r => {
            const name = r.name.toLowerCase().trim();
            const type = r.type.toLowerCase().trim();
            const key = `${name}_${type}`;
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(r);
        });

        for (const key in grouped) {
            const rooms = grouped[key];
            console.log(`Group ${key}: ${rooms.length} rooms`);
            if (rooms.length < 2) continue;

            for (let i = 0; i < rooms.length; i++) {
                for (let j = i + 1; j < rooms.length; j++) {
                    const r1 = rooms[i];
                    const r2 = rooms[j];
                    if (r1.floor_id !== r2.floor_id) {
                        const distance = Math.abs(r1.floor_number - r2.floor_number) * 4;
                        const exists = await query(`
                            SELECT 1 FROM connections 
                            WHERE (from_room = $1 AND to_room = $2)
                               OR (from_room = $2 AND to_room = $1)
                        `, [r1.id, r2.id]);

                        if (exists.rowCount === 0) {
                            console.log(`Linking ${r1.name} (F${r1.floor_number}) <-> ${r2.name} (F${r2.floor_number})`);
                            await query(`
                                INSERT INTO connections (from_room, to_room, distance, is_bidirectional, is_accessible)
                                VALUES ($1, $2, $3, true, true)
                            `, [r1.id, r2.id, distance]);
                        } else {
                            console.log(`Link already exists between ${r1.name} (F${r1.floor_number}) and ${r2.name} (F${r2.floor_number})`);
                        }
                    }
                }
            }
        }
    } catch (err) {
        console.error(err);
    }
}

async function run() {
    const buildings = await query("SELECT id, name FROM buildings WHERE name ILIKE '%AMRI%'");
    if (buildings.rows[0]) {
        await linkVerticalConnectorsManual(buildings.rows[0].id);
    }
    process.exit();
}

run();
