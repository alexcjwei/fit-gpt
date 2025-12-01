# Fit GPT

AI-powered workout tracking application that parses unstructured workout plans into interactive, trackable sessions.

## Demo

https://github.com/user-attachments/assets/c3053c71-e3ac-4912-b793-036ad0869ab9

## Features

- **AI Workout Parser** - Converts natural language workout plans into structured, trackable workouts using a 5-stage parsing pipeline ([details](docs/WORKOUT_PARSE_FLOW.md))
- **Workout Tracking** - Track exercises, sets, reps, weights, and rest periods
- **Progress History** - View workout history and performance over time
- **REST API** - Full-featured API with Swagger documentation

## Tech Stack

**Backend**: Express • TypeScript • PostgreSQL • Kysely • JWT

**Frontend**: React Native • Expo • TypeScript • React Query • React Navigation

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Expo CLI (for mobile development)

### Setup

```bash
# Backend
cd backend
npm install
cp .env.example .env  # Configure database and JWT secret
npm run dev           # http://localhost:3000

# Frontend
cd frontend
npm install
cp .env.example .env  # Configure API endpoint
npm start             # Expo development server
```

See [`backend/README.md`](backend/README.md) and [`frontend/README.md`](frontend/README.md) for detailed setup instructions.

## Architecture

**Clean Architecture** with dependency injection using factory functions:
- **Repositories** → **Services** → **Controllers** → **Routes**
- Full type safety with TypeScript throughout
- Integration testing with PostgreSQL test containers
- JWT authentication with token refresh

## Project Structure

```
fit-gpt/
├── backend/          # Express REST API
├── frontend/         # React Native mobile app
└── docs/             # Technical documentation
```

## Documentation

- **API Docs**: `http://localhost:3000/api-docs` (Swagger UI)
- **Workout Parser**: [5-stage parsing pipeline](docs/WORKOUT_PARSE_FLOW.md)
- **Backend Setup**: [backend/README.md](backend/README.md)
- **Frontend Setup**: [frontend/README.md](frontend/README.md)

## License

MIT
