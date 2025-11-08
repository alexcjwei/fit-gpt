# Fit GPT

AI-powered workout tracking app with intelligent workout plan parsing.

## Project Overview

A full-stack workout tracking application that allows users to:
- Track workouts with exercises, sets, reps, and weights
- Parse AI-generated workout plans into structured, trackable workouts
- Manage workout history and progress

**Core Feature**: AI workout parser that converts unstructured text into interactive workout sessions.

## Tech Stack

**Backend** (`/backend`)
- Express.js + TypeScript
- MongoDB + Mongoose
- JWT authentication
- Swagger/OpenAPI docs

**Frontend** (`/frontend`)
- React Native + Expo
- TypeScript
- TanStack Query (React Query)
- React Navigation

## Quick Start

```bash
# Backend
cd backend
npm install
cp .env.example .env  # Configure MongoDB URI and JWT secret
npm run dev           # Runs on http://localhost:3000

# Frontend
cd frontend
npm install
npm start            # Expo development server
```

## Directory Structure

```
fit-gpt/
├── backend/                    # Express API server
│   ├── src/
│   │   ├── controllers/        # Route handlers
│   │   ├── models/            # Mongoose schemas (User, Workout, Exercise)
│   │   ├── routes/            # API endpoints (/api/*)
│   │   ├── services/          # Business logic (workout parsing, AI integration)
│   │   ├── middleware/        # Auth, error handling
│   │   ├── types/             # TypeScript definitions
│   │   └── config/            # DB and environment setup
│   ├── tests/                 # Integration and unit tests
│   └── docs/                  # Backend-specific docs (Swagger guide)
│
├── frontend/                   # React Native mobile app
│   ├── src/
│   │   ├── screens/           # Screen components
│   │   ├── components/        # Reusable UI components
│   │   ├── navigation/        # Navigation setup
│   │   ├── api/              # API client and React Query
│   │   ├── contexts/         # React contexts (auth, theme)
│   │   ├── hooks/            # Custom hooks
│   │   ├── types/            # TypeScript definitions
│   │   └── utils/            # Utility functions
│   └── README.md             # Frontend setup guide
```

## Key Locations

### Backend
- **API Routes**: `backend/src/routes/` - Auth, workouts, exercises, users
- **API Docs**: `http://localhost:3000/api-docs` (Swagger UI when running)
- **Models**: `backend/src/models/` - User, Workout, Exercise schemas
- **Types**: `backend/src/types/` - TypeScript interfaces and types
- **Tests**: `backend/tests/integration/routes/` - Integration tests with in-memory MongoDB

### Frontend
- **Screens**: `frontend/src/screens/` - UI screens
- **API Client**: `frontend/src/api/client.ts` - Axios instance with JWT interceptors
- **Types**: `frontend/src/types/` - TypeScript interfaces matching backend models
- **Navigation**: `frontend/src/navigation/` - React Navigation setup

## API Documentation

Interactive API docs available at `http://localhost:3000/api-docs` when backend is running.

## Testing

```bash
# Run unit tests
cd backend
npm test unit

# Run integration tests
cd backend
npm test integration

# Run specific test file
npm test -- tests/integration/routes/auth.routes.test.ts

# Type checking
npm run type-check
```

## Environment Setup

**Backend** (`backend/.env`):
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `PORT` - API server port (default: 3000)
- `ANTHROPIC_API_KEY` - Anthropic API key

**Frontend** (`frontend/.env`):
- `API_BASE_URL` - Backend API URL (e.g., `http://localhost:3000/api`)
