/**
 * scripts/create-sample-building.js
 * Manually create sample hospital building with indoor navigation
 */
require('dotenv').config();
const { query } = require('../src/config/db');

async function createSampleBuilding() {
    try {
        console.log('🏥 Creating Sample Hospital Building...\n');
        
        // Find hospital project
        const projectResult = await query(`
            SELECT id, name FROM projects 
            WHERE name LIKE '%Hospital%' 
            LIMIT 1
        `);
        
        if (projectResult.rows.length === 0) {
            console.log('❌ No hospital project found. Run migration 001_init first.');
            process.exit(1);
        }
        
        const hospitalProjectId = projectResult.rows[0].id;
        console.log(`✓ Found hospital project: ${projectResult.rows[0].name}`);
        
        // Check if building already exists
        const existingBuilding = await query(
            'SELECT id FROM buildings WHERE project_id = $1',
            [hospitalProjectId]
        );
        
        if (existingBuilding.rows.length > 0) {
            console.log('ℹ️  Building already exists. Skipping creation.');
            process.exit(0);
        }
        
        // Create building
        console.log('\n📍 Creating building...');
        const buildingResult = await query(`
            INSERT INTO buildings (project_id, name, campus, description, location, total_floors)
            VALUES ($1, $2, $3, $4, ST_MakePoint(77.5530, 12.9915)::geography, 3)
            RETURNING id
        `, [
            hospitalProjectId,
            'Rajajinagar General Hospital - Main Block',
            'Rajajinagar Medical Campus',
            'Multi-specialty government hospital with emergency services, ICU, and outpatient facilities'
        ]);
        
        const buildingId = buildingResult.rows[0].id;
        console.log(`✓ Building created: ${buildingId}`);
        
        // Create floors
        console.log('\n🏢 Creating floors...');
        const groundFloorResult = await query(`
            INSERT INTO floors (building_id, floor_number, name, description)
            VALUES ($1, 0, 'Ground Floor', 'Emergency, Reception, Pharmacy')
            RETURNING id
        `, [buildingId]);
        const groundFloorId = groundFloorResult.rows[0].id;
        console.log('  ✓ Ground Floor');
        
        const firstFloorResult = await query(`
            INSERT INTO floors (building_id, floor_number, name, description)
            VALUES ($1, 1, 'First Floor', 'General Wards, Radiology, Laboratory')
            RETURNING id
        `, [buildingId]);
        const firstFloorId = firstFloorResult.rows[0].id;
        console.log('  ✓ First Floor');
        
        const secondFloorResult = await query(`
            INSERT INTO floors (building_id, floor_number, name, description)
            VALUES ($1, 2, 'Second Floor', 'ICU, Surgery, Critical Care')
            RETURNING id
        `, [buildingId]);
        const secondFloorId = secondFloorResult.rows[0].id;
        console.log('  ✓ Second Floor');
        
        // Create ground floor rooms
        console.log('\n🚪 Creating rooms...');
        console.log('  Ground Floor:');
        
        const entranceResult = await query(`
            INSERT INTO rooms (floor_id, name, type, x_coordinate, y_coordinate, is_landmark, keywords)
            VALUES ($1, 'Main Entrance', 'entrance', 0.5, 0.1, TRUE, ARRAY['entrance', 'gate', 'entry'])
            RETURNING id
        `, [groundFloorId]);
        const entranceId = entranceResult.rows[0].id;
        console.log('    ✓ Main Entrance');
        
        const receptionResult = await query(`
            INSERT INTO rooms (floor_id, name, type, x_coordinate, y_coordinate, is_landmark, keywords)
            VALUES ($1, 'Reception & Information', 'reception', 0.5, 0.25, TRUE, ARRAY['reception', 'info', 'desk', 'help'])
            RETURNING id
        `, [groundFloorId]);
        const receptionId = receptionResult.rows[0].id;
        console.log('    ✓ Reception');
        
        const pharmacyResult = await query(`
            INSERT INTO rooms (floor_id, name, type, room_number, x_coordinate, y_coordinate, keywords)
            VALUES ($1, 'Pharmacy', 'shop', 'G-101', 0.2, 0.4, ARRAY['pharmacy', 'medicine', 'drugs'])
            RETURNING id
        `, [groundFloorId]);
        const pharmacyId = pharmacyResult.rows[0].id;
        console.log('    ✓ Pharmacy');
        
        const emergencyResult = await query(`
            INSERT INTO rooms (floor_id, name, type, room_number, x_coordinate, y_coordinate, is_landmark, keywords)
            VALUES ($1, 'Emergency Department', 'emergency', 'G-Emergency', 0.8, 0.4, TRUE, ARRAY['emergency', 'ER', 'urgent', 'casualty'])
            RETURNING id
        `, [groundFloorId]);
        const emergencyId = emergencyResult.rows[0].id;
        console.log('    ✓ Emergency Department');
        
        const elevatorGResult = await query(`
            INSERT INTO rooms (floor_id, name, type, x_coordinate, y_coordinate, is_landmark, keywords)
            VALUES ($1, 'Elevator 1', 'elevator', 0.5, 0.7, TRUE, ARRAY['elevator', 'lift'])
            RETURNING id
        `, [groundFloorId]);
        const elevatorGId = elevatorGResult.rows[0].id;
        console.log('    ✓ Elevator 1');
        
        const stairsGResult = await query(`
            INSERT INTO rooms (floor_id, name, type, x_coordinate, y_coordinate, keywords)
            VALUES ($1, 'Staircase A', 'stairs', 0.3, 0.7, ARRAY['stairs', 'staircase'])
            RETURNING id
        `, [groundFloorId]);
        const stairsGId = stairsGResult.rows[0].id;
        console.log('    ✓ Staircase A');
        
        // Create first floor rooms
        console.log('\n  First Floor:');
        
        const elevator1Result = await query(`
            INSERT INTO rooms (floor_id, name, type, x_coordinate, y_coordinate, is_landmark, keywords)
            VALUES ($1, 'Elevator 1', 'elevator', 0.5, 0.7, TRUE, ARRAY['elevator', 'lift'])
            RETURNING id
        `, [firstFloorId]);
        const elevator1Id = elevator1Result.rows[0].id;
        console.log('    ✓ Elevator 1');
        
        const stairs1Result = await query(`
            INSERT INTO rooms (floor_id, name, type, x_coordinate, y_coordinate, keywords)
            VALUES ($1, 'Staircase A', 'stairs', 0.3, 0.7, ARRAY['stairs', 'staircase'])
            RETURNING id
        `, [firstFloorId]);
        const stairs1Id = stairs1Result.rows[0].id;
        console.log('    ✓ Staircase A');
        
        const wardResult = await query(`
            INSERT INTO rooms (floor_id, name, type, room_number, x_coordinate, y_coordinate, is_landmark, keywords)
            VALUES ($1, 'General Ward - Male', 'department', '1-A', 0.2, 0.3, TRUE, ARRAY['general ward', 'male ward', 'beds'])
            RETURNING id
        `, [firstFloorId]);
        const wardId = wardResult.rows[0].id;
        console.log('    ✓ General Ward');
        
        const radiologyResult = await query(`
            INSERT INTO rooms (floor_id, name, type, room_number, x_coordinate, y_coordinate, is_landmark, keywords)
            VALUES ($1, 'Radiology Department', 'department', '1-R', 0.6, 0.3, TRUE, ARRAY['radiology', 'xray', 'x-ray', 'scan', 'imaging'])
            RETURNING id
        `, [firstFloorId]);
        const radiologyId = radiologyResult.rows[0].id;
        console.log('    ✓ Radiology Department');
        
        const labResult = await query(`
            INSERT INTO rooms (floor_id, name, type, room_number, x_coordinate, y_coordinate, keywords)
            VALUES ($1, 'Pathology Laboratory', 'lab', '1-L', 0.8, 0.5, ARRAY['lab', 'laboratory', 'pathology', 'tests', 'blood test'])
            RETURNING id
        `, [firstFloorId]);
        const labId = labResult.rows[0].id;
        console.log('    ✓ Laboratory');
        
        // Create second floor rooms
        console.log('\n  Second Floor:');
        
        const elevator2Result = await query(`
            INSERT INTO rooms (floor_id, name, type, x_coordinate, y_coordinate, is_landmark, keywords)
            VALUES ($1, 'Elevator 1', 'elevator', 0.5, 0.7, TRUE, ARRAY['elevator', 'lift'])
            RETURNING id
        `, [secondFloorId]);
        const elevator2Id = elevator2Result.rows[0].id;
        console.log('    ✓ Elevator 1');
        
        const stairs2Result = await query(`
            INSERT INTO rooms (floor_id, name, type, x_coordinate, y_coordinate, keywords)
            VALUES ($1, 'Staircase A', 'stairs', 0.3, 0.7, ARRAY['stairs', 'staircase'])
            RETURNING id
        `, [secondFloorId]);
        const stairs2Id = stairs2Result.rows[0].id;
        console.log('    ✓ Staircase A');
        
        const icuResult = await query(`
            INSERT INTO rooms (floor_id, name, type, room_number, x_coordinate, y_coordinate, is_landmark, keywords)
            VALUES ($1, 'ICU - Intensive Care Unit', 'medical', '2-ICU', 0.3, 0.3, TRUE, ARRAY['icu', 'intensive care', 'critical care'])
            RETURNING id
        `, [secondFloorId]);
        const icuId = icuResult.rows[0].id;
        console.log('    ✓ ICU');
        
        const surgeryResult = await query(`
            INSERT INTO rooms (floor_id, name, type, room_number, x_coordinate, y_coordinate, is_landmark, keywords)
            VALUES ($1, 'Operation Theatre Complex', 'medical', '2-OT', 0.7, 0.3, TRUE, ARRAY['operation', 'surgery', 'theatre', 'OT'])
            RETURNING id
        `, [secondFloorId]);
        const surgeryId = surgeryResult.rows[0].id;
        console.log('    ✓ Operation Theatre');
        
        // Create connections
        console.log('\n🔗 Creating connections...');
        
        // Ground floor connections
        const groundConnections = [
            [entranceId, receptionId, 5.0],
            [receptionId, pharmacyId, 8.0],
            [receptionId, emergencyId, 12.0],
            [receptionId, elevatorGId, 10.0],
            [receptionId, stairsGId, 12.0],
            [pharmacyId, elevatorGId, 10.0],
            [emergencyId, elevatorGId, 15.0]
        ];
        
        for (const [from, to, dist] of groundConnections) {
            await query(
                'INSERT INTO connections (from_room, to_room, distance, is_bidirectional) VALUES ($1, $2, $3, TRUE)',
                [from, to, dist]
            );
        }
        console.log('  ✓ Ground floor corridors');
        
        // First floor connections
        const firstConnections = [
            [elevator1Id, stairs1Id, 6.0],
            [elevator1Id, wardId, 10.0],
            [elevator1Id, radiologyId, 12.0],
            [stairs1Id, wardId, 8.0],
            [radiologyId, labId, 10.0],
            [wardId, radiologyId, 15.0]
        ];
        
        for (const [from, to, dist] of firstConnections) {
            await query(
                'INSERT INTO connections (from_room, to_room, distance, is_bidirectional) VALUES ($1, $2, $3, TRUE)',
                [from, to, dist]
            );
        }
        console.log('  ✓ First floor corridors');
        
        // Second floor connections
        const secondConnections = [
            [elevator2Id, stairs2Id, 6.0],
            [elevator2Id, icuId, 8.0],
            [elevator2Id, surgeryId, 14.0],
            [stairs2Id, icuId, 10.0],
            [icuId, surgeryId, 12.0]
        ];
        
        for (const [from, to, dist] of secondConnections) {
            await query(
                'INSERT INTO connections (from_room, to_room, distance, is_bidirectional) VALUES ($1, $2, $3, TRUE)',
                [from, to, dist]
            );
        }
        console.log('  ✓ Second floor corridors');
        
        // Cross-floor elevator connections (accessible)
        const elevatorConnections = [
            [elevatorGId, elevator1Id, 3.0, 'Elevator between Ground and First'],
            [elevator1Id, elevator2Id, 3.0, 'Elevator between First and Second'],
            [elevatorGId, elevator2Id, 6.0, 'Elevator between Ground and Second']
        ];
        
        for (const [from, to, dist, note] of elevatorConnections) {
            await query(
                'INSERT INTO connections (from_room, to_room, distance, is_bidirectional, notes) VALUES ($1, $2, $3, TRUE, $4)',
                [from, to, dist, note]
            );
        }
        console.log('  ✓ Elevator connections');
        
        // Cross-floor stairs connections (not accessible)
        const stairsConnections = [
            [stairsGId, stairs1Id, 4.0, 'Stairs between Ground and First'],
            [stairs1Id, stairs2Id, 4.0, 'Stairs between First and Second'],
            [stairsGId, stairs2Id, 8.0, 'Stairs between Ground and Second']
        ];
        
        for (const [from, to, dist, note] of stairsConnections) {
            await query(
                'INSERT INTO connections (from_room, to_room, distance, is_bidirectional, is_accessible, notes) VALUES ($1, $2, $3, TRUE, FALSE, $4)',
                [from, to, dist, note]
            );
        }
        console.log('  ✓ Staircase connections');
        
        console.log('\n✨ Sample building created successfully!');
        console.log('\nYou can now test indoor navigation:');
        console.log('  - Search for "Radiology"');
        console.log('  - Navigate from "Main Entrance" to "ICU"');
        console.log('  - Try accessible routing (elevator only)\n');
        
        process.exit(0);
    } catch (err) {
        console.error('\n❌ Error creating sample building:', err.message);
        console.error(err);
        process.exit(1);
    }
}

createSampleBuilding();
