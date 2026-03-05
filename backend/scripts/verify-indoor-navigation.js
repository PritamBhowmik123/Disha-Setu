/**
 * scripts/verify-indoor-navigation.js
 * Verify indoor navigation migration success
 */
require('dotenv').config();
const { query } = require('../src/config/db');

async function verify() {
    try {
        console.log('🔍 Verifying Indoor Navigation Migration...\n');
        
        // Check tables exist
        const tables = await query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('buildings', 'floors', 'rooms', 'connections')
            ORDER BY table_name
        `);
        
        console.log('✅ Tables Created:');
        tables.rows.forEach(row => console.log(`   - ${row.table_name}`));
        
        // Check counts
        const buildingCount = await query('SELECT COUNT(*) as count FROM buildings');
        const floorCount = await query('SELECT COUNT(*) as count FROM floors');
        const roomCount = await query('SELECT COUNT(*) as count FROM rooms');
        const connectionCount = await query('SELECT COUNT(*) as count FROM connections');
        
        console.log('\n📊 Data Summary:');
        console.log(`   - Buildings: ${buildingCount.rows[0].count}`);
        console.log(`   - Floors: ${floorCount.rows[0].count}`);
        console.log(`   - Rooms: ${roomCount.rows[0].count}`);
        console.log(`   - Connections: ${connectionCount.rows[0].count}`);
        
        // Check sample building
        if (parseInt(buildingCount.rows[0].count) > 0) {
            const building = await query('SELECT * FROM buildings LIMIT 1');
            console.log('\n🏥 Sample Building:');
            console.log(`   Name: ${building.rows[0].name}`);
            console.log(`   Campus: ${building.rows[0].campus}`);
            console.log(`   Floors: ${building.rows[0].total_floors}`);
        }
        
        // Test search functionality
        const searchResults = await query(`
            SELECT r.name, r.type, f.floor_number, b.name as building_name
            FROM rooms r
            JOIN floors f ON r.floor_id = f.id
            JOIN buildings b ON f.building_id = b.id
            WHERE 'radiology' = ANY(r.keywords)
            LIMIT 1
        `);
        
        if (searchResults.rows.length > 0) {
            console.log('\n🔍 Search Test (keyword: "radiology"):');
            console.log(`   Found: ${searchResults.rows[0].name}`);
            console.log(`   Type: ${searchResults.rows[0].type}`);
            console.log(`   Floor: ${searchResults.rows[0].floor_number}`);
            console.log(`   Building: ${searchResults.rows[0].building_name}`);
        }
        
        console.log('\n✨ Verification Complete! All systems operational.\n');
        process.exit(0);
    } catch (err) {
        console.error('❌ Verification failed:', err.message);
        console.error(err);
        process.exit(1);
    }
}

verify();
