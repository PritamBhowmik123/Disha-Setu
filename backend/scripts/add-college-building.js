/**
 * Add Indoor Navigation to Visvesvaraya Tech College
 */
require('dotenv').config();
const { query } = require('../src/config/db');

async function addCollegeBuilding() {
    try {
        console.log('🏫 Adding indoor navigation to Tech College...\n');

        // Find the Tech College project
        const projectResult = await query(`
            SELECT id, name FROM projects 
            WHERE name LIKE '%Tech College%' OR name LIKE '%Visvesvaraya%'
            LIMIT 1
        `);

        if (projectResult.rows.length === 0) {
            console.error('❌ Tech College project not found!');
            console.log('Available projects:');
            const allProjects = await query('SELECT id, name FROM projects LIMIT 10');
            allProjects.rows.forEach(p => console.log(`  - ${p.name}`));
            process.exit(1);
        }

        const project = projectResult.rows[0];
        console.log(`✅ Found project: ${project.name}`);
        console.log(`   ID: ${project.id}\n`);

        // Create the building (coordinates for Visvesvaraya area in Bangalore)
        const buildingResult = await query(`
            INSERT INTO buildings (project_id, name, location, total_floors, campus)
            VALUES ($1, $2, ST_MakePoint(77.5946, 12.9716)::geography, $3, $4)
            RETURNING id, name
        `, [
            project.id,
            'Visvesvaraya Tech College - New Academic Block',
            3, // Ground + 2 floors
            'VTU Campus'
        ]);

        const building = buildingResult.rows[0];
        console.log(`✅ Created building: ${building.name}`);
        console.log(`   ID: ${building.id}\n`);

        // Create floors
        const floors = [
            { num: 0, name: 'Ground Floor' },
            { num: 1, name: 'First Floor' },
            { num: 2, name: 'Second Floor' }
        ];

        const floorIds = {};
        for (const floor of floors) {
            const result = await query(`
                INSERT INTO floors (building_id, floor_number, name)
                VALUES ($1, $2, $3)
                RETURNING id, name
            `, [building.id, floor.num, floor.name]);
            floorIds[floor.num] = result.rows[0].id;
            console.log(`✅ Created ${floor.name}`);
        }

        console.log('\n📐 Creating rooms...\n');

        // Ground Floor - Main entrance, admin offices, auditorium
        const groundRooms = [
            { name: 'Main Entrance', type: 'entrance', x: 0.5, y: 0.1, keywords: 'entry door gate' },
            { name: 'Reception', type: 'reception', x: 0.5, y: 0.2, keywords: 'help desk info' },
            { name: 'Principal Office', type: 'office', x: 0.2, y: 0.3, keywords: 'principal head' },
            { name: 'Administration Office', type: 'office', x: 0.8, y: 0.3, keywords: 'admin office' },
            { name: 'Auditorium', type: 'auditorium', x: 0.5, y: 0.5, keywords: 'hall event auditorium' },
            { name: 'Library - Ground Floor', type: 'other', x: 0.3, y: 0.7, keywords: 'library books reading' },
            { name: 'Canteen', type: 'cafeteria', x: 0.7, y: 0.7, keywords: 'food canteen cafe' },
            { name: 'Elevator - Ground', type: 'elevator', x: 0.5, y: 0.8, keywords: 'lift elevator' },
            { name: 'Staircase A - Ground', type: 'stairs', x: 0.2, y: 0.8, keywords: 'stairs steps' },
            { name: 'Staircase B - Ground', type: 'stairs', x: 0.8, y: 0.8, keywords: 'stairs steps' }
        ];

        // First Floor - Computer labs, classrooms
        const firstFloorRooms = [
            { name: 'Classroom 1A', type: 'classroom', x: 0.2, y: 0.2, keywords: 'class room lecture' },
            { name: 'Classroom 1B', type: 'classroom', x: 0.4, y: 0.2, keywords: 'class room lecture' },
            { name: 'Computer Lab 1', type: 'lab', x: 0.6, y: 0.2, keywords: 'computer lab programming' },
            { name: 'Computer Lab 2', type: 'lab', x: 0.8, y: 0.2, keywords: 'computer lab programming' },
            { name: 'Staff Room', type: 'office', x: 0.3, y: 0.5, keywords: 'staff teachers faculty' },
            { name: 'Seminar Hall 1', type: 'other', x: 0.5, y: 0.6, keywords: 'seminar presentation hall' },
            { name: 'Elevator - First', type: 'elevator', x: 0.5, y: 0.8, keywords: 'lift elevator' },
            { name: 'Staircase A - First', type: 'stairs', x: 0.2, y: 0.8, keywords: 'stairs steps' },
            { name: 'Staircase B - First', type: 'stairs', x: 0.8, y: 0.8, keywords: 'stairs steps' }
        ];

        // Second Floor - More labs and classrooms
        const secondFloorRooms = [
            { name: 'Electronics Lab', type: 'lab', x: 0.2, y: 0.2, keywords: 'electronics lab hardware' },
            { name: 'Physics Lab', type: 'lab', x: 0.4, y: 0.2, keywords: 'physics lab science' },
            { name: 'Chemistry Lab', type: 'lab', x: 0.6, y: 0.2, keywords: 'chemistry lab science' },
            { name: 'Classroom 2A', type: 'classroom', x: 0.8, y: 0.2, keywords: 'class room lecture' },
            { name: 'Classroom 2B', type: 'classroom', x: 0.2, y: 0.5, keywords: 'class room lecture' },
            { name: 'Project Lab', type: 'lab', x: 0.5, y: 0.5, keywords: 'project lab workshop' },
            { name: 'Faculty Lounge', type: 'office', x: 0.7, y: 0.5, keywords: 'faculty teachers staff' },
            { name: 'Elevator - Second', type: 'elevator', x: 0.5, y: 0.8, keywords: 'lift elevator' },
            { name: 'Staircase A - Second', type: 'stairs', x: 0.2, y: 0.8, keywords: 'stairs steps' },
            { name: 'Staircase B - Second', type: 'stairs', x: 0.8, y: 0.8, keywords: 'stairs steps' }
        ];

        const roomIds = {};

        // Insert ground floor rooms
        for (const room of groundRooms) {
            const keywordsArray = room.keywords.split(' ');
            const result = await query(`
                INSERT INTO rooms (floor_id, name, type, x_coordinate, y_coordinate, keywords)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING id, name
            `, [floorIds[0], room.name, room.type, room.x, room.y, keywordsArray]);
            roomIds[room.name] = result.rows[0].id;
            console.log(`  ✓ Ground: ${room.name}`);
        }

        // Insert first floor rooms
        for (const room of firstFloorRooms) {
            const keywordsArray = room.keywords.split(' ');
            const result = await query(`
                INSERT INTO rooms (floor_id, name, type, x_coordinate, y_coordinate, keywords)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING id, name
            `, [floorIds[1], room.name, room.type, room.x, room.y, keywordsArray]);
            roomIds[room.name] = result.rows[0].id;
            console.log(`  ✓ First: ${room.name}`);
        }

        // Insert second floor rooms
        for (const room of secondFloorRooms) {
            const keywordsArray = room.keywords.split(' ');
            const result = await query(`
                INSERT INTO rooms (floor_id, name, type, x_coordinate, y_coordinate, keywords)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING id, name
            `, [floorIds[2], room.name, room.type, room.x, room.y, keywordsArray]);
            roomIds[room.name] = result.rows[0].id;
            console.log(`  ✓ Second: ${room.name}`);
        }

        console.log('\n🔗 Creating navigation paths...\n');

        // GROUND FLOOR connections
        const groundConnections = [
            ['Main Entrance', 'Reception', 5, true],
            ['Reception', 'Principal Office', 8, true],
            ['Reception', 'Administration Office', 8, true],
            ['Reception', 'Auditorium', 10, true],
            ['Auditorium', 'Library - Ground Floor', 12, true],
            ['Auditorium', 'Canteen', 12, true],
            ['Reception', 'Elevator - Ground', 15, true],
            ['Reception', 'Staircase A - Ground', 12, true],
            ['Reception', 'Staircase B - Ground', 12, true],
            ['Library - Ground Floor', 'Elevator - Ground', 8, true],
            ['Canteen', 'Elevator - Ground', 8, true],
            ['Elevator - Ground', 'Staircase A - Ground', 10, false],
            ['Elevator - Ground', 'Staircase B - Ground', 10, false]
        ];

        // FIRST FLOOR connections
        const firstConnections = [
            ['Elevator - First', 'Classroom 1A', 10, true],
            ['Elevator - First', 'Classroom 1B', 8, true],
            ['Elevator - First', 'Computer Lab 1', 8, true],
            ['Elevator - First', 'Computer Lab 2', 10, true],
            ['Elevator - First', 'Staff Room', 12, true],
            ['Elevator - First', 'Seminar Hall 1', 6, true],
            ['Elevator - First', 'Staircase A - First', 10, false],
            ['Elevator - First', 'Staircase B - First', 10, false],
            ['Classroom 1A', 'Classroom 1B', 6, true],
            ['Computer Lab 1', 'Computer Lab 2', 6, true]
        ];

        // SECOND FLOOR connections
        const secondConnections = [
            ['Elevator - Second', 'Electronics Lab', 10, true],
            ['Elevator - Second', 'Physics Lab', 8, true],
            ['Elevator - Second', 'Chemistry Lab', 6, true],
            ['Elevator - Second', 'Classroom 2A', 8, true],
            ['Elevator - Second', 'Project Lab', 6, true],
            ['Elevator - Second', 'Faculty Lounge', 10, true],
            ['Elevator - Second', 'Staircase A - Second', 10, false],
            ['Elevator - Second', 'Staircase B - Second', 10, false],
            ['Electronics Lab', 'Physics Lab', 6, true],
            ['Physics Lab', 'Chemistry Lab', 6, true],
            ['Classroom 2A', 'Classroom 2B', 8, true]
        ];

        // VERTICAL connections (between floors)
        const verticalConnections = [
            ['Elevator - Ground', 'Elevator - First', 3, true],
            ['Elevator - First', 'Elevator - Second', 3, true],
            ['Staircase A - Ground', 'Staircase A - First', 5, true],
            ['Staircase A - First', 'Staircase A - Second', 5, true],
            ['Staircase B - Ground', 'Staircase B - First', 5, true],
            ['Staircase B - First', 'Staircase B - Second', 5, true]
        ];

        const allConnections = [
            ...groundConnections,
            ...firstConnections,
            ...secondConnections,
            ...verticalConnections
        ];

        let connectionCount = 0;
        for (const [from, to, distance, accessible] of allConnections) {
            if (!roomIds[from] || !roomIds[to]) {
                console.log(`  ⚠️  Skipping ${from} → ${to} (room not found)`);
                continue;
            }
            await query(`
                INSERT INTO connections (from_room, to_room, distance, is_accessible, is_bidirectional)
                VALUES ($1, $2, $3, $4, TRUE)
            `, [roomIds[from], roomIds[to], distance, accessible]);
            connectionCount++;
        }

        console.log(`✅ Created ${connectionCount} navigation paths\n`);

        // Summary
        const summary = await query(`
            SELECT 
                (SELECT COUNT(*) FROM floors WHERE building_id = $1) as floors,
                (SELECT COUNT(*) FROM rooms WHERE floor_id IN (SELECT id FROM floors WHERE building_id = $1)) as rooms,
                (SELECT COUNT(*) FROM connections WHERE from_room IN (SELECT id FROM rooms WHERE floor_id IN (SELECT id FROM floors WHERE building_id = $1))) as connections
        `, [building.id]);

        console.log('═══════════════════════════════════════════════');
        console.log('✨ Indoor Navigation Setup Complete!');
        console.log('═══════════════════════════════════════════════');
        console.log(`🏫 Building: ${building.name}`);
        console.log(`📊 Summary:`);
        console.log(`   - Floors: ${summary.rows[0].floors}`);
        console.log(`   - Rooms: ${summary.rows[0].rooms}`);
        console.log(`   - Connections: ${summary.rows[0].connections}`);
        console.log('═══════════════════════════════════════════════\n');
        console.log('🎉 Students can now navigate inside the college!');
        console.log('   Try searching for: "computer lab", "canteen", "library"\n');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
        process.exit(1);
    }
}

addCollegeBuilding();
