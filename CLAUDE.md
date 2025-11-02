# Bash commands
- npm run build: Build the project
- npm run type-check: Check types without building
- npm run test: Run tests. Should be called in the backend/ directory

# Code style
- Use ES modules (import/export) syntax, not CommonJS (require)
- Destructure imports when possible (eg. import { foo } from 'bar')

# Workflow
- YOU MUST read relevant files and make a plan for how to approach a specific problem, BEFORE writing any code. The user must explicitly agree to the plan
  - When creating a plan, put writing test code before any implementation code.
  - When creating a plan, specifically add updating Swagger to the todos for a backend API change.
- YOU MUST follow test-driven development (TDD):
  - Write tests based on expected input/output pairs; avoid writing mocks
  - Run tests to confirm that they fail. Don't write any implementation code at this stage
  - Write code that passes the test, without modifying the test, until tests pass
  - Backend HTTP integration tests in tests/integration/routes with supertest and mongodb-memory-server
  - If a test keeps failing, DO NOT just skip, remove, or modify the test so that it passe  s
- Do not assume the fields of objects -- check the shape of objects from types.ts files
- Prefer running single tests, and not the whole test suite, for performance
- Write pragmatic, DRY (Do not Repeat Yourself) code. If you find yourself writing lots of hard-coded values, check if it exists or should be refactored somewhere so it can be reused.
  - Refactor along the way and re-run tests and type checks
- Develop iteratively (frequently check types, write and run tests)
- Follow the Model Controller Service pattern
- When modifying backend routes, update the Swagger UI docs (See backend/docs/SWAGGER_GUIDE.md)
