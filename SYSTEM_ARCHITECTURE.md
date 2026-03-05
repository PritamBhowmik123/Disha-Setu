# DishaSetu - Complete System Architecture

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Technology Stack](#technology-stack)
3. [Backend Structure](#backend-structure)
4. [Database Schema](#database-schema)
5. [API Endpoints](#api-endpoints)
6. [Frontend Structure](#frontend-structure)
7. [Indoor Navigation System](#indoor-navigation-system)
8. [Government Data Import Pipeline](#government-data-import-pipeline)
9. [Real-Time Features](#real-time-features)
10. [Geo-Fencing System](#geo-fencing-system)
11. [Deployment](#deployment)
12. [Development Workflow](#development-workflow)

---

## Architecture Overview

DishaSetu is a full-stack civic infrastructure transparency platform that enables citizens to:

- **Discover** nearby civic infrastructure projects based on location
- **Monitor** project progress with real-time updates
- **Provide** feedback and report issues with photo uploads
- **Navigate** to project sites using Google Maps integration
- **Navigate indoors** in public buildings (hospitals, colleges, government offices)
- **Receive** geo-fenced notifications when entering project areas
- **Access** real government infrastructure datasets

### High-Level Architecture

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│                 │         │                  │         │                 │
│  React Native   │ ◄─────► │   Node.js API    │ ◄─────► │   PostgreSQL    │
│   (Expo App)    │  REST   │   (Express.js)   │  SQL    │   + PostGIS     │
│                 │         │                  │         │                 │
└────────┬────────┘         └────────┬─────────┘         └─────────────────┘
         │                           │
         │ Socket.io                 │ Cron Jobs
         │ WebSocket                 │
         │                           │
         └──────────┬────────────────┘
                    │
         ┌──────────▼──────────┐
         │   Real-time Layer   │
         │   (Socket.io)       │
         └─────────────────────┘
```

---

## Technology Stack

### Frontend

- **Framework**: React Native (Expo SDK 52)
- **Language**: JavaScript (JSX)
- **Navigation**: Expo Router (file-based routing)
- **Styling**: NativeWind (Tailwind CSS for React Native)
- **State Management**: React Context (AuthContext)
- **Real-time**: Socket.io Client
- **Location**: Expo Location API
- **Push Notifications**: Expo Push Notifications
- **Image Upload**: expo-image-picker + Cloudinary

### Backend

- **Runtime**: Node.js v18+
- **Framework**: Express.js
- **Database**: Neon PostgreSQL (serverless)
- **GIS Extension**: PostGIS (spatial queries)
- **Real-time**: Socket.io
- **Authentication**: JWT + Google OAuth 2.0 + OTP
- **File Storage**: Cloudinary
- **Email/SMS**: Twilio (OTP sending)
- **Background Jobs**: node-cron

### Infrastructure

- **Database Hosting**: Neon (serverless PostgreSQL)
- **API Hosting**: Vercel / Render
- **File Storage**: Cloudinary
- **Version Control**: Git

---

## Backend Structure

```
backend/
├── migrations/                    # Database migrations
│   ├── 001_init.sql              # Initial schema
│   ├── 002_indoor_navigation.sql # Indoor navigation tables
│   └── run.js                    # Migration runner
├── scripts/
│   ├── importGovernmentProjects.js  # Import real government data
│   ├── import-real-data.js          # Legacy import script
│   └── verify-project.js            # Project verification tool
├── src/
│   ├── app.js                    # Express app factory
│   ├── config/
│   │   └── db.js                 # Database connection (Neon + pg Pool)
│   ├── controllers/
│   │   ├── analytics.controller.js
│   │   ├── auth.controller.js
│   │   ├── feedback.controller.js
│   │   ├── indoor-navigation.controller.js  # NEW: Indoor navigation
│   │   ├── notifications.controller.js
│   │   ├── projects.controller.js
│   │   └── updates.controller.js
│   ├── jobs/
│   │   ├── analytics.job.js      # Daily analytics computation
│   │   └── geofence.job.js       # Geo-fence notification triggers
│   ├── middleware/
│   │   ├── auth.middleware.js    # JWT verification
│   │   └── upload.middleware.js  # File upload handling
│   ├── routes/
│   │   ├── analytics.routes.js
│   │   ├── auth.routes.js
│   │   ├── feedback.routes.js
│   │   ├── indoor-navigation.routes.js  # NEW: Indoor navigation API
│   │   ├── notifications.routes.js
│   │   ├── projects.routes.js
│   │   └── updates.routes.js
│   ├── services/
│   │   ├── geo.service.js        # PostGIS spatial queries
│   │   ├── indoor-navigation.service.js  # NEW: Dijkstra pathfinding
│   │   ├── notifications.service.js
│   │   └── otp.service.js
│   ├── sockets/
│   │   └── index.js              # Socket.io event handlers
│   └── utils/
│       ├── cloudStorage.js       # Cloudinary integration
│       ├── expoPush.js           # Expo push notifications
│       └── ticketId.js           # Ticket ID generation
├── server.js                     # Server entry point
└── package.json
```

---

## Database Schema

### Core Tables

#### **users**
- `id` (UUID, PK)
- `phone` (VARCHAR, unique)
- `google_id` (VARCHAR, unique)
- `name`, `avatar_url`
- `is_guest` (BOOLEAN)
- `civic_level`, `civic_points` (gamification)
- `created_at`, `updated_at`

#### **projects** (with PostGIS)
- `id` (UUID, PK)
- `name`, `description`, `category`
- `department_id` (FK → departments)
- `contractor_id` (FK → contractors)
- `budget`, `budget_display`
- `start_date`, `expected_completion`, `completion_display`
- `status` (ENUM: Planned, In Progress, Completed, Delayed)
- `progress_percentage` (0-100)
- `area`, `district`
- `image_url`
- **`location` (GEOGRAPHY: POINT)** — PostGIS
- `geofence_radius` (meters)
- `civic_impact`, `beneficiaries`, `impact_stat`
- `delay_reason`

#### **milestones**
- `id` (UUID, PK)
- `project_id` (FK → projects)
- `title`, `completed`, `target_date`, `sort_order`

#### **feedback_reports**
- `id` (UUID, PK)
- `ticket_id` (VARCHAR, unique: "GF-YYYY-XXXX")
- `user_id` (FK → users)
- `project_id` (FK → projects)
- `category` (ENUM: delay, safety, noise, traffic, corruption, other)
- `description`, `photo_url`
- `status` (ENUM: Pending, Under Review, Resolved, Rejected)

#### **notifications**
- `id` (UUID, PK)
- `user_id` (FK → users)
- `project_id` (FK → projects)
- `type` (ENUM: new_project, status_change, completed, delay, geo_fence_alert)
- `title`, `message`
- `is_read`

### Indoor Navigation Tables (NEW)

#### **buildings**
- `id` (UUID, PK)
- `project_id` (FK → projects) — Links to main project
- `name`, `campus`, `description`, `address`
- `location` (GEOGRAPHY: POINT) — Building entrance
- `total_floors`, `image_url`

#### **floors**
- `id` (UUID, PK)
- `building_id` (FK → buildings)
- `floor_number` (INTEGER)
- `name` (e.g., "Ground Floor", "First Floor")
- `map_image_url` — Floor plan image
- `description`

#### **rooms**
- `id` (UUID, PK)
- `floor_id` (FK → floors)
- `name`, `type` (ENUM: entrance, elevator, stairs, department, etc.)
- `room_number`, `description`
- `x_coordinate`, `y_coordinate` — Floor plan coordinates
- `is_accessible` — Wheelchair accessible
- `is_landmark` — Major navigation point
- `keywords` (TEXT[]) — Search keywords

#### **connections** (Graph Edges)
- `id` (UUID, PK)
- `from_room` (FK → rooms)
- `to_room` (FK → rooms)
- `distance` (NUMERIC, meters)
- `is_bidirectional` (BOOLEAN)
- `is_accessible` (BOOLEAN) — Wheelchair accessible route
- `notes` — e.g., "Requires stairs"

### Helper Tables

- **departments**: Department lookup
- **contractors**: Contractor lookup
- **otps**: Temporary OTPs (TTL 10 min)
- **push_tokens**: Expo push notification tokens
- **user_activity**: Activity tracking
- **user_locations**: User location for geo-fencing
- **analytics_cache**: Pre-computed analytics
- **project_updates**: Timeline feed

### Indexes

```sql
-- Spatial indexes (GIST)
CREATE INDEX idx_projects_location ON projects USING GIST(location);
CREATE INDEX idx_buildings_location ON buildings USING GIST(location);
CREATE INDEX idx_user_locations ON user_locations USING GIST(location);

-- Regular indexes
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_category ON projects(category);
CREATE INDEX idx_feedback_status ON feedback_reports(status);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read);

-- Indoor navigation indexes
CREATE INDEX idx_rooms_floor ON rooms(floor_id);
CREATE INDEX idx_connections_from ON connections(from_room);
CREATE INDEX idx_connections_to ON connections(to_room);
CREATE INDEX idx_rooms_keywords ON rooms USING GIN(keywords);
```

---

## API Endpoints

### Authentication (`/api/auth`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/send-otp` | Send OTP to phone |
| POST | `/verify-otp` | Verify OTP and get JWT |
| POST | `/google` | Google OAuth login |
| POST | `/guest` | Guest login |
| GET | `/me` | Get current user (requires auth) |

### Projects (`/api/projects`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List all projects (supports lat/lng sorting) |
| GET | `/nearby` | Find projects within radius |
| GET | `/:id` | Get project details |
| GET | `/:id/updates` | Get project updates timeline |
| POST | `/location` | Update user location (for geo-fencing) |

### Feedback (`/api/feedback`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/` | Submit feedback (requires auth) |
| GET | `/` | Get user's feedback history |
| GET | `/:id` | Get feedback details |

### Notifications (`/api/notifications`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Get user notifications |
| PATCH | `/:id/read` | Mark notification as read |
| POST | `/register-token` | Register Expo push token |

### Analytics (`/api/analytics`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Get analytics dashboard data |

### Indoor Navigation (`/api`) — NEW

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/buildings` | List all buildings with indoor navigation |
| GET | `/buildings/:id` | Get building details with floors |
| GET | `/buildings/:id/floors` | Get floors in a building |
| GET | `/floors/:id` | Get floor details |
| GET | `/floors/:id/rooms` | Get rooms on a floor |
| GET | `/rooms/:id` | Get room details |
| GET | `/navigation/search?q=<query>` | Search rooms by name/keywords |
| GET | `/navigation/route?from=<roomId>&to=<roomId>&accessible=<bool>` | Calculate shortest path |

---

## Frontend Structure

```
frontend/
├── app/                          # Expo Router pages
│   ├── _layout.jsx              # Root layout (AuthContext provider)
│   ├── index.jsx                # Landing/auth screen
│   ├── onboarding.jsx           # Onboarding flow
│   ├── analytics.jsx            # Analytics dashboard
│   ├── feedback.jsx             # Feedback submission
│   ├── updates.jsx              # Updates timeline
│   ├── (tabs)/                  # Bottom tab navigation
│   │   ├── _layout.jsx
│   │   ├── home.jsx             # Project feed
│   │   ├── search.jsx           # Search projects
│   │   ├── activity.jsx         # User activity
│   │   ├── notifications.jsx   # Notifications
│   │   └── settings.jsx         # Settings
│   ├── project/
│   │   └── [id].jsx             # Project detail page
│   └── indoor/                  # NEW: Indoor navigation
│       └── [buildingId].jsx     # Indoor map viewer
├── components/                   # Reusable components
│   ├── location-picker.jsx
│   ├── themed-text.jsx
│   └── ui/
│       ├── collapsible.jsx
│       └── icon-symbol.jsx
├── constants/
│   ├── mockData.js              # Category icons, etc.
│   └── theme.js                 # Theme configuration
├── context/
│   └── AuthContext.jsx          # Global auth state
├── hooks/
│   ├── use-location.js          # Location hook (GPS + manual)
│   └── use-color-scheme.js      # Dark mode hook
├── services/                     # API service layer
│   ├── api.js                   # Base fetch wrapper
│   ├── authService.js
│   ├── projectService.js
│   ├── feedbackService.js
│   ├── notificationService.js
│   ├── analyticsService.js
│   ├── socketService.js         # Socket.io client
│   └── indoorNavigationService.js  # NEW: Indoor nav API
├── utils/
│   └── distance.js              # Haversine distance calculation
└── assets/
    └── images/
```

### Key Frontend Features

- **File-based routing** with Expo Router
- **Global state** via React Context (authentication)
- **Real-time updates** via Socket.io
- **Location tracking** with fallback to manual selection
- **Dark mode** support
- **Push notifications** via Expo
- **Photo upload** to Cloudinary
- **Distance-based sorting** using PostGIS backend

---

## Indoor Navigation System

### Overview

The indoor navigation system allows users to navigate within public buildings (hospitals, universities, government offices) by providing:

1. **Floor maps** with room locations
2. **Room search** by name or keywords (e.g., "Radiology", "ICU")
3. **Turn-by-turn directions** between any two rooms
4. **Accessibility routing** (wheelchair-accessible paths only)
5. **Multi-floor navigation** using elevators/stairs

### Architecture

```
┌─────────────────────┐
│   Buildings         │  (Hospital, University, etc.)
└──────┬──────────────┘
       │ 1:N
┌──────▼──────────────┐
│   Floors            │  (Ground, First, Second, etc.)
└──────┬──────────────┘
       │ 1:N
┌──────▼──────────────┐
│   Rooms             │  (Radiology, ICU, Reception, etc.)
└─────────────────────┘
       ▲
       │ M:N
┌──────┴──────────────┐
│   Connections       │  (Graph edges with distance)
└─────────────────────┘
```

### Pathfinding Algorithm

**Dijkstra's Algorithm** is implemented in [indoor-navigation.service.js](backend/src/services/indoor-navigation.service.js)

```javascript
function dijkstra(graph, startId, endId, accessibleOnly) {
    // 1. Initialize distances to Infinity
    // 2. Set start distance to 0
    // 3. While unvisited nodes remain:
    //    - Find node with minimum distance
    //    - Update neighbors' distances
    //    - Mark as visited
    // 4. Reconstruct path by backtracking
    return { path, distance, found }
}
```

**Graph Building**:
- Nodes = Rooms
- Edges = Connections (with distance in meters)
- Bidirectional edges for corridors
- Unidirectional edges for one-way paths
- Cross-floor edges for elevators/stairs

### Indoor Navigation Flow

1. **User opens project detail** → Sees "Indoor Navigation" button (if building exists)
2. **User taps button** → Opens indoor map viewer
3. **User searches for room** → "Radiology"
4. **User selects start location** → "Main Entrance"
5. **User selects destination** → "Radiology Department"
6. **System calculates route** → Dijkstra's algorithm
7. **User sees directions**:
   ```
   1. Start at Main Entrance (Floor 0)
   2. Proceed to Elevator 1
   3. Take elevator to Floor 1
   4. Continue to Radiology Department (Floor 1)
   5. Arrive at Radiology Department (Floor 1)
   ```

### Sample Data

The migration includes a sample hospital building with:
- **3 floors** (Ground, First, Second)
- **15+ rooms** (Entrance, Reception, Emergency, ICU, Radiology, etc.)
- **20+ connections** (corridors, elevators, stairs)

---

## Government Data Import Pipeline

### Overview

DishaSetu can import real government infrastructure datasets from:
- **Open Government Data Platform India** (data.gov.in)
- **State/Municipal portals**
- **Smart Cities Mission data**

### Import Script

Location: [backend/scripts/importGovernmentProjects.js](backend/scripts/importGovernmentProjects.js)

### Supported Formats

1. **CSV**
   ```csv
   name,category,department,contractor,budget,start_date,completion_date,status,progress,area,district,lat,lng,description,impact
   "NH-44 Road Widening","road","NHAI","L&T","₹85 Cr","2024-01-15","2025-12-31","in progress","42","Yelahanka","Bangalore","13.1007","77.5963","8km stretch","25% faster"
   ```

2. **JSON**
   ```json
   [
     {
       "name": "Metro Line 3",
       "category": "metro",
       "department": "BMRCL",
       "lat": "12.8456",
       "lng": "77.6603",
       ...
     }
   ]
   ```

### Import Process

```bash
# 1. Download data from data.gov.in
# 2. Place in backend/data/projects.csv or projects.json
# 3. Run import script
cd backend
node scripts/importGovernmentProjects.js
```

### Features

- **Category normalization** (e.g., "roads" → "Road")
- **Status normalization** (e.g., "ongoing" → "In Progress")
- **Budget parsing** (₹120 Cr → 1,200,000,000)
- **Duplicate detection** (by name + district)
- **Auto-create departments/contractors**
- **Validation** (requires name, lat, lng)
- **Error handling** (skips invalid records, logs errors)

### Output

```
╔══════════════════════════════════════════════════════════╗
║   DishaSetu - Government Infrastructure Data Import     ║
╚══════════════════════════════════════════════════════════╝

📁 Found 150 records in CSV

✅ [1/150] Imported: NH-44 Road Widening Project
✅ [2/150] Imported: Metro Line 3 Extension
⏭️  [3/150] Skipped (duplicate): District Hospital Upgrade
...

╔══════════════════════════════════════════════════════════╗
║                   Import Complete                        ║
╚══════════════════════════════════════════════════════════╝

✅ Successfully imported: 142 projects
⏭️  Skipped (duplicates):  5 projects
❌ Errors:                3 projects
📊 Total processed:       150 records
```

---

## Real-Time Features

### Socket.io Implementation

**Server**: [backend/src/sockets/index.js](backend/src/sockets/index.js)
**Client**: [frontend/services/socketService.js](frontend/services/socketService.js)

### Events

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `connect` | Client → Server | - | WebSocket connection |
| `user:location` | Client → Server | `{lat, lng}` | User shares location |
| `project:subscribe` | Client → Server | `{projectId}` | Subscribe to project updates |
| `project:update` | Server → Client | `{projectId, title, body}` | Project status changed |
| `geo:alert` | Server → Client | `{projectId, title, message}` | User entered geo-fence |

### Usage Example

```javascript
import { connectSocket, subscribeToProject, onProjectUpdate } from './services/socketService';

// Connect
connectSocket(userId);

// Subscribe to project
subscribeToProject(projectId);

// Listen for updates
onProjectUpdate((payload) => {
    console.log('Project update:', payload);
    // Update UI
});
```

### Real-time Features

1. **Live project updates** — Status changes broadcast to all watching users
2. **Geo-fence alerts** — Notifications when users enter project areas
3. **User location tracking** — For distance-based features

---

## Geo-Fencing System

### Overview

When users enter the vicinity of a civic project (within geofence_radius), they receive a notification.

### Implementation

**Background Job**: [backend/src/jobs/geofence.job.js](backend/src/jobs/geofence.job.js)

**Schedule**: Runs every 5 minutes

### Algorithm

```javascript
// For each user with active location:
//   1. Find projects within 2km (broad search)
//   2. Calculate exact distance using ST_Distance
//   3. If distance < project.geofence_radius:
//      - Check if user was NOT inside before
//      - Send notification ("You're near Hebbal Flyover project!")
//      - Send Expo push notification
//      - Emit Socket.io event
```

### PostGIS Query

```sql
SELECT p.id, p.name, ST_Distance(u.location, p.location) AS distance
FROM user_locations u
CROSS JOIN projects p
WHERE ST_DWithin(u.location, p.location, 2000)  -- 2km pre-filter
  AND ST_Distance(u.location, p.location) < p.geofence_radius
```

### Flow

1. **User opens app** → Grants location permission
2. **App sends location** → `POST /api/projects/location`
3. **Backend stores** → `user_locations` table
4. **Cron job runs** → Every 5 minutes
5. **User enters geo-fence** → Notification sent
6. **User receives alert** → "You're near Metro Extension project!"

---

## Deployment

### Database Setup

```bash
# 1. Create Neon PostgreSQL database
# 2. Enable PostGIS extension
# 3. Set DATABASE_URL environment variable
# 4. Run migrations
cd backend
node migrations/run.js
```

### Backend Deployment

**Option 1: Vercel**
```bash
cd backend
vercel --prod
```

**Option 2: Render**
```yaml
# render.yaml
services:
  - type: web
    name: dishasetu-api
    env: node
    buildCommand: npm install
    startCommand: node server.js
```

### Frontend Deployment

**Development**:
```bash
cd frontend
npx expo start
```

**Production (EAS Build)**:
```bash
eas build --platform android
eas build --platform ios
eas submit --platform android
```

### Environment Variables

**Backend (.env)**:
```env
DATABASE_URL=postgresql://...@neon.tech/dishasetu
PORT=8080
JWT_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
CORS_ORIGINS=http://localhost:19006,exp://192.168.1.10:19000
```

**Frontend (.env)**:
```env
EXPO_PUBLIC_API_URL=https://api.dishasetu.in
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=...
```

---

## Development Workflow

### Backend Development

```bash
cd backend

# Install dependencies
npm install

# Run migrations
node migrations/run.js

# Import sample data (optional)
node scripts/importGovernmentProjects.js

# Start dev server
npm run dev  # or: node server.js
```

### Frontend Development

```bash
cd frontend

# Install dependencies
npm install

# Start Expo dev server
npx expo start

# Run on Android
npx expo start --android

# Run on iOS
npx expo start --ios

# Run on web
npx expo start --web
```

### Testing

1. **Backend**: Test API endpoints using Postman/Insomnia
2. **Frontend**: Test on physical device via Expo Go
3. **Location**: Use mock coordinates for testing geo features
4. **Socket.io**: Use browser console or Postman WebSocket

### Adding a New Feature

1. **Database**: Create migration in `migrations/00X_feature.sql`
2. **Backend**:
   - Create service in `src/services/feature.service.js`
   - Create controller in `src/controllers/feature.controller.js`
   - Create routes in `src/routes/feature.routes.js`
   - Register routes in `src/app.js`
3. **Frontend**:
   - Create service in `services/featureService.js`
   - Create screen in `app/feature.jsx`
   - Update navigation if needed

---

## How It All Works Together

### User Journey: Discover → Monitor → Feedback

1. **User opens app** → Grants location permission
2. **Home screen loads** → Fetches projects sorted by distance
   ```
   GET /api/projects?lat=12.9716&lng=77.5946
   ```
3. **Projects displayed** → With distance badges
4. **User taps project** → Opens detail page
   ```
   GET /api/projects/:id
   GET /api/projects/:id/updates
   ```
5. **User sees progress**, milestones, civic impact
6. **User taps "Indoor Navigation"** (if building has it)
   ```
   GET /api/buildings?project_id=...
   ```
7. **User searches "Radiology"**
   ```
   GET /api/navigation/search?q=radiology
   ```
8. **User selects start → destination**
   ```
   GET /api/navigation/route?from=<room1>&to=<room2>
   ```
9. **User sees turn-by-turn directions**
10. **User reports issue** → Uploads photo
    ```
    POST /api/feedback
    ```
11. **Feedback received** → Ticket ID generated
12. **User gets notification** → When status changes

### Admin Journey: Import Real Data

1. **Download CSV** from data.gov.in
2. **Place in** `backend/data/projects.csv`
3. **Run import**:
   ```bash
   node scripts/importGovernmentProjects.js
   ```
4. **Projects appear** in app immediately
5. **Users discover** new infrastructure projects

---

## Key Innovations

1. **PostGIS Integration** — Efficient spatial queries for distance-based features
2. **Indoor Navigation** — Full graph-based pathfinding with accessibility support
3. **Real-time Updates** — Socket.io for live project status changes
4. **Geo-fencing** — Background job triggers notifications when users enter project areas
5. **Government Data Import** — Automated pipeline for real infrastructure datasets
6. **Civic Gamification** — Points and levels to encourage citizen participation
7. **Multi-modal Auth** — Phone OTP, Google OAuth, and guest mode

---

## System Diagrams

### Data Flow: Project Discovery

```
User Location
    ↓
[POST /api/projects/location]
    ↓
Store in user_locations (PostGIS)
    ↓
[GET /api/projects?lat=X&lng=Y]
    ↓
PostGIS ST_Distance query
    ↓
Projects sorted by distance
    ↓
React Native UI
```

### Data Flow: Indoor Navigation

```
User searches "Radiology"
    ↓
[GET /api/navigation/search?q=radiology]
    ↓
PostgreSQL text search + keywords[]
    ↓
Returns matching rooms
    ↓
User selects start + destination
    ↓
[GET /api/navigation/route?from=A&to=B]
    ↓
Build graph from connections table
    ↓
Dijkstra's algorithm
    ↓
Return path + turn-by-turn directions
    ↓
React Native displays route
```

### Real-time Flow

```
Backend detects project status change
    ↓
Socket.io broadcast: 'project:update'
    ↓
All subscribed clients receive event
    ↓
React Native updates UI instantly
    ↓
Push notification sent via Expo
```

---

## Conclusion

DishaSetu is now a **comprehensive civic infrastructure platform** that provides:

✅ **Outdoor project discovery** with PostGIS distance sorting  
✅ **Indoor navigation** in public buildings with Dijkstra pathfinding  
✅ **Real government datasets** via automated import pipeline  
✅ **Real-time updates** via Socket.io  
✅ **Geo-fenced notifications** triggered by location  
✅ **Citizen feedback** with photo uploads  
✅ **Analytics dashboard** for transparency  

All existing features are preserved and working. The new features seamlessly integrate into the existing architecture.

---

**For questions or support, refer to:**
- Backend README: `backend/README.md`
- Frontend README: `frontend/README.md`
- Real Data Import Guide: `backend/docs/REAL_DATA_GUIDE.md`
