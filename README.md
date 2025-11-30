# Fit GPT

AI-powered workout tracking app with intelligent workout plan parsing.

## Project Overview

A full-stack workout tracking application that allows users to:
- Track workouts with exercises, sets, reps, and weights
- Parse AI-generated workout plans into structured, trackable workouts
- Manage workout history and progress

**Core Feature**: AI workout parser that converts unstructured text into interactive workout sessions.

## Demo
https://github.com/user-attachments/assets/c3053c71-e3ac-4912-b793-036ad0869ab9

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

## Prerequisites

- **Node.js** 18+ and npm
- **Docker** (required for local database and integration tests)
- **Docker Compose** (usually included with Docker Desktop)

## Quick Start

### 1. Start the Database

```bash
# Start PostgreSQL and Redis using Docker Compose
docker-compose up -d

# Verify containers are running
docker ps
```

### 2. Backend Setup

```bash
cd backend
npm install

# Configure environment variables
cp .env.example .env
# Edit .env to add your ANTHROPIC_API_KEY
# Default database settings work with docker-compose

# Run database migrations
npm run migrate:up

# Optional: Seed exercise database
npm run seed:exercises

# Start development server
npm run dev           # Runs on http://localhost:3000
```

### 3. Frontend Setup

```bash
cd frontend
npm install

# Configure environment variables
cp .env.example .env
# Default API_BASE_URL (http://localhost:3000/api) should work

# Start Expo development server
npm start
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

**Note**: Integration tests require Docker to be running. They use Testcontainers to spin up isolated PostgreSQL instances automatically.

```bash
cd backend

# Run unit tests (no Docker required)
npm run test:unit

# Run integration tests (Docker must be running)
npm run test:integration

# Run specific test file
npm run test:integration -- tests/integration/<path-to-integration-test>
npm run test:unit -- tests/unit/<path-to-unit-test>

# Type checking
npm run type-check
```

## Environment Setup

### Backend (`backend/.env`)

Copy `backend/.env.example` to `backend/.env` and configure:

**Required:**
- `ANTHROPIC_API_KEY` - Your Anthropic API key for AI workout parsing
- `OPENAI_API_KEY` - Your OpenAI API key for exercise embeddings (semantic search)

**Optional:**
- Database connection defaults work with `docker-compose`
- For production, set `DATABASE_URL` or individual `POSTGRES_*` variables
- Generate a secure `JWT_SECRET` for production: `openssl rand -base64 32`

### Frontend (`frontend/.env`)

Copy `frontend/.env.example` to `frontend/.env`. Defaults work for local development.

## Database Management

```bash
cd backend

# Run migrations (creates/updates database schema)
npm run migrate:up

# Rollback last migration
npm run migrate:down

# Seed exercises from Wrkout dataset
npm run seed:exercises

# Generate exercise embeddings for semantic search
npm run generate:embeddings
```
