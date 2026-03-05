# DishaSetu - New Features Quick Start Guide

This guide covers the two major new features added to DishaSetu:

1. **Government Data Import System**
2. **Indoor Navigation System**

---

## 🏛️ Feature 1: Government Data Import

### What It Does

Import real civic infrastructure projects from government open data portals directly into DishaSetu.

### Quick Start

```bash
# 1. Download data from data.gov.in (CSV or JSON format)
# 2. Place file in backend/data/
cp ~/Downloads/projects.csv backend/data/projects.csv

# 3. Run import script
cd backend
node scripts/importGovernmentProjects.js

# Output:
# ✅ Successfully imported: 142 projects
# ⏭️  Skipped (duplicates):  5 projects
# ❌ Errors:                3 projects
```

### Supported Data Sources

- **Open Government Data Platform India**: https://data.gov.in
- **State Government Portals**: Karnataka, Maharashtra, Tamil Nadu, etc.
- **Smart Cities Mission**: https://smartcities.gov.in
- **Municipal Corporation Websites**: BBMP, BMC, GHMC, etc.

### CSV Format Required

```csv
name,category,department,contractor,budget,start_date,completion_date,status,progress,area,district,lat,lng,description,impact
"Project Name","road","PWD","L&T","₹85 Cr","2024-01-15","2025-12-31","in progress","42","Area","District","12.9716","77.5946","Description","Impact"
```

**Required fields**: `name`, `lat`, `lng`  
**Optional fields**: All others (auto-filled with defaults)

### Features

✅ Automatic category normalization (road/roads/highway → Road)  
✅ Status normalization (ongoing/in progress → In Progress)  
✅ Budget parsing (₹120 Cr → 1,200,000,000)  
✅ Duplicate detection (by name + district)  
✅ Auto-create departments and contractors  
✅ Validation and error reporting  

### Example Usage

**Importing Karnataka Road Projects**:
```bash
# Download from data.gov.in: "Karnataka Highway Development Projects"
# Save as: backend/data/projects.csv
node scripts/importGovernmentProjects.js
```

**Importing Smart Cities Data**:
```bash
# Download from SmartCities portal: JSON format
# Save as: backend/data/projects.json
node scripts/importGovernmentProjects.js
```

---

## 🗺️ Feature 2: Indoor Navigation System

### What It Does

Provides turn-by-turn navigation inside public buildings (hospitals, universities, government offices) with:

- Floor maps
- Room search (e.g., "Radiology", "ICU", "Accounts Office")
- Shortest path calculation (Dijkstra's algorithm)
- Wheelchair-accessible routing
- Multi-floor navigation (elevator/stairs)

### Database Setup

```bash
# Run the indoor navigation migration
cd backend
node migrations/run.js 002_indoor_navigation

# This creates:
# - buildings table
# - floors table
# - rooms table
# - connections table (graph edges)
# - Sample hospital data
```

### How to Use (User Perspective)

1. Open project detail page (e.g., "Rajajinagar Hospital")
2. Tap **"Indoor Navigation"** button (appears if building has indoor maps)
3. Search for destination: "Radiology"
4. Select start location: "Main Entrance"
5. See turn-by-turn directions:
   ```
   1. Start at Main Entrance (Floor 0)
   2. Proceed to Elevator 1
   3. Take elevator to Floor 1
   4. Continue to Radiology Department
   5. Arrive at Radiology Department (Floor 1)
   ```

### How to Add Indoor Maps (Admin)

#### Step 1: Add Building

```sql
INSERT INTO buildings (project_id, name, campus, description, location, total_floors)
VALUES (
    '<project-uuid>',
    'City Hospital - Main Block',
    'City Hospital Campus',
    'Multi-specialty hospital with emergency services',
    ST_MakePoint(77.5530, 12.9915)::geography,
    3
);
```

#### Step 2: Add Floors

```sql
INSERT INTO floors (building_id, floor_number, name, description)
VALUES 
    ('<building-uuid>', 0, 'Ground Floor', 'Reception, Emergency, Pharmacy'),
    ('<building-uuid>', 1, 'First Floor', 'General Wards, Radiology'),
    ('<building-uuid>', 2, 'Second Floor', 'ICU, Surgery');
```

#### Step 3: Add Rooms

```sql
INSERT INTO rooms (floor_id, name, type, room_number, x_coordinate, y_coordinate, is_landmark, keywords)
VALUES 
    ('<floor-uuid>', 'Main Entrance', 'entrance', NULL, 0.5, 0.1, TRUE, ARRAY['entrance', 'gate', 'entry']),
    ('<floor-uuid>', 'Radiology Department', 'department', '1-R', 0.6, 0.3, TRUE, ARRAY['radiology', 'xray', 'scan', 'imaging']),
    ('<floor-uuid>', 'Elevator 1', 'elevator', NULL, 0.5, 0.7, TRUE, ARRAY['elevator', 'lift']);
```

#### Step 4: Add Connections (Navigation Paths)

```sql
INSERT INTO connections (from_room, to_room, distance, is_bidirectional, is_accessible)
VALUES 
    ('<entrance-uuid>', '<reception-uuid>', 5.0, TRUE, TRUE),
    ('<reception-uuid>', '<elevator-uuid>', 10.0, TRUE, TRUE),
    ('<elevator-ground-uuid>', '<elevator-first-uuid>', 3.0, TRUE, TRUE);  -- Cross-floor
```

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/buildings` | List all buildings with indoor nav |
| GET | `/api/buildings/:id` | Get building details + floors |
| GET | `/api/buildings/:id/floors` | Get floors in building |
| GET | `/api/floors/:id/rooms` | Get rooms on floor |
| GET | `/api/navigation/search?q=radiology` | Search rooms by keyword |
| GET | `/api/navigation/route?from=<id>&to=<id>&accessible=true` | Get shortest path |

### Frontend Components

**New Screen**: [frontend/app/indoor/[buildingId].jsx](frontend/app/indoor/[buildingId].jsx)

Features:
- Floor selector tabs
- Room search with live results
- Room selection (tap to select start/destination)
- Turn-by-turn directions display
- Accessibility toggle (wheelchair-accessible routes only)

**Integration**: Added button to project detail page:
```jsx
{building && (
    <TouchableOpacity onPress={() => router.push(`/indoor/${building.id}`)}>
        <Text>Indoor Navigation</Text>
    </TouchableOpacity>
)}
```

### Sample Data Included

The migration includes a sample hospital with:

**Building**: Rajajinagar General Hospital  
**Floors**: 3 (Ground, First, Second)  
**Rooms**: 15+ (Entrance, Reception, Emergency, Pharmacy, ICU, Radiology, Labs, etc.)  
**Connections**: 25+ (corridors, elevators, stairs)  

### How It Works (Technical)

1. **Graph Representation**:
   - Nodes = Rooms
   - Edges = Connections (with distance in meters)
   
2. **Pathfinding**: Dijkstra's algorithm
   ```javascript
   // Service: backend/src/services/indoor-navigation.service.js
   function dijkstra(graph, startId, endId, accessibleOnly) {
       // Returns shortest path as array of room IDs
   }
   ```

3. **Turn-by-turn Directions**:
   ```javascript
   // Converts room IDs to human-readable instructions
   generateDirections(path) {
       // "Start at Main Entrance (Floor 0)"
       // "Take elevator to Floor 1"
       // "Continue to Radiology Department"
   }
   ```

4. **Cross-floor Navigation**:
   - Elevator connections link rooms on different floors
   - Algorithm treats elevators/stairs as nodes with small distances (3-4m)
   - Accessibility mode filters out stairs

---

## 🔄 How Both Features Work Together

### Scenario: Smart Cities Project + Indoor Navigation

1. **Import Smart Cities dataset** (includes university campus project)
   ```bash
   node scripts/importGovernmentProjects.js
   ```

2. **Add indoor maps** for university library building
   ```sql
   INSERT INTO buildings (project_id, name, ...) VALUES (...);
   ```

3. **User discovers project** on home screen (sorted by distance)

4. **User taps project** → Sees "Indoor Navigation" button

5. **User navigates** to "Reference Section" in library

### Full User Flow

```
[Open App]
    ↓
[Home Screen: Projects sorted by distance]
    ↓
[Tap "University Library Renovation"]
    ↓
[See project details + "Indoor Navigation" button]
    ↓
[Tap "Indoor Navigation"]
    ↓
[Search "Reference Section"]
    ↓
[Select start: "Main Entrance"]
    ↓
[Select destination: "Reference Section"]
    ↓
[See route: Entrance → Elevator → Floor 2 → Reference Section]
```

---

## 🧪 Testing the New Features

### Test 1: Government Data Import

```bash
# Use sample template
cd backend
node scripts/importGovernmentProjects.js

# Should create sample-template.csv with 1 project
# Edit the file, add more projects
# Run again to import
```

### Test 2: Indoor Navigation

```bash
# 1. Run migration
node migrations/run.js 002_indoor_navigation

# 2. Start backend
npm start

# 3. Test API
curl http://localhost:8080/api/buildings
# Should return sample hospital

curl "http://localhost:8080/api/navigation/search?q=radiology"
# Should return Radiology Department

curl "http://localhost:8080/api/navigation/route?from=<entrance-id>&to=<radiology-id>"
# Should return shortest path with directions
```

### Test 3: End-to-End

1. Start backend: `cd backend && npm start`
2. Start frontend: `cd frontend && npx expo start`
3. Open app on device
4. Grant location permission
5. Browse projects on home screen
6. Open hospital project
7. Tap "Indoor Navigation"
8. Search for "Radiology"
9. Select start/destination
10. View turn-by-turn directions

---

## 📋 Deployment Checklist

### Before Deploying

- [ ] Run database migration: `node migrations/run.js`
- [ ] Import initial government data: `node scripts/importGovernmentProjects.js`
- [ ] Add indoor maps for key buildings (hospitals, colleges)
- [ ] Test all API endpoints
- [ ] Test mobile app with real device
- [ ] Verify existing features still work

### Production Deployment

1. **Database**:
   - Run migration 002_indoor_navigation.sql on production DB
   - Import production data using import script

2. **Backend**:
   - Deploy updated code to Vercel/Render
   - Verify new API routes work

3. **Frontend**:
   - Build new version: `eas build --platform all`
   - Submit to App Store / Play Store

---

## 🐛 Troubleshooting

### Import Script Issues

**Problem**: "No data file found"  
**Solution**: Place CSV/JSON file in `backend/data/` folder

**Problem**: "Invalid coordinates"  
**Solution**: Verify lat/lng are decimal degrees format (12.9716, not 12°58'18")

**Problem**: "Duplicate project"  
**Solution**: This is normal. Script skips duplicates based on name+district

### Indoor Navigation Issues

**Problem**: "No route found"  
**Solution**: Check connections table. Ensure there's a path between rooms.

**Problem**: "Building not found"  
**Solution**: Verify building exists and is linked to project_id

**Problem**: "Navigation button doesn't appear"  
**Solution**: Check if building exists for this project in buildings table

---

## 📚 Additional Resources

- **Full Architecture**: See [SYSTEM_ARCHITECTURE.md](../SYSTEM_ARCHITECTURE.md)
- **Real Data Import**: See [backend/docs/REAL_DATA_GUIDE.md](../backend/docs/REAL_DATA_GUIDE.md)
- **API Documentation**: Test endpoints using Postman/Insomnia
- **Database Schema**: See [backend/migrations/](../backend/migrations/)

---

## 🎯 Next Steps

1. **Import more data**: Download datasets from data.gov.in
2. **Add more buildings**: Create indoor maps for public institutions
3. **Customize categories**: Update category/status mappings as needed
4. **Enable analytics**: Track which features users use most
5. **Add floor plan images**: Upload actual building floor plans

---

**Questions?** Review the full system architecture or raise an issue in the repository.

**Happy building! 🚀**
