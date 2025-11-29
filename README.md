# Live Cricket Application

A full-stack cricket scoring application with real-time updates.

## Features

- **Admin View**: Match management, squad selection, live scoring
- **Display UI**: Public-facing scoreboard with multiple views
- **Real-time Updates**: Server-Sent Events for live score broadcasting
- **Match Formats**: T20 and ODI support

## Tech Stack

- **Frontend**: Angular 17, Tailwind CSS
- **Backend**: Express.js, Node.js
- **Database**: MongoDB
- **Real-time**: Server-Sent Events (SSE)
- **Containerization**: Docker

---

## Quick Start

### Option A: Docker (Recommended for Production)

```bash
# Start everything (app + MongoDB)
docker-compose up --build

# Or run in detached mode
docker-compose up --build -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

Access the app at: http://localhost:3000

### Option B: Local Development

#### Prerequisites

- Node.js 18+
- MongoDB (local or Docker)

#### 1. Install Dependencies

```bash
npm install              # Install root dependencies (concurrently)
npm run install:all      # Install backend and frontend dependencies
```

Or in one line:
```bash
npm install && npm run install:all
```

#### 2. Start MongoDB

**Option 1: Using Docker (easiest)**
```bash
npm run db:start
```

**Option 2: Local MongoDB**
Make sure MongoDB is running on `mongodb://localhost:27017`

#### 3. Development Mode (with hot reload)

```bash
npm run dev
```

This starts:
- Backend on http://localhost:3000
- Frontend on http://localhost:4200 (with proxy to backend)

#### 4. Production Mode (local)

```bash
# Build frontend and copy to backend
npm run build

# Start the server
npm start
```

Access the app at: http://localhost:3000

---

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm install` | Install root dependencies |
| `npm run install:all` | Install backend and frontend dependencies |
| `npm run dev` | Start both backend and frontend in development mode |
| `npm run build` | Build frontend and copy to backend/public |
| `npm start` | Start backend server (serves built frontend) |
| `npm run db:start` | Start MongoDB using Docker |
| `npm run db:stop` | Stop MongoDB Docker container |
| `npm run docker:prod` | Start production Docker containers |
| `npm run docker:dev` | Start development Docker containers |
| `npm run clean` | Clean build artifacts |
| `npm run clean:all` | Clean build artifacts and node_modules |

---

## Environment Variables

Create a `.env` file in the `backend` folder:

```env
# Server
NODE_ENV=development
PORT=3000

# MongoDB
MONGODB_URI=mongodb://localhost:27017/livecricket

# Authentication
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=24h
ADMIN_USERNAME=admin
ADMIN_PASSWORD=cricket123
```

For Docker, these are configured in `docker-compose.yml`.

---

## Project Structure

```
livecricket/
├── backend/                 # Express.js API
│   ├── src/
│   │   ├── config/         # Configuration
│   │   ├── middleware/     # Express middleware
│   │   ├── models/         # Mongoose models
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   └── app.js          # Entry point
│   └── public/             # Built frontend (generated)
├── frontend/               # Angular application
│   ├── src/
│   │   ├── app/
│   │   │   ├── admin/      # Admin module
│   │   │   ├── display/    # Display UI module
│   │   │   └── core/       # Shared services, guards
│   │   └── ...
│   └── ...
├── documentation/          # Project docs
├── scripts/                # Build scripts
├── docker-compose.yml      # Production Docker config
├── docker-compose.dev.yml  # Development Docker config
├── Dockerfile              # Multi-stage build
└── package.json            # Root orchestration
```

---

## API Endpoints

### Authentication
- `POST /api/auth/login` - Admin login
- `GET /api/auth/verify` - Verify token

### Countries
- `GET /api/countries` - List all countries
- `POST /api/countries` - Create country (auth required)
- `PUT /api/countries/:id` - Update country (auth required)
- `DELETE /api/countries/:id` - Delete country (auth required)

### Players
- `GET /api/players` - List players (with filters)
- `POST /api/players` - Create player (auth required)
- `PUT /api/players/:id` - Update player (auth required)
- `DELETE /api/players/:id` - Delete player (auth required)

### Matches
- `GET /api/matches` - List matches
- `GET /api/matches/:id` - Get match details
- `POST /api/matches` - Create match (auth required)
- `PUT /api/matches/:id/squad` - Set squad (auth required)
- `PUT /api/matches/:id/toss` - Record toss (auth required)
- `POST /api/matches/:id/start` - Start match (auth required)
- `GET /api/matches/:id/live` - SSE live updates

### Health Check
- `GET /api/health` - Server health status

---

## Default Credentials

- **Username**: admin
- **Password**: cricket123

⚠️ Change these in production by setting `ADMIN_USERNAME` and `ADMIN_PASSWORD` environment variables.

---

## Documentation

- [Project Specification](documentation/PROJECT_SPECIFICATION.md) - Detailed technical specification
- [Project Checklist](documentation/PROJECT_CHECKLIST.md) - Implementation progress

---

## License

ISC
