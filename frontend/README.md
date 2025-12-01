# Frontend

React Native mobile app for workout tracking built with Expo and TypeScript.

## Features

- JWT authentication with AsyncStorage persistence
- React Query for data fetching and caching
- React Navigation (bottom tabs + stack)
- Form validation with React Hook Form + Zod
- Gesture-based interactions and animations

## Setup

### Prerequisites
- Node.js 18+
- Expo CLI

### Installation

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your API endpoint

# Start development server
npm start
```

### Running on Devices

```bash
npm run ios      # iOS simulator
npm run android  # Android emulator
npm run web      # Web browser
```

## Available Scripts

- `npm start` - Start Expo development server
- `npm run ios` - Run on iOS simulator
- `npm run android` - Run on Android emulator
- `npm run web` - Run in web browser
- `npm test` - Run tests

## Tech Stack

Expo • React Native • TypeScript • React Query • React Navigation • Reanimated

## License

MIT
