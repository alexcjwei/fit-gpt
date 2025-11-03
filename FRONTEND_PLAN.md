# Gen Workout - React Native Frontend Implementation Plan

Based on the backend API, here's a comprehensive plan for building the React Native frontend.

## 📊 Progress Tracking

- ✅ **Phase 1: Project Setup & Foundation** - COMPLETED
- ✅ **Phase 2: Authentication & API Layer** - COMPLETED
- 🚧 **Phase 3: Navigation Structure** - IN PROGRESS (Setup & Part A completed)
  - ✅ Setup & Dependencies
  - ✅ Part A: Bottom Tab Navigator (Core Structure)
  - ⏳ Part B: Calendar Tab Stack Navigator
  - ⏳ Part C: Workouts Tab Stack Navigator
  - ⏳ Part D: Profile Tab Stack Navigator
  - ⏳ Part E: Modal Screens Setup
  - ⏳ Part F: Integration & Polish
- ⏳ **Phase 4: Core Features - Workout Tracking** - NOT STARTED
- ⏳ **Phase 5: Key Feature - AI Screen (Workout Parser)** - NOT STARTED
- ⏳ **Phase 6: Exercise Management** - NOT STARTED
- ⏳ **Phase 7: UI Components Library** - NOT STARTED
- ⏳ **Phase 8: State Management** - NOT STARTED
- ⏳ **Phase 9: TypeScript Types** - NOT STARTED
- ⏳ **Phase 10: Testing** - NOT STARTED
- ⏳ **Phase 11: Polish & Performance** - NOT STARTED

**Detailed Phase 3 Plan**: See `/FRONTEND_PHASE_3_PLAN.md`

---

## ✅ **Phase 1: Project Setup & Foundation** - COMPLETED

### 1.1 Project Initialization
- ✅ **Framework**: React Native with Expo
- ✅ **TypeScript**: TypeScript configured with strict mode
- ✅ **Package Manager**: npm

### 1.2 Core Dependencies
```
✅ React Navigation 7.x (navigation)
✅ TanStack Query 5.x (data fetching & caching)
✅ AsyncStorage (token persistence)
✅ Axios (HTTP client)
✅ React Hook Form (form handling)
✅ Zod (validation)
✅ Date-fns (date manipulation)
```

### 1.3 Project Structure
```
frontend/
├── src/
│   ├── api/              # API client & endpoints ✅
│   ├── components/       # Reusable components ✅
│   ├── screens/          # Screen components ✅
│   ├── navigation/       # Navigation setup ✅
│   ├── contexts/         # Context providers (auth) ✅
│   ├── types/            # TypeScript types ✅
│   ├── utils/            # Utility functions ✅
│   └── constants/        # Constants & config ✅
```

---

## ✅ **Phase 2: Authentication & API Layer** - COMPLETED

### 2.1 API Client Setup
- ✅ Axios instance with interceptors (`src/api/client.ts`)
- ✅ Automatically attach JWT token to requests
- ✅ Handle 401 errors (redirect to login)
- ✅ Request/response logging for debugging

### 2.2 Authentication Context
- ✅ Store JWT token in AsyncStorage (`src/utils/tokenStorage.ts`)
- ✅ Provide auth state (user, token, isAuthenticated) (`src/contexts/AuthContext.tsx`)
- ✅ Login/logout/register functions
- ✅ Auto-restore session on app launch

### 2.3 Auth Screens
- ✅ **Login Screen**: Email/password form with validation (`src/screens/auth/LoginScreen.tsx`)
- ✅ **Register Screen**: Email/password/name form with validation (`src/screens/auth/RegisterScreen.tsx`)
- ✅ **Auth Navigator**: Stack navigator for auth flow (`src/navigation/AuthNavigator.tsx`)

---

## 🚧 **Phase 3: Navigation Structure** - IN PROGRESS

### 3.1 App Navigator (Authenticated)
```
✅ Bottom Tab Navigator (src/navigation/BottomTabNavigator.tsx):
├── ✅ Calendar Tab - CalendarScreen (placeholder)
├── ✅ Workouts Tab - WorkoutListScreen (placeholder)
├── ✅ AI Tab - AIScreen (placeholder)
└── ✅ Profile Tab - ProfileScreen (placeholder with logout)

✅ Add Stack Navigators:
├── Calendar Tab (Stack)
│   ├── Calendar Screen
│   └── Workout Details Screen
├── Workouts Tab (Stack)
│   ├── Workout List Screen
│   └── Workout Details Screen
└── Profile Tab (Stack)
    ├── Profile Screen
    ├── Exercise Browser Screen
    └── Settings Screen
```

### 3.2 Modal Screens (Overlays) - ✅
- Workout Editor (Full screen modal)
- Exercise Selector (Full screen modal)
- Exercise Details (Sheet modal)
- Set Editor (Bottom sheet)

---

## **Phase 4: Core Features - Workout Tracking**

### 4.1 Calendar Screen
- Monthly calendar view
- Display workout dots/indicators on dates
- Fetch workouts by date range (`GET /api/workouts/calendar`)
- Navigate to workout details on date tap
- Quick actions: Create workout, duplicate

### 4.2 Workout List Screen
- Infinite scroll / pagination
- Date filters (past 7 days, 30 days, all)
- Pull-to-refresh
- Swipe actions: Duplicate, delete
- Empty state with CTA to create/parse workout

### 4.3 Workout Details Screen
**View Mode**:
- Display workout name, date, notes
- Show all blocks with exercises and sets
- Set completion checkboxes
- Timer for rest periods
- FAB: Edit workout, start workout, duplicate

**Edit Mode**:
- Inline editing of workout name, notes
- Add/remove/reorder blocks
- Add/remove/reorder exercises
- Add/remove sets
- Save/cancel actions

### 4.4 Active Workout Screen
- Current exercise highlighted
- Quick set completion (tap to complete)
- RPE input on set completion
- Rest timer between sets
- Navigate between exercises
- Save workout on completion

---

## **Phase 5: Key Feature - AI Screen (Workout Parser)**

### 5.1 AI Screen
**Input Section**:
- Large text input area (multiline)
- Example workouts (help text)
- Date picker (default today)
- Weight unit selector (lbs/kg)
- Parse button

**Parsing Flow**:
1. Submit text to `POST /api/workouts/parse`
2. Show loading indicator with AI processing message
3. Display parsed workout for review
4. Allow editing before saving
5. Save to `POST /api/workouts`

**Preview Section**:
- Display parsed workout structure
- Show resolved exercises with confirmation
- Highlight any unresolved exercises
- Edit parsed data before saving

**Future AI Features** (Placeholder):
- AI workout generation based on goals
- Exercise form analysis (camera integration)
- Progress insights and recommendations

---

## **Phase 6: Exercise Management**

### 6.1 Exercise Browser Screen
**Search & Filter**:
- Search bar (debounced, fuzzy search via `/api/exercises/search`)
- Filter chips: Category, equipment, difficulty, muscle group
- Sort options: Name, difficulty

**Exercise List**:
- Grouped by category (optional)
- Exercise cards with:
  - Name
  - Primary muscles
  - Equipment icons
  - Difficulty badge

### 6.2 Exercise Details Screen
- Full exercise information
- Video player (if videoUrl exists)
- Form cues (bullet list)
- Setup instructions
- Alternative exercises (chips, navigable)
- Add to workout button

### 6.3 Exercise Selector Modal
- Used when adding exercise to workout
- Search + filter
- Quick add to current workout/block

---

## **Phase 7: UI Components Library**

### 7.1 Core Components
- **Button**: Primary, secondary, tertiary variants
- **Input**: Text, number, with validation
- **Card**: Workout card, exercise card, set card
- **Chip**: Filter chips, category chips
- **Badge**: Difficulty, completion status
- **Modal**: Full screen, bottom sheet
- **LoadingSpinner**: Page, inline
- **EmptyState**: Illustrations + CTA

### 7.2 Workout Components
- **WorkoutCard**: Display workout summary
- **BlockCard**: Display workout block with exercises
- **ExerciseCard**: Display exercise in workout
- **SetRow**: Display/edit set data
- **RestTimer**: Countdown timer component

### 7.3 Form Components
- **FormInput**: Text input with error handling
- **FormDatePicker**: Date selection
- **FormSelect**: Dropdown/picker
- **FormCheckbox**: Boolean input

---

## **Phase 8: State Management**

### 8.1 React Query Setup
- Configure query client
- Cache strategies for workouts, exercises
- Optimistic updates for set completion
- Background refetching

### 8.2 Query Hooks
```typescript
// Auth
- useAuth() - Auth state

// Workouts
- useWorkouts() - List workouts
- useWorkout(id) - Single workout
- useWorkoutsCalendar(startDate, endDate) - Calendar data

// Exercises
- useExercises(filters) - Exercise list
- useExercise(id) - Single exercise
- useExerciseSearch(query) - Search exercises

// Mutations
- useParseWorkout() - Parse mutation
- useCreateWorkout() - Create mutation
- useUpdateWorkout() - Update mutation
- useDeleteWorkout() - Delete mutation
- useDuplicateWorkout() - Duplicate mutation
- useCompleteSet() - Complete set mutation
- useStartWorkout() - Start workout mutation
```

---

## **Phase 9: TypeScript Types**

### 9.1 Shared Types
- Copy types from `backend/src/types/index.ts`
- Create frontend-specific types (UI state, form data)
- API request/response types

### 9.2 Form Types
- LoginFormData
- RegisterFormData
- WorkoutFormData
- ParseWorkoutFormData
- ExerciseFilterFormData

---

## **Phase 10: Testing**

### 10.1 Unit Tests
- Component tests (React Native Testing Library)
- Hook tests
- Utility function tests

### 10.2 Integration Tests
- Auth flow
- Workout creation flow
- AI parsing workflow
- Set completion flow

---

## **Phase 11: Polish & Performance**

### 11.1 Performance Optimizations
- Memoize expensive components
- Virtualized lists for long workout history
- Image optimization
- Lazy loading

### 11.2 UX Enhancements
- Haptic feedback on interactions
- Smooth animations (react-native-reanimated)
- Skeleton loaders
- Error boundaries
- Offline support (cache-first queries)

### 11.3 Accessibility
- Screen reader support
- Color contrast
- Touch targets (minimum 44x44)

---

## **Implementation Order (Recommended)**

### **Week 1: Foundation**
- Project setup (Expo + TypeScript)
- Install core dependencies
- API client & auth context
- Navigation structure setup
- Auth screens (login/register)

### **Week 2: Workout List & Details**
- Workout list screen with pagination
- Workout details screen (view mode)
- Calendar screen (basic)
- Empty states

### **Week 3: AI Screen (Workout Parser)** ⭐ Core Feature
- AI screen UI (text input, date picker)
- Parse workout API integration
- Preview parsed workout
- Save parsed workout flow
- Loading states and error handling

### **Week 4: Workout Editing**
- Workout editor screen
- Add/remove/reorder blocks & exercises
- Set editing (inline)
- Validation and error handling

### **Week 5: Exercise Management**
- Exercise browser with search
- Exercise search & filter
- Exercise details screen
- Exercise selector modal

### **Week 6: Active Workout**
- Active workout screen
- Set completion flow
- Rest timer component
- Workout completion flow
- RPE input

### **Week 7: Polish**
- UI refinements
- Performance optimization
- Testing (unit + integration)
- Bug fixes
- Accessibility improvements

---

## **Key Technologies & Libraries**

```json
{
  "dependencies": {
    "expo": "~50.0.0",
    "react": "18.2.0",
    "react-native": "0.73.0",
    "@react-navigation/native": "^6.1.0",
    "@react-navigation/bottom-tabs": "^6.5.0",
    "@react-navigation/stack": "^6.3.0",
    "@tanstack/react-query": "^5.0.0",
    "axios": "^1.6.0",
    "@react-native-async-storage/async-storage": "^1.21.0",
    "react-hook-form": "^7.49.0",
    "zod": "^3.22.4",
    "date-fns": "^3.0.0",
    "react-native-reanimated": "^3.6.0",
    "react-native-gesture-handler": "^2.14.0",
    "@gorhom/bottom-sheet": "^4.5.0",
    "expo-haptics": "~13.0.0"
  },
  "devDependencies": {
    "@types/react": "~18.2.0",
    "@testing-library/react-native": "^12.4.0",
    "jest": "^29.7.0"
  }
}
```

---

## **Environment Configuration**

### `.env` file
```bash
API_BASE_URL=http://localhost:3000/api
```

### Production
```bash
API_BASE_URL=https://api.gen-workout.com/api
```

---

## **Key Design Considerations**

### 1. Offline Support
- Cache workouts locally
- Queue mutations when offline
- Sync when back online
- Display offline indicator

### 2. Performance
- Virtualized lists for workout history
- Image lazy loading
- Debounced search
- Optimistic UI updates

### 3. Error Handling
- Network errors (retry mechanism)
- Validation errors (inline feedback)
- Global error boundary
- Toast notifications for success/error

### 4. User Experience
- Pull-to-refresh on lists
- Swipe gestures (delete, duplicate)
- Haptic feedback on interactions
- Loading skeletons (not just spinners)
- Empty states with helpful CTAs

### 5. Security
- Secure token storage (AsyncStorage with encryption option)
- Auto-logout on token expiration
- Secure HTTP only (HTTPS in production)

---

## **API Integration Summary**

The frontend will integrate with the following backend endpoints:

### Authentication
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`

### Workouts
- `GET /api/workouts` (list)
- `GET /api/workouts/:id` (single)
- `GET /api/workouts/calendar` (calendar view)
- `POST /api/workouts` (create)
- `POST /api/workouts/parse` ⭐ (AI parsing)
- `PUT /api/workouts/:id` (update)
- `DELETE /api/workouts/:id` (delete)
- `POST /api/workouts/:id/duplicate` (duplicate)
- `POST /api/workouts/:id/start` (start)

### Workout Blocks
- `POST /api/workouts/:workoutId/blocks` (add)
- `PUT /api/workouts/:workoutId/blocks/reorder` (reorder)
- `DELETE /api/workouts/blocks/:blockId` (remove)

### Workout Exercises
- `POST /api/workouts/blocks/:blockId/exercises` (add)
- `PUT /api/workouts/blocks/:blockId/exercises/reorder` (reorder)
- `DELETE /api/workouts/exercises/:exerciseId` (remove)

### Sets
- `PUT /api/workouts/sets/:setId` (update)
- `POST /api/workouts/sets/:setId/complete` (complete)

### Exercises
- `GET /api/exercises` (list with filters)
- `GET /api/exercises/search` (fuzzy search)
- `GET /api/exercises/:id` (single)
- `POST /api/exercises` (create)
- `PUT /api/exercises/:id` (update)
- `DELETE /api/exercises/:id` (delete)

---

## **Next Steps**

1. Review and approve this plan
2. Set up Expo project
3. Configure development environment
4. Begin Phase 1 implementation
5. Iterate weekly based on this plan
