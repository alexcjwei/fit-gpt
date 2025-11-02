# Bash commands
- npm run build: Build the project
- npm run type-check: Check types without building
- npm run test: Run tests. Should be called in the backend/ directory
- npx tsc --noEmit: Check TS compiles

# Code style
- Use ES modules (import/export) syntax, not CommonJS (require)
- Destructure imports when possible (eg. import { foo } from 'bar')

# Workflow
- YOU MUST read relevant files and make a plan for how to approach a specific problem, BEFORE writing any code. The user must explicitly agree to the plan
  - When creating a plan, put writing test code before any implementation code.
  - When creating a plan, specifically add updating Swagger to the todos for a backend API change.
- Backend-specific guidance:
  - YOU MUST follow test-driven development (TDD):
    - Write tests based on expected input/output pairs; avoid writing mocks
    - Red (failing test), Green (passing test, without test modification), Refactor (Improve the code while keeping tests green)
    - Run tests to confirm that they fail. Don't write any implementation code at this stage
    - Backend HTTP integration tests in tests/integration/routes with supertest and mongodb-memory-server
    - If a test keeps failing, DO NOT just skip, remove, or modify the test so that it passes
    - Prefer running single tests, and not the whole test suite, for performance
  - Follow the Model Controller Service pattern
  - When modifying backend routes, update the Swagger UI docs (See backend/docs/SWAGGER_GUIDE.md)
- Frontend-specific guidance:
  - Don't write tests for components; do write tests for utils and api or service interfaces, things that can be easily tested
  - Instead, state the user interaction that can be manually tested
- Do not assume the shape of objects -- check types.ts 
- Write pragmatic, DRY (Do not Repeat Yourself) code. If you find yourself writing lots of hard-coded values, check if it exists or should be refactored somewhere so it can be reused.
  - Refactor along the way and re-run tests and type checks
- Develop iteratively (frequently check types, write and run tests)
