# Gen Workout - Frontend

React Native Expo app for Gen Workout, an AI-powered workout tracking application.

## Setup Complete ✅

Phase 1 (Project Setup & Foundation) has been completed with the following:

### Installed Dependencies

**Core:**
- Expo with TypeScript
- React Navigation (native, bottom-tabs, stack)
- TanStack Query (React Query) for data fetching
- Axios for HTTP requests
- AsyncStorage for local persistence

**Forms & Validation:**
- React Hook Form
- Zod

**UI/Animation:**
- React Native Reanimated
- React Native Gesture Handler
- React Native Bottom Sheet (@gorhom/bottom-sheet)
- Expo Haptics

**Utilities:**
- date-fns for date manipulation

**Dev Dependencies:**
- @testing-library/react-native
- react-test-renderer (version matched to React 19.1.0)

### Project Structure

```
frontend/
├── src/
│   ├── api/              # API client & React Query setup
│   │   ├── client.ts     # Axios instance with interceptors
│   │   └── queryClient.ts # React Query client configuration
│   ├── components/       # Reusable UI components
│   ├── screens/          # Screen components
│   ├── navigation/       # Navigation setup
│   ├── contexts/         # Context providers (auth, theme, etc.)
│   ├── hooks/            # Custom hooks
│   ├── types/            # TypeScript types
│   ├── utils/            # Utility functions
│   └── constants/        # Constants & config
│       └── config.ts     # Environment configuration
├── App.tsx               # Root component with providers
├── babel.config.js       # Babel config with Reanimated plugin
├── .env                  # Environment variables
└── package.json
```

### Configuration Files Created

1. **`src/api/client.ts`**: Axios client with JWT token interceptors
2. **`src/api/queryClient.ts`**: React Query client with cache strategies
3. **`src/constants/config.ts`**: Centralized config for API URL and app settings
4. **`babel.config.js`**: Configured for react-native-reanimated
5. **`.env`**: Environment variables (API_BASE_URL)

### Key Features Configured

- **JWT Authentication**: Axios interceptors automatically attach tokens from AsyncStorage
- **Query Caching**: 5-minute stale time, 30-minute garbage collection
- **Error Handling**: Automatic 401 handling and token cleanup
- **Gesture Support**: GestureHandlerRootView configured in App.tsx
- **Type Safety**: TypeScript configured throughout

## Running the App

### Prerequisites
- Node.js (v20.5.0+ recommended)
- npm or yarn
- Expo CLI

### Development

```bash
# Start the development server
npm start

# Run on iOS simulator
npm run ios

# Run on Android emulator
npm run android

# Run on web
npm run web
```

### Type Checking

```bash
# Check types without building
npx tsc --noEmit
```

### Testing

```bash
# Run tests (when implemented)
npm test
```

## Environment Variables

Update `.env` file with your API endpoint:

```bash
API_BASE_URL=http://localhost:3000/api
```

**Note**: After changing environment variables, restart the Expo bundler.

## Next Steps (Phase 2+)

According to `FRONTEND_PLAN.md`, the next phases are:

1. **Phase 2**: Authentication & API Layer
   - Auth context with AsyncStorage persistence
   - Login/Register screens
   - Protected routes

2. **Phase 3**: Navigation Structure
   - Bottom tab navigator
   - Stack navigators for each tab
   - Modal screens

3. **Phase 4**: Core Features - Workout Tracking
4. **Phase 5**: AI Screen (Workout Parser) ⭐
5. And more...

## Notes

- Used `react-test-renderer@19.1.0` to match React version (avoiding peer dependency conflicts)
- Babel configured for React Native Reanimated (plugin must be listed last)
- TypeScript compilation verified with no errors
