# Backend

REST API for workout tracking built with Express, TypeScript, and PostgreSQL.

## Architecture

Clean architecture with dependency injection via factory functions:

- **Repositories** - Data access layer with Kysely (type-safe SQL builder)
- **Services** - Business logic (workout management, exercise tracking)
- **Controllers** - HTTP request/response handlers
- **Routes** - API endpoints with authentication and validation middleware
- **Composition Root** - Dependency injection wiring in `src/createApp.ts`

## Setup

### Prerequisites
- Node.js 18+
- PostgreSQL 14+

### Installation

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your database URL and JWT secret

# Start development server
npm run dev
```

### API Documentation

Interactive Swagger docs available at `http://localhost:3000/api-docs`

## Testing

Integration tests use PostgreSQL test containers (via Testcontainers) for isolated, end-to-end testing.

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run type-check` - TypeScript type checking
- `npm test` - Run all tests
- `npm run test:unit` - Run unit tests
- `npm run test:integration` - Run integration tests

## Tech Stack

Express • TypeScript • PostgreSQL • Kysely • JWT • Jest • Testcontainers

## License

MIT
