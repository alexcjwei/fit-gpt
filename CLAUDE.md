# Tech Stack & Commands
- `npm run build`: Build the project
- `npm run type-check`: Check types without building
- `npm run test`: Run tests (call from backend/ directory)
- `npx tsc --noEmit`: Verify TypeScript compilation

# Code Style
- Use ES modules (import/export), not CommonJS (require)
- Destructure imports: `import { foo } from 'bar'`

# Workflow Rules

## Planning (MUST DO FIRST)
- **BP-1 (MUST)**: Read relevant files (include existing tests) to understand the problem and create a plan BEFORE writing code
- **BP-2 (MUST)**: User must explicitly approve the plan before implementation
- **BP-3 (MUST)**: When planning, write test code BEFORE implementation code
- **BP-4 (MUST)**: For backend API changes, include "update Swagger docs" in plan

## Backend Development (TDD Required)
- **TDD-1 (MUST)**: Write tests based on expected input/output pairs; avoid mocks
- **TDD-2 (MUST)**: Follow Red-Green-Refactor cycle:
  1. Red: Write failing test (run to confirm it fails)
  2. Green: Write minimal code to pass (no test modifications)
  3. Refactor: Improve code while keeping tests green
- **TDD-3 (MUST)**: Run tests to confirm failures BEFORE writing implementation
- **TDD-4 (MUST)**: If tests fail repeatedly, DO NOT skip, remove, or modify tests to pass
- **TDD-5 (SHOULD)**: Run single tests for performance, not full suite
- Integration tests: `backend/tests/integration/routes` using supertest and mongodb-memory-server
- Follow Model-Controller-Service pattern
- Update Swagger docs after route changes (see `backend/docs/SWAGGER_GUIDE.md`)

## Frontend Development
- **FE-1 (SHOULD NOT)**: Don't write tests for components
- **FE-2 (SHOULD)**: Write tests for utils, APIs, and service interfaces
- **FE-3 (MUST)**: State user interactions for manual testing instead
- **FE-3 (MUST)**: Read the appropriate backend route to ensure handling correct response structure
- **FE-4 (MUST)**: Write testable code by completely separating the view part of the app from business logic. Write code in multiple small modules rather than one big file.

## Code Quality
- **CQ-1 (MUST)**: Check types.ts for object shapes; never assume structure
- **CQ-2 (SHOULD)**: Write DRY code; refactor hardcoded values into reusable locations
- **CQ-3 (MUST)**: Refactor along the way; re-run tests and type checks after changes
- **CQ-4 (MUST)**: Develop iteratively with frequent type checks and test runs