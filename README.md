# Fit GPT

AI-powered workout tracking app with intelligent workout plan parsing.

## Project Overview

A full-stack workout tracking application that allows users to:
- Track workouts with exercises, sets, reps, and weights
- Parse AI-generated workout plans into structured, trackable workouts
- Manage workout history and progress

**Core Feature**: AI workout parser that converts unstructured text into interactive workout sessions.

![Demo](/assets/demo_2025-11-30.mov)

## Tech Stack

**Backend** (`/backend`)
- Express.js + TypeScript
- PostgreSQL + Kysely
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
cp .env.example .env  # Configure PostgreSQL connection and JWT secret
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
│   │   ├── db/                # Database connection, types, and schemas
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
- **Database**: `backend/src/db/` - Database connection, types, and schemas
- **Types**: `backend/src/types/` - TypeScript interfaces and types
- **Tests**: `backend/tests/integration/routes/` - Integration tests with PostgreSQL testcontainers

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
npm run test:unit

# Run integration tests
cd backend
npm run test:integration

# Run specific test file
npm run test:integration -- tests/integration/<path-to-integration-test>
npm run test:unit -- tests/unit/<path-to-unit-test>

# Type checking
npm run type-check
```

## Environment Setup

**Backend** (`backend/.env`):
- `DATABASE_URL` - PostgreSQL connection string (or use individual `POSTGRES_*` variables)
- `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` - PostgreSQL connection details
- `JWT_SECRET` - Secret key for JWT tokens
- `PORT` - API server port (default: 3000)
- `ANTHROPIC_API_KEY` - Anthropic API key

**Frontend** (`frontend/.env`):
- `API_BASE_URL` - Backend API URL (e.g., `http://localhost:3000/api`)
