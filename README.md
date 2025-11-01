# Gen Workout Backend

AI-integrated workout tracking API built with Express, TypeScript, and MongoDB.

## Quick Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up MongoDB

**Option A: Local MongoDB**
```bash
# macOS
brew install mongodb-community
brew services start mongodb-community

# Ubuntu/Debian
sudo apt-get install mongodb
sudo systemctl start mongodb
```

**Option B: MongoDB Atlas (Cloud)**
1. Create account at [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Create a free cluster
3. Click "Connect" → "Connect your application"
4. Copy the connection string (format: `mongodb+srv://username:password@cluster.mongodb.net/dbname`)

### 3. Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env`:

```env
NODE_ENV=development
PORT=3000

# MongoDB - Use one of these:
# Local: mongodb://localhost:27017/gen-workout
# Atlas: mongodb+srv://username:password@cluster.mongodb.net/gen-workout
MONGODB_URI=mongodb://localhost:27017/gen-workout

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
├── controllers/     # Route handlers (implement next)
├── middleware/      # Auth, error handling
├── models/          # Mongoose schemas
│   ├── User.ts      # User authentication & profile
│   ├── Workout.ts   # Workout tracking
│   ├── Exercise.ts  # Exercise sets/reps/weight
│   └── WorkoutPlan.ts
├── routes/          # API endpoints (ready for controllers)
├── services/        # Business logic (AI parsing, etc.)
├── types/           # TypeScript definitions
├── utils/           # Helper functions
├── app.ts           # Express app
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

## Scripts

- `npm run dev` - Development with hot reload
- `npm run build` - Build for production
- `npm start` - Run production build
- `npm test` - Run tests
- `npm run lint` - Lint code

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
- **MongoDB + Mongoose** - Database
- **JWT** - Authentication
- **Bcrypt** - Password hashing
- **Helmet** - Security headers
- **Morgan** - Request logging
- **Swagger/OpenAPI** - API documentation
- **Zod** - Runtime validation

## License

MIT
