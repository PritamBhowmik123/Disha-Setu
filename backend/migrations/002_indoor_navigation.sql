-- ============================================================
-- DishaSetu Database Migration: 002_indoor_navigation.sql
-- Indoor navigation system for public buildings
-- Run this after 001_init.sql
-- ============================================================

-- ============================================================
-- BUILDINGS TABLE
-- Represents physical buildings that support indoor navigation
-- ============================================================

CREATE TABLE IF NOT EXISTS buildings (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id      UUID REFERENCES projects(id) ON DELETE CASCADE,
    name            VARCHAR(500) NOT NULL,
    campus          VARCHAR(255),
    description     TEXT,
    address         TEXT,
    -- Building entrance location
    location        geography(Point, 4326),
    total_floors    INTEGER DEFAULT 1,
    image_url       TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_buildings_project ON buildings(project_id);
CREATE INDEX IF NOT EXISTS idx_buildings_location ON buildings USING GIST(location);

-- ============================================================
-- FLOORS TABLE
-- Individual floors within a building
-- ============================================================

CREATE TABLE IF NOT EXISTS floors (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    building_id     UUID REFERENCES buildings(id) ON DELETE CASCADE NOT NULL,
    floor_number    INTEGER NOT NULL,
    name            VARCHAR(255),           -- e.g., "Ground Floor", "First Floor", "Basement 1"
    map_image_url   TEXT,                   -- Floor plan image URL
    description     TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (building_id, floor_number)
);

CREATE INDEX IF NOT EXISTS idx_floors_building ON floors(building_id);

-- ============================================================
-- ROOMS TABLE
-- Individual rooms, departments, or points of interest
-- ============================================================

DO $$ BEGIN
    CREATE TYPE room_type AS ENUM (
    'entrance', 'exit', 'elevator', 'stairs', 'escalator',
    'office', 'department', 'classroom', 'lab', 'auditorium',
    'restroom', 'cafeteria', 'shop', 'atm', 'parking',
    'emergency', 'medical', 'reception', 'waiting', 'other'
);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS rooms (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    floor_id        UUID REFERENCES floors(id) ON DELETE CASCADE NOT NULL,
    name            VARCHAR(500) NOT NULL,
    type            room_type DEFAULT 'other',
    room_number     VARCHAR(50),
    description     TEXT,
    -- Coordinates on the floor plan (normalized 0-1 or pixel coordinates)
    x_coordinate    NUMERIC(10, 4),
    y_coordinate    NUMERIC(10, 4),
    is_accessible   BOOLEAN DEFAULT TRUE,   -- Wheelchair accessible
    is_landmark     BOOLEAN DEFAULT FALSE,  -- Major landmark for navigation
    keywords        TEXT[],                 -- Search keywords
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rooms_floor ON rooms(floor_id);
CREATE INDEX IF NOT EXISTS idx_rooms_type ON rooms(type);
CREATE INDEX IF NOT EXISTS idx_rooms_keywords ON rooms USING GIN(keywords);

-- ============================================================
-- CONNECTIONS TABLE
-- Graph edges between rooms for pathfinding
-- ============================================================

CREATE TABLE IF NOT EXISTS connections (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    from_room       UUID REFERENCES rooms(id) ON DELETE CASCADE NOT NULL,
    to_room         UUID REFERENCES rooms(id) ON DELETE CASCADE NOT NULL,
    distance        NUMERIC(8, 2) NOT NULL,  -- meters
    is_bidirectional BOOLEAN DEFAULT TRUE,
    is_accessible   BOOLEAN DEFAULT TRUE,    -- Wheelchair accessible route
    notes           TEXT,                    -- e.g., "Requires stairs", "Elevator required"
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    CHECK (from_room != to_room)
);

CREATE INDEX IF NOT EXISTS idx_connections_from ON connections(from_room);
CREATE INDEX IF NOT EXISTS idx_connections_to ON connections(to_room);
CREATE INDEX IF NOT EXISTS idx_connections_bidirectional ON connections(from_room, to_room);

-- ============================================================
-- SEED DATA: Sample Hospital Building
-- ============================================================

-- Get the Rajajinagar Hospital project ID
DO $$
DECLARE
    hospital_project_id UUID;
    building_id UUID;
    ground_floor_id UUID;
    first_floor_id UUID;
    second_floor_id UUID;
    
    -- Ground floor rooms
    entrance_id UUID;
    reception_id UUID;
    pharmacy_id UUID;
    emergency_id UUID;
    elevator_g_id UUID;
    stairs_g_id UUID;
    
    -- First floor rooms
    elevator_1_id UUID;
    stairs_1_id UUID;
    general_ward_id UUID;
    radiology_id UUID;
    lab_id UUID;
    
    -- Second floor rooms
    elevator_2_id UUID;
    stairs_2_id UUID;
    icu_id UUID;
    surgery_id UUID;
BEGIN
    -- Find the hospital project
    SELECT id INTO hospital_project_id 
    FROM projects 
    WHERE name LIKE '%Hospital%' 
    LIMIT 1;
    
    IF hospital_project_id IS NOT NULL THEN
        -- Check if building already exists to avoid duplicates
        SELECT id INTO building_id FROM buildings WHERE project_id = hospital_project_id LIMIT 1;
        
        IF building_id IS NULL THEN
            -- Create building
            INSERT INTO buildings (project_id, name, campus, description, location, total_floors)
            VALUES (
                hospital_project_id,
                'Rajajinagar General Hospital - Main Block',
                'Rajajinagar Medical Campus',
                'Multi-specialty government hospital with emergency services, ICU, and outpatient facilities',
                ST_MakePoint(77.5530, 12.9915)::geography,
                3
            ) RETURNING id INTO building_id;
        END IF;
        
        -- Check if floors already exist
        SELECT id INTO ground_floor_id FROM floors WHERE building_id = building_id AND floor_number = 0;
        
        IF ground_floor_id IS NULL THEN
            -- Create floors one by one to capture IDs
            INSERT INTO floors (building_id, floor_number, name, description)
            VALUES (building_id, 0, 'Ground Floor', 'Emergency, Reception, Pharmacy')
            RETURNING id INTO ground_floor_id;
            
            INSERT INTO floors (building_id, floor_number, name, description)
            VALUES (building_id, 1, 'First Floor', 'General Wards, Radiology, Laboratory')
            RETURNING id INTO first_floor_id;
            
            INSERT INTO floors (building_id, floor_number, name, description)
            VALUES (building_id, 2, 'Second Floor', 'ICU, Surgery, Critical Care')
            RETURNING id INTO second_floor_id;
        ELSE
            -- Floors already exist, get their IDs
            SELECT id INTO first_floor_id FROM floors WHERE building_id = building_id AND floor_number = 1;
            SELECT id INTO second_floor_id FROM floors WHERE building_id = building_id AND floor_number = 2;
            RAISE NOTICE 'Building and floors already exist. Skipping sample data creation.';
            RETURN;
        END IF;
        
        -- ========== GROUND FLOOR ROOMS ==========
        INSERT INTO rooms (floor_id, name, type, x_coordinate, y_coordinate, is_landmark, keywords)
        VALUES 
            (ground_floor_id, 'Main Entrance', 'entrance', 0.5, 0.1, TRUE, ARRAY['entrance', 'gate', 'entry'])
        RETURNING id INTO entrance_id;
        
        INSERT INTO rooms (floor_id, name, type, x_coordinate, y_coordinate, is_landmark, keywords)
        VALUES 
            (ground_floor_id, 'Reception & Information', 'reception', 0.5, 0.25, TRUE, ARRAY['reception', 'info', 'desk', 'help'])
        RETURNING id INTO reception_id;
        
        INSERT INTO rooms (floor_id, name, type, room_number, x_coordinate, y_coordinate, keywords)
        VALUES 
            (ground_floor_id, 'Pharmacy', 'shop', 'G-101', 0.2, 0.4, ARRAY['pharmacy', 'medicine', 'drugs'])
        RETURNING id INTO pharmacy_id;
        
        INSERT INTO rooms (floor_id, name, type, room_number, x_coordinate, y_coordinate, is_landmark, keywords)
        VALUES 
            (ground_floor_id, 'Emergency Department', 'emergency', 'G-Emergency', 0.8, 0.4, TRUE, ARRAY['emergency', 'ER', 'urgent', 'casualty'])
        RETURNING id INTO emergency_id;
        
        INSERT INTO rooms (floor_id, name, type, x_coordinate, y_coordinate, is_landmark, keywords)
        VALUES 
            (ground_floor_id, 'Elevator 1', 'elevator', 0.5, 0.7, TRUE, ARRAY['elevator', 'lift'])
        RETURNING id INTO elevator_g_id;
        
        INSERT INTO rooms (floor_id, name, type, x_coordinate, y_coordinate, keywords)
        VALUES 
            (ground_floor_id, 'Staircase A', 'stairs', 0.3, 0.7, ARRAY['stairs', 'staircase'])
        RETURNING id INTO stairs_g_id;
        
        -- ========== FIRST FLOOR ROOMS ==========
        INSERT INTO rooms (floor_id, name, type, x_coordinate, y_coordinate, is_landmark, keywords)
        VALUES 
            (first_floor_id, 'Elevator 1', 'elevator', 0.5, 0.7, TRUE, ARRAY['elevator', 'lift'])
        RETURNING id INTO elevator_1_id;
        
        INSERT INTO rooms (floor_id, name, type, x_coordinate, y_coordinate, keywords)
        VALUES 
            (first_floor_id, 'Staircase A', 'stairs', 0.3, 0.7, ARRAY['stairs', 'staircase'])
        RETURNING id INTO stairs_1_id;
        
        INSERT INTO rooms (floor_id, name, type, room_number, x_coordinate, y_coordinate, is_landmark, keywords)
        VALUES 
            (first_floor_id, 'General Ward - Male', 'department', '1-A', 0.2, 0.3, TRUE, ARRAY['general ward', 'male ward', 'beds'])
        RETURNING id INTO general_ward_id;
        
        INSERT INTO rooms (floor_id, name, type, room_number, x_coordinate, y_coordinate, is_landmark, keywords)
        VALUES 
            (first_floor_id, 'Radiology Department', 'department', '1-R', 0.6, 0.3, TRUE, ARRAY['radiology', 'xray', 'x-ray', 'scan', 'imaging'])
        RETURNING id INTO radiology_id;
        
        INSERT INTO rooms (floor_id, name, type, room_number, x_coordinate, y_coordinate, keywords)
        VALUES 
            (first_floor_id, 'Pathology Laboratory', 'lab', '1-L', 0.8, 0.5, ARRAY['lab', 'laboratory', 'pathology', 'tests', 'blood test'])
        RETURNING id INTO lab_id;
        
        -- ========== SECOND FLOOR ROOMS ==========
        INSERT INTO rooms (floor_id, name, type, x_coordinate, y_coordinate, is_landmark, keywords)
        VALUES 
            (second_floor_id, 'Elevator 1', 'elevator', 0.5, 0.7, TRUE, ARRAY['elevator', 'lift'])
        RETURNING id INTO elevator_2_id;
        
        INSERT INTO rooms (floor_id, name, type, x_coordinate, y_coordinate, keywords)
        VALUES 
            (second_floor_id, 'Staircase A', 'stairs', 0.3, 0.7, ARRAY['stairs', 'staircase'])
        RETURNING id INTO stairs_2_id;
        
        INSERT INTO rooms (floor_id, name, type, room_number, x_coordinate, y_coordinate, is_landmark, keywords)
        VALUES 
            (second_floor_id, 'ICU - Intensive Care Unit', 'medical', '2-ICU', 0.3, 0.3, TRUE, ARRAY['icu', 'intensive care', 'critical care'])
        RETURNING id INTO icu_id;
        
        INSERT INTO rooms (floor_id, name, type, room_number, x_coordinate, y_coordinate, is_landmark, keywords)
        VALUES 
            (second_floor_id, 'Operation Theatre Complex', 'medical', '2-OT', 0.7, 0.3, TRUE, ARRAY['operation', 'surgery', 'theatre', 'OT'])
        RETURNING id INTO surgery_id;
        
        -- ========== CONNECTIONS (GRAPH EDGES) ==========
        
        -- Ground floor connections
        INSERT INTO connections (from_room, to_room, distance, is_bidirectional) VALUES
            (entrance_id, reception_id, 5.0, TRUE),
            (reception_id, pharmacy_id, 8.0, TRUE),
            (reception_id, emergency_id, 12.0, TRUE),
            (reception_id, elevator_g_id, 10.0, TRUE),
            (reception_id, stairs_g_id, 12.0, TRUE),
            (pharmacy_id, elevator_g_id, 10.0, TRUE),
            (emergency_id, elevator_g_id, 15.0, TRUE);
        
        -- First floor connections
        INSERT INTO connections (from_room, to_room, distance, is_bidirectional) VALUES
            (elevator_1_id, stairs_1_id, 6.0, TRUE),
            (elevator_1_id, general_ward_id, 10.0, TRUE),
            (elevator_1_id, radiology_id, 12.0, TRUE),
            (stairs_1_id, general_ward_id, 8.0, TRUE),
            (radiology_id, lab_id, 10.0, TRUE),
            (general_ward_id, radiology_id, 15.0, TRUE);
        
        -- Second floor connections
        INSERT INTO connections (from_room, to_room, distance, is_bidirectional) VALUES
            (elevator_2_id, stairs_2_id, 6.0, TRUE),
            (elevator_2_id, icu_id, 8.0, TRUE),
            (elevator_2_id, surgery_id, 14.0, TRUE),
            (stairs_2_id, icu_id, 10.0, TRUE),
            (icu_id, surgery_id, 12.0, TRUE);
        
        -- Cross-floor connections (elevators)
        INSERT INTO connections (from_room, to_room, distance, is_bidirectional, notes) VALUES
            (elevator_g_id, elevator_1_id, 3.0, TRUE, 'Elevator between Ground and First'),
            (elevator_1_id, elevator_2_id, 3.0, TRUE, 'Elevator between First and Second'),
            (elevator_g_id, elevator_2_id, 6.0, TRUE, 'Elevator between Ground and Second');
        
        -- Cross-floor connections (stairs)
        INSERT INTO connections (from_room, to_room, distance, is_bidirectional, is_accessible, notes) VALUES
            (stairs_g_id, stairs_1_id, 4.0, TRUE, FALSE, 'Stairs between Ground and First'),
            (stairs_1_id, stairs_2_id, 4.0, TRUE, FALSE, 'Stairs between First and Second'),
            (stairs_g_id, stairs_2_id, 8.0, TRUE, FALSE, 'Stairs between Ground and Second');
        
        RAISE NOTICE '✓ Sample hospital building with indoor navigation created successfully!';
    ELSE
        RAISE NOTICE 'ℹ No hospital project found. Skipping sample data creation.';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '⚠ Error creating sample data: %. Continuing anyway.', SQLERRM;
END $$;

-- ============================================================
-- HELPER VIEWS
-- ============================================================

-- View for easy room searching
CREATE OR REPLACE VIEW v_searchable_rooms AS
SELECT 
    r.id,
    r.name,
    r.type,
    r.room_number,
    r.keywords,
    f.floor_number,
    f.name AS floor_name,
    b.name AS building_name,
    b.id AS building_id,
    p.name AS project_name,
    p.id AS project_id
FROM rooms r
JOIN floors f ON r.floor_id = f.id
JOIN buildings b ON f.building_id = b.id
LEFT JOIN projects p ON b.project_id = p.id;

COMMENT ON TABLE buildings IS 'Public buildings with indoor navigation support';
COMMENT ON TABLE floors IS 'Individual floors within buildings';
COMMENT ON TABLE rooms IS 'Rooms, departments, and points of interest';
COMMENT ON TABLE connections IS 'Graph edges for indoor pathfinding';
