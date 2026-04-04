require('dotenv').config();
const { query } = require('./src/config/db');

async function linkBuilding(namePattern) {
    const buildings = await query("SELECT id, name FROM buildings WHERE name ILIKE $1", [`%${namePattern}%`]);
    console.log("Buildings found:", buildings.rows);
    
    for (const b of buildings.rows) {
        console.log(`Linking ${b.name}...`);
        
        // Find all vertical rooms in this building
        const res = await query(`
            SELECT r.id, r.name, r.type, f.floor_number, f.id as floor_id
            FROM rooms r
            JOIN floors f ON r.floor_id = f.id
            WHERE f.building_id = $1 AND r.type IN ('stairs', 'elevator', 'escalator')
        `, [b.id]);

        const verticalRooms = res.rows;
        console.log(`Found ${verticalRooms.length} vertical rooms in ${b.name}.`);
        if (verticalRooms.length < 2) continue;

        const grouped = {};
        verticalRooms.forEach(r => {
            const key = `${r.name.toLowerCase().trim()}_${r.type.toLowerCase().trim()}`;
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(r);
        });

        for (const key in grouped) {
            const rooms = grouped[key];
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
                        }
                    }
                }
            }
        }
    }
}

async function run() {
    await linkBuilding('Kar');
    process.exit();
}

run();
