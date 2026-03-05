/**
 * Add connections between rooms for sample hospital
 */
require('dotenv').config();
const { query } = require('../src/config/db');

async function addConnections() {
    try {
        console.log('🔗 Adding room connections...\n');
        
        // Check if connections already exist
        const existingCount = await query('SELECT COUNT(*) as count FROM connections');
        if (existingCount.rows[0].count > 0) {
            console.log(`ℹ️  ${existingCount.rows[0].count} connections already exist. Skipping.`);
            process.exit(0);
        }
        
        // Get all rooms with their identifiers
        const rooms = await query(`
            SELECT r.id, r.name, r.type, f.floor_number
            FROM rooms r
            JOIN floors f ON r.floor_id = f.id
            ORDER BY f.floor_number, r.name
        `);
        
        if (rooms.rows.length === 0) {
            console.log('❌ No rooms found. Run create-sample-building.js first.');
            process.exit(1);
        }
        
        console.log(`Found ${rooms.rows.length} rooms\n`);
        
        // Create a lookup map for easy access
        const roomMap = {};
        rooms.rows.forEach(room => {
            const key = `${room.name}-F${room.floor_number}`;
            roomMap[key] = room.id;
        });
        
        // Define all connections
        const connections = [
            // Ground floor (0)
            ['Main Entrance-F0', 'Reception & Information-F0', 5.0, true, true],
            ['Reception & Information-F0', 'Pharmacy-F0', 8.0, true, true],
            ['Reception & Information-F0', 'Emergency Department-F0', 12.0, true, true],
            ['Reception & Information-F0', 'Elevator 1-F0', 10.0, true, true],
            ['Reception & Information-F0', 'Staircase A-F0', 12.0, true, true],
            ['Pharmacy-F0', 'Elevator 1-F0', 10.0, true, true],
            ['Emergency Department-F0', 'Elevator 1-F0', 15.0, true, true],
            
            // First floor (1)
            ['Elevator 1-F1', 'Staircase A-F1', 6.0, true, true],
            ['Elevator 1-F1', 'General Ward - Male-F1', 10.0, true, true],
            ['Elevator 1-F1', 'Radiology Department-F1', 12.0, true, true],
            ['Staircase A-F1', 'General Ward - Male-F1', 8.0, true, true],
            ['Radiology Department-F1', 'Pathology Laboratory-F1', 10.0, true, true],
            ['General Ward - Male-F1', 'Radiology Department-F1', 15.0, true, true],
            
            // Second floor (2)
            ['Elevator 1-F2', 'Staircase A-F2', 6.0, true, true],
            ['Elevator 1-F2', 'ICU - Intensive Care Unit-F2', 8.0, true, true],
            ['Elevator 1-F2', 'Operation Theatre Complex-F2', 14.0, true, true],
            ['Staircase A-F2', 'ICU - Intensive Care Unit-F2', 10.0, true, true],
            ['ICU - Intensive Care Unit-F2', 'Operation Theatre Complex-F2', 12.0, true, true],
            
            // Cross-floor elevator (accessible)
            ['Elevator 1-F0', 'Elevator 1-F1', 3.0, true, true, 'Between floors 0-1'],
            ['Elevator 1-F1', 'Elevator 1-F2', 3.0, true, true, 'Between floors 1-2'],
            ['Elevator 1-F0', 'Elevator 1-F2', 6.0, true, true, 'Between floors 0-2'],
            
            // Cross-floor stairs (not accessible)
            ['Staircase A-F0', 'Staircase A-F1', 4.0, true, false, 'Between floors 0-1'],
            ['Staircase A-F1', 'Staircase A-F2', 4.0, true, false, 'Between floors 1-2'],
            ['Staircase A-F0', 'Staircase A-F2', 8.0, true, false, 'Between floors 0-2']
        ];
        
        let added = 0;
        let skipped = 0;
        
        for (const conn of connections) {
            const [fromKey, toKey, distance, bidirectional, accessible, notes] = conn;
            
            const fromId = roomMap[fromKey];
            const toId = roomMap[toKey];
            
            if (!fromId || !toId) {
                console.log(`⚠️  Skipping: ${fromKey} → ${toKey} (room not found)`);
                skipped++;
                continue;
            }
            
            await query(`
                INSERT INTO connections (from_room, to_room, distance, is_bidirectional, is_accessible, notes)
                VALUES ($1, $2, $3, $4, $5, $6)
            `, [fromId, toId, distance, bidirectional, accessible || true, notes || null]);
            
            added++;
        }
        
        console.log(`\n✅ Added ${added} connections`);
        if (skipped > 0) {
            console.log(`⚠️  Skipped ${skipped} connections`);
        }
        
        // Verify
        const finalCount = await query('SELECT COUNT(*) as count FROM connections');
        console.log(`\n📊 Total connections in database: ${finalCount.rows[0].count}`);
        
        console.log('\n✨ Indoor navigation setup complete!\n');
        
        process.exit(0);
    } catch (err) {
        console.error('\n❌ Error:', err.message);
        console.error(err);
        process.exit(1);
    }
}

addConnections();
