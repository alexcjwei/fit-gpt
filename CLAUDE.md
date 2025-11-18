# Tech Stack & Commands
- `npm run build`: Build the project
- `npm run type-check`: Check types without building
- `npm run test:unit`: Run backend unit tests (call from backend/ directory)
- `npm run test:integration`: Run backend integration tests (call from backend/ directory)
- `npx tsc --noEmit`: Verify TypeScript compilation

# Code Style
- Use ES modules (import/export), not CommonJS (require)
- Destructure imports: `import { foo } from 'bar'`
- Use `Promise.all` for parallelizable async calls

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
- Integration tests: `backend/tests/integration/routes` using supertest and PostgreSQL test database
- Follow Model-Controller-Service pattern
- Update Swagger docs after route changes (see `backend/docs/SWAGGER_GUIDE.md`)
- Tip: also write test outputs to a tmp/ directory and use command-line filtering to check the output

## Frontend Development (TDD required)

### Testing Requirements
- **FE-1 (MUST)**: Follow Red-Green-Refactor cycle. Tests before implementation.
- **FE-2 (MUST)**: Write small tests using AAA. For components, test interactions and rendering are expected. Make assertions on rendered text or accessibility helpers rather than props or state or testID.
- **FE-3 (MUST)**: Read the appropriate backend route to ensure handling correct response structure
- **FE-4 (MUST)**: Write testable code by completely separating the view part of the app from business logic and app state. Write code in multiple small modules rather than one big file.

### Styling & Design System
- **FE-5 (MUST)**: ALWAYS use the centralized theme from `frontend/src/theme/` - NEVER hardcode colors, spacing, typography, or other design tokens
- **FE-6 (MUST)**: Import theme values: `import { colors, spacing, typography, radius, shadows } from '../theme'`
- **FE-7 (MUST)**: Use semantic theme tokens:
  - Colors: `colors.primary`, `colors.text`, `colors.background`, etc.
  - Spacing: `spacing.xs`, `spacing.sm`, `spacing.md`, etc.
  - Typography: `typography.sizes.md`, `typography.weights.semibold`, etc.
  - Radius: `radius.sm`, `radius.md`, `radius.lg`, etc.
- **FE-8 (MUST)**: For new design tokens, add them to the theme file first, then use throughout components
- **FE-9 (SHOULD)**: Extract reusable components and hooks to avoid duplication

### Design Philosophy - "Warm Athletic Performance"
- **FE-10 (MUST)**: Avoid generic "AI slop" aesthetics - create distinctive, memorable designs
- **FE-11 (SHOULD)**: Typography: Use IBM Plex Sans (loaded via `useFontLoader` hook). Avoid generic fonts like Inter, Roboto, Arial, or system fonts
- **FE-12 (SHOULD)**: Color scheme: Use the warm burnt orange primary (`colors.primary`) with espresso tones for text. Avoid generic blue or purple gradients
- **FE-13 (SHOULD)**: Hierarchy: Use extreme size/weight contrasts (e.g., 200 vs 800 weight, 3x+ size jumps) not subtle differences
- **FE-14 (SHOULD)**: Motion: Use animations for high-impact moments. Prefer CSS-only solutions; use Motion library for React when available
- **FE-15 (SHOULD)**: Backgrounds: Create atmosphere with layered gradients or geometric patterns, not flat solid colors
- **FE-16 (SHOULD)**: Consistency: Commit to a cohesive aesthetic throughout the app, not scattered micro-interactions

## Code Quality
- **CQ-1 (MUST)**: Check types.ts for object shapes; never assume structure
- **CQ-2 (SHOULD)**: Write DRY code; refactor hardcoded values into reusable locations (especially design tokens - use the centralized theme)
- **CQ-3 (MUST)**: Refactor along the way; re-run tests and type checks after changes
- **CQ-4 (MUST)**: Develop iteratively with frequent type checks and test runs