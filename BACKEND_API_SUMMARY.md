# Gen Workout Backend - Comprehensive API and Features Summary

## Overview
Gen Workout is an AI-integrated workout tracking API built with Express.js, TypeScript, and MongoDB. It provides a complete backend for tracking workouts, managing exercises, parsing unstructured workout text into structured data, and user authentication.

---

## 1. API Routes and Endpoints

### Base URL
```
http://localhost:3000/api
```

### Health Check (No Auth Required)
```
GET /health
```

### API Documentation
- Swagger UI: `http://localhost:3000/api-docs`
- OpenAPI JSON: `http://localhost:3000/api-docs.json`

---

## 2. Authentication Endpoints

All requests except register and login require a Bearer token in the Authorization header.

### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",      // minimum 6 characters
  "name": "John Doe"
}

Response (201 Created):
{
  "success": true,
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "email": "user@example.com",
      "name": "John Doe"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Login User
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}

Response (200 OK):
{
  "success": true,
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "email": "user@example.com",
      "name": "John Doe"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Logout User
```http
POST /api/auth/logout
Authorization: Bearer <token>

Response (200 OK):
{
  "success": true,
  "message": "Logged out successfully"
}
```

**Authentication**: Uses JWT tokens. All other routes require:
```
Authorization: Bearer <your_jwt_token>
```

---

## 3. User Endpoints (Protected)

### Get User Profile
```http
GET /api/users/profile
Authorization: Bearer <token>
```
(Not yet fully implemented)

### Update User Profile
```http
PUT /api/users/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Name",
  "fitnessLevel": "moderately_active",
  "goals": ["build-muscle", "improve-endurance"],
  "preferredWorkoutDays": 4,
  "workoutLocation": "gym",
  "injuries": "None",
  "exerciseHistory": "3 years of gym experience",
  "availableEquipment": ["barbell", "dumbbell", "cable", "machine"]
}
```
(Not yet fully implemented)

---

## 4. Workout Endpoints (Protected)

### Parse Workout Text (AI-Powered)
```http
POST /api/workouts/parse
Authorization: Bearer <token>
Content-Type: application/json

{
  "text": "## Lower Body Strength + Power\n\n**Warm Up / Activation**\n- Light cardio: 5 min\n- Glute bridges: 2x15\n\n**Superset A (4 sets, 2-3 min rest)**\n1. Back Squat: 6-8 reps\n2. Box Jumps: 5 reps",
  "date": "2025-11-01",           // optional, defaults to today (ISO format)
  "weightUnit": "lbs"               // optional, defaults to "lbs"
}

Response (200 OK):
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Lower Body Strength + Power",
    "date": "2025-11-01",
    "startTime": null,
    "lastModifiedTime": "2025-11-02T08:30:00.000Z",
    "notes": null,
    "blocks": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440001",
        "label": "Warm Up / Activation",
        "exercises": [
          {
            "id": "550e8400-e29b-41d4-a716-446655440002",
            "exerciseId": "507f1f77bcf86cd799439011",
            "orderInBlock": 0,
            "sets": [
              {
                "id": "550e8400-e29b-41d4-a716-446655440003",
                "setNumber": 1,
                "targetRepsMin": 5,
                "targetRepsMax": 5,
                "weightUnit": "lbs",
                "completed": false
              }
            ],
            "restPeriod": "90 sec"
          }
        ],
        "restPeriod": "2-3 min"
      }
    ]
  }
}
```

**Key Features**:
- Validates that input is actually workout content
- Uses AI to extract structure from unstructured text
- Automatically resolves exercise names to database exercise IDs
- Generates UUIDs for all entities
- Supports custom date and weight units

### Get Workouts by Date Range (Calendar View)
```http
GET /api/workouts/calendar?startDate=2025-11-01&endDate=2025-11-30
Authorization: Bearer <token>

Response (200 OK):
{
  "success": true,
  "data": [
    { /* workout objects */ }
  ]
}
```

### List All Workouts
```http
GET /api/workouts?page=1&limit=50&dateFrom=2025-11-01&dateTo=2025-11-30
Authorization: Bearer <token>

Response (200 OK):
{
  "success": true,
  "data": {
    "workouts": [ /* array of workouts */ ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 150,
      "pages": 3
    }
  }
}
```

### Get Single Workout
```http
GET /api/workouts/:id
Authorization: Bearer <token>

Response (200 OK):
{
  "success": true,
  "data": { /* workout object */ }
}
```

### Create Workout
```http
POST /api/workouts
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Upper Body Day",
  "date": "2025-11-01",
  "startTime": "2025-11-01T10:00:00Z",
  "lastModifiedTime": "2025-11-01T10:30:00Z",
  "notes": "Focus on progressive overload",
  "blocks": []
}

Response (201 Created):
{
  "success": true,
  "data": { /* full workout object */ }
}
```

### Update Workout
```http
PUT /api/workouts/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Upper Body Day - Updated",
  "notes": "Updated notes",
  "startTime": "2025-11-01T10:15:00Z",
  "lastModifiedTime": "2025-11-01T11:00:00Z"
}

Response (200 OK):
{
  "success": true,
  "data": { /* updated workout object */ }
}
```

### Delete Workout
```http
DELETE /api/workouts/:id
Authorization: Bearer <token>

Response (200 OK):
{
  "success": true,
  "message": "Workout deleted successfully"
}
```

### Duplicate Workout
```http
POST /api/workouts/:id/duplicate
Authorization: Bearer <token>
Content-Type: application/json

{
  "newDate": "2025-11-08"  // optional, defaults to today
}

Response (201 Created):
{
  "success": true,
  "data": { /* duplicated workout with new date and IDs */ }
}
```

### Start Workout
```http
POST /api/workouts/:id/start
Authorization: Bearer <token>

Response (200 OK):
{
  "success": true,
  "data": { /* workout with startTime set to current time */ }
}
```

---

## 5. Workout Block Endpoints (Protected)

### Add Block to Workout
```http
POST /api/workouts/:workoutId/blocks
Authorization: Bearer <token>
Content-Type: application/json

{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "label": "Superset A",
  "restPeriod": "2-3 min",
  "notes": "Superset these exercises",
  "exercises": []
}

Response (201 Created):
{
  "success": true,
  "data": { /* updated workout with new block */ }
}
```

### Reorder Blocks in Workout
```http
PUT /api/workouts/:workoutId/blocks/reorder
Authorization: Bearer <token>
Content-Type: application/json

{
  "blockOrders": [
    { "blockId": "id1", "order": 0 },
    { "blockId": "id2", "order": 1 },
    { "blockId": "id3", "order": 2 }
  ]
}

Response (200 OK):
{
  "success": true,
  "data": { /* workout with reordered blocks */ }
}
```

### Remove Block
```http
DELETE /api/workouts/blocks/:blockId
Authorization: Bearer <token>

Response (200 OK):
{
  "success": true,
  "data": { /* workout without the deleted block */ }
}
```

---

## 6. Exercise (in Workout) Endpoints (Protected)

### Add Exercise to Block
```http
POST /api/workouts/blocks/:blockId/exercises
Authorization: Bearer <token>
Content-Type: application/json

{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "exerciseId": "507f1f77bcf86cd799439011",  // Reference to Exercise database
  "orderInBlock": 0,
  "restPeriod": "60 sec",
  "notes": "Focus on form",
  "sets": [
    {
      "setNumber": 1,
      "targetRepsMin": 6,
      "targetRepsMax": 8,
      "targetWeight": 225,
      "weightUnit": "lbs"
    }
  ]
}

Response (201 Created):
{
  "success": true,
  "data": { /* updated workout */ }
}
```

### Reorder Exercises in Block
```http
PUT /api/workouts/blocks/:blockId/exercises/reorder
Authorization: Bearer <token>
Content-Type: application/json

{
  "exerciseOrders": [
    { "exerciseId": "id1", "order": 0 },
    { "exerciseId": "id2", "order": 1 }
  ]
}

Response (200 OK):
{
  "success": true,
  "data": { /* workout with reordered exercises */ }
}
```

### Remove Exercise
```http
DELETE /api/workouts/exercises/:exerciseId
Authorization: Bearer <token>

Response (200 OK):
{
  "success": true,
  "data": { /* workout without the exercise */ }
}
```

---

## 7. Set (Workout Tracking) Endpoints (Protected)

### Update Set Data
```http
PUT /api/workouts/sets/:setId
Authorization: Bearer <token>
Content-Type: application/json

{
  "targetRepsMin": 6,
  "targetRepsMax": 8,
  "actualReps": 7,
  "targetWeight": 225,
  "actualWeight": 225,
  "weightUnit": "lbs",
  "rpe": 7,
  "notes": "Felt strong on this set"
}

Response (200 OK):
{
  "success": true,
  "data": { /* updated workout */ }
}
```

### Complete Set
```http
POST /api/workouts/sets/:setId/complete
Authorization: Bearer <token>
Content-Type: application/json

{
  "actualReps": 8,
  "actualWeight": 225,
  "rpe": 8,
  "notes": "All reps felt good"
}

Response (200 OK):
{
  "success": true,
  "data": { /* updated workout with set marked as completed */ }
}
```

---

## 8. Exercise Database Endpoints (Protected)

### Search Exercises (Fuzzy Search)
```http
GET /api/exercises/search?q=bench+press&limit=5
Authorization: Bearer <token>

Response (200 OK):
{
  "success": true,
  "data": {
    "results": [
      {
        "exercise": {
          "id": "507f1f77bcf86cd799439011",
          "name": "Barbell Bench Press (Flat)",
          "slug": "barbell-bench-press-flat",
          "category": "chest",
          "primaryMuscles": ["chest"],
          "secondaryMuscles": ["triceps", "shoulders"],
          "equipment": ["barbell", "bench"],
          "difficulty": "intermediate",
          "movementPattern": "push",
          "isCompound": true,
          "isUnilateral": false
        },
        "score": 0.05  // Lower score = better match (0 is perfect)
      }
    ]
  }
}
```

### List Exercises with Filters
```http
GET /api/exercises?category=chest&equipment=barbell&difficulty=intermediate&page=1&limit=20
Authorization: Bearer <token>

Response (200 OK):
{
  "success": true,
  "data": {
    "exercises": [ /* exercise objects */ ],
    "pagination": {
      "total": 45,
      "page": 1,
      "limit": 20,
      "totalPages": 3
    }
  }
}
```

**Query Parameters**:
- `category`: chest, back, legs, shoulders, arms, core, cardio, olympic, full-body, stretching
- `muscleGroup`: chest, back, quads, hamstrings, glutes, shoulders, biceps, triceps, abs, obliques, lower-back, upper-back, calves, forearms, traps, lats, rear-delts, hip-flexors
- `equipment`: barbell, dumbbell, cable, bodyweight, machine, bands, kettlebell, smith-machine, trap-bar, ez-bar, plate, medicine-ball, ab-wheel, suspension, sled, box, bench, pull-up-bar, dip-bar, cardio-machine
- `difficulty`: beginner, intermediate, advanced, expert
- `search`: Search by name
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)

### Get Single Exercise
```http
GET /api/exercises/:id
Authorization: Bearer <token>

# :id can be either MongoDB ObjectId or slug (e.g., "barbell-bench-press-flat")

Response (200 OK):
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "name": "Barbell Bench Press (Flat)",
    "slug": "barbell-bench-press-flat",
    "category": "chest",
    "primaryMuscles": ["chest"],
    "secondaryMuscles": ["triceps", "shoulders"],
    "equipment": ["barbell", "bench"],
    "difficulty": "intermediate",
    "movementPattern": "push",
    "isCompound": true,
    "isUnilateral": false,
    "description": "...",
    "setupInstructions": "...",
    "formCues": ["Retract scapula", "Maintain arch in lower back"],
    "videoUrl": "https://youtube.com/...",
    "alternativeExerciseIds": ["..."],
    "tags": ["fundamental", "strength"]
  }
}
```

### Create Exercise
```http
POST /api/exercises
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Barbell Bench Press (Flat)",
  "slug": "barbell-bench-press-flat",  // optional, auto-generated if not provided
  "category": "chest",
  "primaryMuscles": ["chest"],
  "secondaryMuscles": ["triceps", "shoulders"],
  "equipment": ["barbell", "bench"],
  "difficulty": "intermediate",
  "movementPattern": "push",
  "isCompound": true,
  "isUnilateral": false,
  "description": "A compound pushing movement...",
  "setupInstructions": "Set bench to flat position...",
  "formCues": ["Retract scapula", "Maintain arch in lower back"],
  "videoUrl": "https://youtube.com/...",
  "alternativeExerciseIds": [],
  "tags": ["fundamental", "strength"]
}

Response (201 Created):
{
  "success": true,
  "data": { /* full exercise object with generated ID */ }
}
```

### Update Exercise
```http
PUT /api/exercises/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "description": "Updated description",
  "difficulty": "advanced",
  "tags": ["fundamental", "strength", "intermediate"]
}

Response (200 OK):
{
  "success": true,
  "data": { /* updated exercise object */ }
}
```

### Delete Exercise
```http
DELETE /api/exercises/:id
Authorization: Bearer <token>

Response (200 OK):
{
  "success": true,
  "message": "Exercise deleted successfully"
}
```

---

## Core Data Models

### Workout
```typescript
interface Workout {
  id: string;                 // UUID v4
  name: string;
  date: string;               // ISO 8601 date (YYYY-MM-DD)
  startTime?: string;         // ISO 8601 timestamp
  lastModifiedTime: string;   // ISO 8601 timestamp
  notes?: string;
  blocks: WorkoutBlock[];     // Array of workout blocks
  userId: string;             // Reference to user (backend only)
}
```

### WorkoutBlock
```typescript
interface WorkoutBlock {
  id: string;                     // UUID v4
  label?: string;                 // e.g., "Warm Up", "Superset A"
  exercises: ExerciseInstance[];  // Array of exercise instances
  restPeriod?: string;            // e.g., "2-3 min", "90 sec"
  notes?: string;
}
```

### ExerciseInstance (Workout Exercise)
```typescript
interface ExerciseInstance {
  id: string;                 // UUID v4
  exerciseId: string;         // Reference to Exercise definition
  orderInBlock: number;       // 0-indexed position within block
  sets: SetInstance[];        // Array of sets
  restPeriod?: string;        // e.g., "60 sec", "2 min"
  notes?: string;
}
```

### SetInstance (Workout Set)
```typescript
interface SetInstance {
  id: string;               // UUID v4
  setNumber: number;        // 1-indexed
  targetRepsMin?: number;   // e.g., 6 in "6-8 reps"
  targetRepsMax?: number;   // e.g., 8 in "6-8 reps"
  actualReps?: number;      // Actual reps completed
  targetWeight?: number;
  actualWeight?: number;
  weightUnit: 'lbs' | 'kg';
  duration?: number;        // Duration in seconds (for time-based exercises)
  rpe?: number;             // Rate of Perceived Exertion (1-10)
  completed: boolean;
  completedAt?: string;     // ISO 8601 timestamp
  notes?: string;
}
```

### Exercise (Database Definition)
```typescript
interface Exercise {
  id: string;                           // MongoDB ObjectId as string
  slug?: string;                        // Human-readable identifier
  name: string;
  category: ExerciseCategory;
  primaryMuscles: MuscleGroup[];
  secondaryMuscles?: MuscleGroup[];
  equipment: Equipment[];
  difficulty?: DifficultyLevel;         // beginner, intermediate, advanced, expert
  movementPattern?: MovementPattern;    // push, pull, squat, hinge, etc.
  isUnilateral?: boolean;
  isCompound?: boolean;
  description?: string;
  setupInstructions?: string;
  formCues?: string[];
  videoUrl?: string;
  alternativeExerciseIds?: string[];    // Cross-references to other exercises
  tags?: string[];                      // Flexible categorization
}
```

### User
```typescript
interface User {
  id: string;
  email: string;
  password: string;                     // Hashed (bcrypt)
  name: string;
  fitnessLevel: 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active';
  goals: string[];
  injuries?: string;
  exerciseHistory?: string;
  preferredWorkoutDays?: number;        // 1-7
  workoutLocation?: 'home' | 'gym' | 'both';
  availableEquipment?: string[];
  createdAt: Date;
  updatedAt: Date;
}
```

---

## Key Features

### 1. AI-Powered Workout Parsing
- **Endpoint**: `POST /api/workouts/parse`
- Accepts unstructured workout text (markdown, plain text, etc.)
- Uses Claude AI to:
  - Validate the content is actually a workout
  - Extract structure (blocks, exercises, sets, reps, weights)
  - Resolve exercise names to database IDs using fuzzy search + AI
- Returns fully structured Workout object with UUIDs

**Parsing Stages**:
1. **Validation**: Confirms input is workout content (confidence threshold: 0.7)
2. **Structure Extraction**: Parses text into workout structure with exercise name placeholders
3. **Exercise Resolution**: Maps exercise names to database IDs using fuzzy search + AI
4. **Database Formatting**: Generates UUIDs and returns finalized object

### 2. Comprehensive Exercise Database
- Pre-seeded with 1000+ exercises
- Searchable by name (fuzzy search)
- Filterable by:
  - Category (10 types)
  - Muscle groups (18 types)
  - Equipment (18 types)
  - Difficulty level (4 levels)
  - Movement patterns (11 types)
- Lookupable by MongoDB ID or URL slug
- Supports CRUD operations

### 3. Workout Tracking
- Hierarchical structure: Workout → Blocks → Exercises → Sets
- Full CRUD operations on all levels
- Set completion tracking with timestamp
- Support for various metrics:
  - Reps (target range and actual)
  - Weight (target and actual)
  - Duration (for time-based exercises)
  - RPE (Rate of Perceived Exertion, 1-10)
  - Notes per set

### 4. User Authentication
- JWT-based authentication
- Bcrypt password hashing
- Token expiration (configurable, default 7 days)
- User profile with fitness preferences
- Role-based access (all authenticated users have same access level)

### 5. User Data Organization
- Workouts scoped to individual users
- Date filtering and calendar view
- Pagination support
- Sorting by date and last modified time

### 6. Reordering and Duplication
- Reorder blocks within workout
- Reorder exercises within block
- Duplicate workouts with optional new date
- All nested entities (blocks, exercises, sets) are duplicated with new IDs

---

## Authentication

### JWT Token Structure
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI1MDdmMWY3N2JjZjg2Y2Q3OTk0MzkwMTEiLCJpYXQiOjE2MzA3MDMwMDAsImV4cCI6MTYzMTMwNzgwMH0.abcdef...
```

### Token Claims
```json
{
  "userId": "507f1f77bcf86cd799439011",
  "iat": 1630703000,
  "exp": 1631307800
}
```

### Configuration
- **Secret**: Set via `JWT_SECRET` environment variable
- **Expiration**: Set via `JWT_EXPIRES_IN` environment variable (e.g., "7d")

---

## Enum Types

### MuscleGroup (18 types)
chest, back, quads, hamstrings, glutes, shoulders, biceps, triceps, abs, obliques, lower-back, upper-back, calves, forearms, traps, lats, rear-delts, hip-flexors

### Equipment (18 types)
barbell, dumbbell, cable, bodyweight, machine, bands, kettlebell, smith-machine, trap-bar, ez-bar, plate, medicine-ball, ab-wheel, suspension, sled, box, bench, pull-up-bar, dip-bar, cardio-machine

### ExerciseCategory (10 types)
chest, back, legs, shoulders, arms, core, cardio, olympic, full-body, stretching

### DifficultyLevel (4 levels)
beginner, intermediate, advanced, expert

### MovementPattern (11 patterns)
push, pull, squat, hinge, lunge, carry, rotation, anti-rotation, isometric, plyometric, olympic

---

## Error Handling

All endpoints follow a consistent error response format:

```json
{
  "success": false,
  "error": "Error message here",
  "statusCode": 400
}
```

Common status codes:
- `200`: Success
- `201`: Created
- `400`: Bad Request (validation error)
- `401`: Unauthorized (missing/invalid token)
- `404`: Not Found
- `409`: Conflict (duplicate entry)
- `500`: Internal Server Error

---

## Database Indexes

**Workouts**:
- `{ userId: 1, date: -1 }` - Fast filtering by user and date
- `{ userId: 1, lastModifiedTime: -1 }` - Fast filtering by user and modification time

**Exercises**:
- `{ name: 1 }` - Fast search by name
- `{ category: 1 }` - Fast filtering by category
- `{ primaryMuscles: 1 }` - Fast filtering by muscle group

---

## Response Format

All API responses follow this format:

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
```

**Success Response (200 OK)**:
```json
{
  "success": true,
  "data": { /* response data */ }
}
```

**Error Response (4xx/5xx)**:
```json
{
  "success": false,
  "error": "Error message"
}
```

---

## CORS Configuration

The API is configured with CORS to allow requests from the frontend.

**Configured Origin**: Set via `CORS_ORIGIN` environment variable
- Default: `http://localhost:3000`
- Supports credentials

---

## Rate Limiting & Security

- **Helmet.js**: Security headers
- **Express Validator**: Input validation on all routes
- **Bcrypt**: Password hashing (10 rounds)
- **JWT Expiration**: Configurable token expiration
- **Mongoose Indexing**: Database query optimization

---

## Summary for Frontend Integration

The frontend needs to:

1. **Implement Authentication**:
   - Register/Login flows
   - Store JWT token (localStorage/sessionStorage)
   - Include token in Authorization header for all API calls

2. **Implement Workout Management**:
   - List workouts with date filtering
   - View single workout details
   - Create/update/delete workouts
   - Duplicate workouts

3. **Implement Workout Editing**:
   - Add/remove/reorder blocks
   - Add/remove/reorder exercises within blocks
   - Update set data (weight, reps, RPE)
   - Mark sets as complete

4. **Implement Workout Parsing**:
   - Text input for unstructured workout
   - Send to parse endpoint
   - Display parsed workout for review/editing before saving

5. **Implement Exercise Management**:
   - Search exercises by name
   - Browse/filter exercises by category/equipment/muscle group
   - Display exercise details

6. **Display Calendar View**:
   - Fetch workouts by date range
   - Display workouts on calendar

7. **Handle Authentication**:
   - Catch 401 errors and redirect to login
   - Refresh page or re-authenticate when token expires

---

## Example Frontend Integration

### Register/Login
```typescript
// Register
const response = await fetch('http://localhost:3000/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123',
    name: 'John Doe'
  })
});
const { data } = await response.json();
localStorage.setItem('token', data.token);

// API Call
const response = await fetch('http://localhost:3000/api/workouts', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  }
});
```

### Parse Workout
```typescript
const response = await fetch('http://localhost:3000/api/workouts/parse', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    text: 'Your unstructured workout text here',
    date: '2025-11-01',
    weightUnit: 'lbs'
  })
});
const { data: workout } = await response.json();
```

### Save Parsed Workout
```typescript
const response = await fetch('http://localhost:3000/api/workouts', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify(workout)  // From parse endpoint
});
```

