# 🏛️ DishaSetu - Civic Infrastructure Transparency Platform

**DishaSetu** is a comprehensive full-stack mobile application that empowers citizens to discover, monitor, and engage with civic infrastructure projects in their area. The platform combines real-time project tracking, citizen feedback, indoor navigation, and real government data integration.

---

## ✨ Key Features

### 🗺️ Outdoor Features
- **Location-based Discovery** — Find civic projects near you, sorted by distance using PostGIS
- **Real-time Updates** — Live project status changes via Socket.io
- **Geo-fencing Alerts** — Notifications when you enter project areas
- **Project Monitoring** — Track progress, milestones, and budgets
- **Citizen Feedback** — Report issues with photo uploads
- **Google Maps Integration** — Navigate to project sites
- **Analytics Dashboard** — Transparency metrics and insights

### 🏢 Indoor Navigation (NEW)
- **Building Navigation** — Navigate inside hospitals, colleges, government offices
- **Room Search** — Find departments by name: "Radiology", "ICU", "Accounts Office"
- **Turn-by-turn Directions** — Shortest path using Dijkstra's algorithm
- **Multi-floor Navigation** — Elevator and staircase routing
- **Accessibility Mode** — Wheelchair-accessible routes only
- **Floor Plans** — Visual floor maps with room locations

### 📊 Government Data Import (NEW)
- **Real Dataset Integration** — Import projects from data.gov.in
- **CSV/JSON Support** — Flexible data format handling
- **Auto-normalization** — Category, status, and budget parsing
- **Duplicate Detection** — Prevents data duplication
- **Batch Processing** — Import hundreds of projects at once

---

## 🏗️ Technology Stack

### Frontend
- **React Native** with Expo SDK 52
- **NativeWind** (Tailwind CSS)
- **Expo Router** (file-based navigation)
- **Socket.io Client** (real-time)

### Backend
- **Node.js** + **Express.js**
- **PostgreSQL** + **PostGIS** (spatial queries)
- **Socket.io** (WebSocket)
- **Neon** (serverless database hosting)

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL with PostGIS extension (or Neon account)
- Expo CLI
- Physical device or emulator

### 1. Clone Repository

```bash
git clone <repository-url>
cd Disha-Setu
```

### 2. Setup Backend

```bash
cd backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env
# Edit .env with your DATABASE_URL and other credentials

# Run database migrations
node migrations/run.js

# (Optional) Import sample government data
node scripts/importGovernmentProjects.js

# Start server
npm start
# Server runs on http://localhost:8080
```

### 3. Setup Frontend

```bash
cd frontend

# Install dependencies
npm install

# Create .env file
cp .env.example .env
# Edit .env with EXPO_PUBLIC_API_URL=http://localhost:8080

# Start Expo dev server
npx expo start

# Scan QR code with Expo Go app (iOS/Android)
# Or press 'a' for Android emulator, 'i' for iOS simulator
```

---

## 📖 Documentation

- **[System Architecture](SYSTEM_ARCHITECTURE.md)** — Complete technical overview
- **[New Features Guide](NEW_FEATURES_GUIDE.md)** — Quick start for new capabilities
- **[Real Data Import Guide](backend/docs/REAL_DATA_GUIDE.md)** — How to import government datasets
- **[Backend README](backend/README.md)** — API documentation
- **[Frontend README](frontend/README.md)** — Mobile app development guide

---

## 🗂️ Project Structure

```
Disha-Setu/
├── backend/                      # Node.js API server
│   ├── migrations/               # Database migrations
│   │   ├── 001_init.sql         # Initial schema
│   │   └── 002_indoor_navigation.sql  # Indoor nav tables
│   ├── scripts/
│   │   └── importGovernmentProjects.js  # Data import tool
│   ├── src/
│   │   ├── controllers/         # Request handlers
│   │   ├── routes/              # API endpoints
│   │   ├── services/            # Business logic
│   │   │   └── indoor-navigation.service.js  # Dijkstra pathfinding
│   │   ├── jobs/                # Cron jobs (geo-fencing, analytics)
│   │   └── sockets/             # WebSocket handlers
│   └── server.js                # Entry point
│
├── frontend/                     # React Native app
│   ├── app/                     # Expo Router pages
│   │   ├── (tabs)/              # Bottom navigation
│   │   │   ├── home.jsx         # Project feed
│   │   │   └── ...
│   │   ├── project/[id].jsx     # Project details
│   │   └── indoor/[buildingId].jsx  # Indoor navigation
│   ├── services/                # API client layer
│   │   ├── projectService.js
│   │   └── indoorNavigationService.js
│   └── components/              # Reusable UI components
│
├── SYSTEM_ARCHITECTURE.md       # Full technical documentation
├── NEW_FEATURES_GUIDE.md        # New features quick start
└── README.md                    # This file
```

---

## 🎯 Use Cases

### For Citizens
1. **Discover Projects** — "What's being built near me?"
2. **Monitor Progress** — "How far along is the metro extension?"
3. **Report Issues** — "There's a safety concern at the site"
4. **Navigate Indoors** — "Where is the X-ray department in this hospital?"

### For Government
1. **Transparency** — Showcase infrastructure investments
2. **Citizen Engagement** — Receive feedback directly
3. **Data Centralization** — Import and maintain project database
4. **Analytics** — Track civic engagement metrics

---

## 🔑 Key Innovations

1. **PostGIS Spatial Queries** — Efficient distance-based project discovery
2. **Graph-based Indoor Navigation** — Dijkstra's algorithm for optimal pathfinding
3. **Real-time WebSocket Updates** — Instant project status notifications
4. **Automated Geo-fencing** — Background job triggers location-based alerts
5. **Government Data Pipeline** — Seamless import from open data portals
6. **Multi-modal Authentication** — OTP, Google OAuth, Guest mode

---

## 🌐 API Endpoints

### Core Endpoints

```
POST   /api/auth/send-otp          # Send OTP
POST   /api/auth/verify-otp        # Login with OTP
GET    /api/projects               # List projects (supports ?lat=&lng=)
GET    /api/projects/:id           # Project details
POST   /api/feedback               # Submit feedback
GET    /api/notifications          # User notifications
```

### Indoor Navigation (NEW)

```
GET    /api/buildings                    # List buildings with indoor maps
GET    /api/buildings/:id                # Building details + floors
GET    /api/floors/:id/rooms             # Rooms on floor
GET    /api/navigation/search?q=...      # Search rooms
GET    /api/navigation/route?from=&to=   # Calculate shortest path
```

---

## 📊 Database Schema

### Core Tables
- **users** — User accounts (phone, Google, guest)
- **projects** — Civic projects with PostGIS location field
- **milestones** — Project timeline tracking
- **feedback_reports** — Citizen feedback with photos
- **notifications** — User notifications

### Indoor Navigation Tables (NEW)
- **buildings** — Public buildings with indoor maps
- **floors** — Individual floors within buildings
- **rooms** — Rooms, departments, points of interest
- **connections** — Graph edges for pathfinding (distance, accessibility)

---

## 🔧 Configuration

### Backend Environment Variables

```env
DATABASE_URL=postgresql://user:pass@host/database
PORT=8080
JWT_SECRET=your-secret-key
GOOGLE_CLIENT_ID=...
CLOUDINARY_CLOUD_NAME=...
TWILIO_ACCOUNT_SID=...
```

### Frontend Environment Variables

```env
EXPO_PUBLIC_API_URL=http://localhost:8080
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=...
```

---

## 🧪 Testing

### Backend Testing

```bash
cd backend

# Test health endpoint
curl http://localhost:8080/health

# Test projects API
curl http://localhost:8080/api/projects

# Test indoor navigation
curl http://localhost:8080/api/buildings
```

### Frontend Testing

1. Start Expo dev server
2. Scan QR code with Expo Go app
3. Grant location permission
4. Browse projects on home screen
5. Open project with indoor navigation
6. Test room search and routing

---

## 📱 Mobile App Features

### Home Screen
- Project feed sorted by distance
- Category filters
- Pull-to-refresh
- Real-time location updates

### Project Detail
- Progress tracking with milestones
- Civic impact metrics
- Updates timeline
- Photo gallery
- "Get Directions" (Google Maps)
- "Indoor Navigation" button (if available)
- Feedback submission

### Indoor Navigation Screen
- Floor selector
- Room search with live results
- Interactive room selection
- Turn-by-turn directions
- Accessibility toggle
- Distance display

### Notifications
- New project alerts
- Status change updates
- Geo-fence entry notifications
- Feedback status updates

---

## 🎨 Design System

- **Primary Color**: #00D4AA (Teal)
- **Dark Mode**: Full support
- **Typography**: System fonts with Tailwind classes
- **Icons**: Ionicons, MaterialIcons
- **Layout**: Responsive with safe area handling

---

## 🚢 Deployment

### Backend (Vercel/Render)

```bash
cd backend
vercel --prod
# or
git push origin main  # Auto-deploy on Render
```

### Frontend (EAS Build)

```bash
cd frontend
eas build --platform android
eas build --platform ios
eas submit --platform android
```

### Database (Neon)

1. Create Neon project
2. Enable PostGIS extension
3. Run migrations: `node migrations/run.js`
4. Import data: `node scripts/importGovernmentProjects.js`

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Commit changes: `git commit -am 'Add new feature'`
4. Push to branch: `git push origin feature/new-feature`
5. Submit a pull request

---

## 📋 Roadmap

### Completed ✅
- [x] Project discovery with PostGIS
- [x] Real-time updates via Socket.io
- [x] Geo-fencing notifications
- [x] Citizen feedback system
- [x] Government data import
- [x] Indoor navigation system

### In Progress 🚧
- [ ] Floor plan image overlays
- [ ] AR indoor navigation
- [ ] Multi-language support
- [ ] Offline mode

### Planned 🎯
- [ ] Citizen voting on projects
- [ ] Contractor ratings
- [ ] Project photo timeline
- [ ] Chatbot for queries
- [ ] API rate limiting
- [ ] Admin dashboard (web)

---

## 📄 License

This project is licensed under the MIT License.

---

## 🙏 Acknowledgments

- **Open Government Data Platform India** (data.gov.in) for civic datasets
- **PostGIS** for spatial database capabilities
- **Neon** for serverless PostgreSQL hosting
- **Expo** for React Native development platform

---

## 📞 Support

For questions or issues:
- Check [SYSTEM_ARCHITECTURE.md](SYSTEM_ARCHITECTURE.md) for technical details
- Review [NEW_FEATURES_GUIDE.md](NEW_FEATURES_GUIDE.md) for feature usage
- Open an issue in the repository

---

**Built with ❤️ for civic transparency and citizen engagement**

---

## Quick Command Reference

```bash
# Backend
cd backend
npm install
node migrations/run.js
node scripts/importGovernmentProjects.js
npm start

# Frontend
cd frontend
npm install
npx expo start

# Build for production
eas build --platform all
```

---

**Version**: 2.0.0 (with Indoor Navigation & Government Data Import)
**Last Updated**: March 2026
