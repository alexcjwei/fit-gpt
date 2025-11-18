# Gen Workout Backend

AI-integrated workout tracking API built with Express, TypeScript, and PostgreSQL.

## Architecture

This backend follows a **clean architecture** pattern with **dependency injection** using factory functions:

**Layer 1: Repositories** (`src/repositories/`)
- Data access layer using Kysely (type-safe SQL query builder)
- Factory functions like `createUserRepository(db)` inject the database connection
- Handle all SQL queries and database operations

**Layer 2: Services** (`src/services/`)
- Business logic layer (workout management, exercise search, AI parsing)
- Factory functions like `createWorkoutService(workoutRepo, exerciseRepo)` inject dependencies
- Independent of HTTP/database implementation details

**Layer 3: Controllers** (`src/controllers/`)
- HTTP request/response handlers using Express
- Factory functions like `createWorkoutController(workoutService)` inject services
- Handle validation, error responses, and HTTP status codes

**Layer 4: Routes** (`src/routes/`)
- API endpoint definitions with middleware (auth, validation)
- Factory functions like `createWorkoutRoutes(workoutController)` inject controllers
- Define URL patterns and HTTP methods

**Composition Root** (`src/createApp.ts`)
- Wires all layers together with dependency injection
- Creates app instance with injected database connection
- Single place where all dependencies are configured

This architecture provides:
- ✅ Testability: Easy to mock dependencies in unit tests
- ✅ Maintainability: Clear separation of concerns
- ✅ Flexibility: Swap implementations without changing dependent code
- ✅ Type Safety: Full TypeScript inference through factory patterns

## Quick Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up PostgreSQL

**Option A: Local PostgreSQL**
```bash
# macOS
brew install postgresql
brew services start postgresql

# Ubuntu/Debian
sudo apt-get install postgresql
sudo systemctl start postgresql
```

**Option B: Hosted PostgreSQL**
- [Neon](https://neon.tech) - Serverless Postgres
- [Supabase](https://supabase.com) - Open source Firebase alternative
- [Railway](https://railway.app) - Simple deployment platform

### 3. Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env`:

```env
NODE_ENV=development
PORT=3000

# PostgreSQL Database
DATABASE_URL=postgresql://user:password@localhost:5432/fit_gpt

# JWT Secret - Generate a secure random string
# Run: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=your-generated-secret-key-here
JWT_EXPIRES_IN=7d

# CORS - Frontend URL (update when deploying)
CORS_ORIGIN=http://localhost:3000
```

**Generating JWT Secret:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Start Development Server

```bash
npm run dev
```

Server runs at `http://localhost:3000`

### 5. Verify Setup

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-10-31T...",
  "environment": "development"
}
```

### 6. View API Documentation

Open your browser and navigate to:
- **Swagger UI**: `http://localhost:3000/api-docs`
- **OpenAPI JSON**: `http://localhost:3000/api-docs.json`

The Swagger UI provides interactive API documentation where you can test endpoints directly.

## Project Structure

```
src/
├── config/          # Database & environment setup
├── controllers/     # HTTP request/response handlers (Layer 3)
├── db/              # Kysely database types and connection
├── middleware/      # Auth, error handling
├── repositories/    # Data access layer (Layer 1)
├── routes/          # API endpoint definitions (Layer 4)
├── services/        # Business logic (Layer 2)
├── types/           # TypeScript type definitions
├── utils/           # Helper functions
├── createApp.ts     # Composition root (DI wiring)
└── server.ts        # Entry point
```

## API Documentation

**Interactive Documentation**: `http://localhost:3000/api-docs`

All API endpoints are fully documented with Swagger/OpenAPI. The interactive documentation includes:
- Request/response schemas
- Authentication requirements
- Example payloads
- Try-it-out functionality

Base URL: `/api`

### Quick Reference

**Authentication** (Public)
- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user

**Users** (Protected - requires JWT)
- `GET /api/users/profile` - Get profile
- `PUT /api/users/profile` - Update profile
- `DELETE /api/users/account` - Delete account

**Workouts** (Protected - requires JWT)
- `GET /api/workouts` - List workouts
- `GET /api/workouts/:id` - Get workout
- `POST /api/workouts` - Create workout
- `PUT /api/workouts/:id` - Update workout
- `DELETE /api/workouts/:id` - Delete workout
- `POST /api/workouts/:id/start` - Start workout timer
- `POST /api/workouts/:id/complete` - Complete workout

**Exercises** (Protected - requires JWT)
- `GET /api/exercises/workout/:workoutId` - Get workout exercises
- `POST /api/exercises` - Add exercise
- `PUT /api/exercises/:id` - Update exercise
- `DELETE /api/exercises/:id` - Remove exercise

## Testing

This project uses **integration testing** with real database interactions (via in-memory MongoDB) to ensure end-to-end functionality without mocking.

### Test Stack

- **Jest** - Test framework
- **Supertest** - HTTP assertions for Express apps
- **MongoDB Memory Server** - In-memory MongoDB for isolated tests
- **ts-jest** - TypeScript support for Jest

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch

# Run specific test file
npm test -- tests/integration/routes/auth.routes.test.ts

# Run tests matching a pattern
npm test -- --testNamePattern="should successfully register"
```

### Test Structure

```
tests/
├── integration/
│   ├── repositories/       # Repository integration tests
│   ├── routes/            # API endpoint integration tests
│   └── services/          # Service integration tests
├── unit/
│   ├── middleware/        # Middleware unit tests
│   └── services/          # Service unit tests
└── utils/
    └── testDb.ts          # PostgreSQL test container utilities
```

### Integration Tests

Integration tests use **PostgreSQL test containers** (via Testcontainers) that:
- ✅ Tests the full request/response cycle (routes → controllers → services → repositories → database)
- ✅ Uses real PostgreSQL database operations (no mocks)
- ✅ Runs isolated in Docker containers
- ✅ Never touches your actual PostgreSQL database
- ✅ Provides fresh database state for each test suite

**Example: Auth Routes**

```typescript
// tests/integration/routes/auth.routes.test.ts
describe('POST /api/auth/register', () => {
  it('should successfully register a new user', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      })
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.token).toBeTruthy();
  });
});
```

### Unit Tests

Unit tests mock database operations to test individual service functions in isolation.

**Example: Service Tests**

```typescript
// tests/unit/services/workout.service.test.ts
jest.mock('../../../src/models/Workout');

describe('Workout Service', () => {
  it('should create a workout', async () => {
    MockedWorkout.create.mockResolvedValue(mockWorkout);
    const result = await createWorkout(userId, workoutData);
    expect(result.name).toBe('Test Workout');
  });
});
```

### Test Utilities

**Database Setup** (`tests/utils/testDb.ts`)

```typescript
import * as testDb from '../../utils/testDb';

beforeAll(async () => {
  await testDb.connect();  // Start in-memory MongoDB
});

afterEach(async () => {
  await testDb.clearDatabase();  // Clear data between tests
});

afterAll(async () => {
  await testDb.closeDatabase();  // Cleanup after all tests
});
```

### Coverage

Current test coverage:
- ✅ **Auth Routes**: 22/22 tests passing
  - User registration (10 tests)
  - User login (8 tests)
  - User logout (4 tests)
- ✅ **Workout Service**: 29/29 tests passing
  - Core CRUD operations
  - Block/Exercise/Set operations
- ✅ **Exercise Service**: 14/14 tests passing

### Writing New Tests

1. **Integration tests** - For testing API endpoints end-to-end
   - Location: `tests/integration/routes/`
   - Use `supertest` to make HTTP requests
   - Use in-memory database for real data operations

2. **Unit tests** - For testing service functions in isolation
   - Location: `tests/unit/services/`
   - Mock database models with `jest.mock()`
   - Test business logic independently

### Best Practices

- ✅ Use descriptive test names that explain what's being tested
- ✅ Arrange-Act-Assert pattern
- ✅ Test both success and error cases
- ✅ Isolate tests (each test should be independent)
- ✅ Clean up test data between tests
- ✅ Prefer integration tests for API routes (less mocking, more confidence)
- ✅ Use unit tests for complex business logic

## Scripts

- `npm run dev` - Development with hot reload
- `npm run build` - Build for production
- `npm run type-check` - Check TypeScript types without building
- `npm start` - Run production build
- `npm test` - Run all tests
- `npm run test:watch` - Run tests in watch mode
- `npm run lint` - Lint code
- `npm run format` - Format code with Prettier

## Database Models

### User
Email, password, name, fitness level, goals, injuries, equipment access

### Workout
Title, description, status (planned/in_progress/completed), timing, difficulty, AI-generated flag

### Exercise
Name, sets (reps/weight/duration), rest periods, order, superset grouping

### Set
Reps, weight, duration, distance, completion status, perceived difficulty

## Next Steps

1. **Implement Controllers** - Create `src/controllers/auth.controller.ts` with register/login logic
2. **Add Auth Service** - Hash passwords (bcrypt), generate JWTs
3. **Build Workout Logic** - CRUD operations, timing, history
4. **AI Integration** - Parse AI-generated workout text into structured data
5. **Tests** - Add unit and integration tests

## Example Controller

```typescript
// src/controllers/workout.controller.ts
import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { Workout } from '../models';
import { asyncHandler } from '../utils/asyncHandler';

export const getWorkouts = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const workouts = await Workout.find({ userId: req.userId })
      .sort({ createdAt: -1 });

    res.json({ success: true, data: workouts });
  }
);
```

## Tech Stack

- **Express** - Web framework
- **TypeScript** - Type safety
- **PostgreSQL + Kysely** - Database with type-safe query builder
- **JWT** - Authentication
- **Bcrypt** - Password hashing
- **Helmet** - Security headers
- **Morgan** - Request logging
- **Swagger/OpenAPI** - API documentation
- **Express Validator** - Request validation
- **Jest + Supertest** - Testing framework
- **Testcontainers** - PostgreSQL test containers

## License

MIT
