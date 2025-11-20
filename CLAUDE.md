# **1. Commands**

* `npm run install` — Install deps
* `npm run build` — Build project
* `npm run type-check` / `npx tsc --noEmit` — TS validation
* Backend tests (run inside `backend/`):

  * Unit: `npm run test:unit`
  * Integration: `npm run test:integration`

---

# **2. Code Style**

* Use **ES modules only** (no CommonJS)
* Prefer destructured imports
* Use `Promise.all` for parallelizable async operations
* Import existing types from `types.ts` (never redefine)

---

# **3. Workflow Rules**

## **Planning (Required before coding)**

* **BP-1**: Read all relevant code + tests before planning
* **BP-2**: Present a step-by-step plan; await explicit approval
* **BP-3**: Plan must list tests that will be written *before* implementation
* **BP-4**: Backend API changes must include “update Swagger docs”

No code before approval.

---

# **4. Backend Development (Strict TDD)**

### **Testing**

* **TDD-1**: Write tests based on real input/output
* **TDD-2**: Red → Green → Refactor
* **TDD-3**: Confirm test fails before implementing
* **TDD-4**: Never skip/modify/delete tests to force passing
* **TDD-5**: Prefer running single tests during iteration

## **Effective Testing Guidelines (No Mock-Testing Anti-Pattern)**
* **TDD-6 (MUST NOT)**: Never write tests that only assert mocked return values or that a mock was called. If the test would pass with an empty implementation, delete it.
* **TDD-7 (MUST)**: Service and API tests should be integration tests using real DB + real HTTP (supertest). Only mock *external* services you don’t control.
* **TDD-8 (SHOULD)**: Unit tests belong only to pure functions—no I/O, no DB, minimal/no mocks.
* **TDD-9 (MUST)**: If you find yourself mocking every dependency in a service test, rewrite it as an integration test.

**Quick check:** If the test is “just testing the mock,” replace it with a real behavior test or an integration test.

### **Architecture**

* **BE-1**: Use factory pattern for dependency injection. Every layer must be created via a factory function (createX) that receives its dependencies as parameters—no imports of concrete instances inside the layer. This ensures all components are testable, replaceable, and follow consistent DI across backend architecture.
* Integration tests: `backend/tests/integration` with supertest + Postgres test DB
* Dependency chain: **Repository → Service → Controller → Route Handler** (each constructed by its own factory). 
* Update Swagger docs on every route change
* Optional: write test outputs to `tmp/` for CLI diffing

---

# **5. Frontend Development (Strict TDD)**

### **Testing**

* **FE-1**: Red → Green → Refactor
* **FE-2**: Use AAA; assert rendered UI (text/accessibility/interactions), not props/state/testIDs
* **FE-3**: Read backend route structure before writing UI tests
* **FE-4**: Separate UI, business logic, and state; keep modules small

---

# **6. Styling & Design System**

### **Theme Usage**

* **FE-5**: Always use centralized theme (`frontend/src/theme`)
* **FE-6**: Import with
  `import { colors, spacing, typography, radius, shadows } from '../theme'`
* **FE-7**: Use semantic tokens (e.g., `colors.primary`, `spacing.md`, `typography.sizes.md`)
* **FE-8**: Add new tokens to the theme first
* **FE-9**: Extract reusable components/hooks when possible

### **Aesthetic Rules (“Warm Athletic Performance”)**

* **FE-10**: Avoid generic/AI-slop aesthetics
* **FE-11**: Use IBM Plex Sans; avoid Inter/Roboto/etc.
* **FE-12**: Colors: burnt orange primary + espresso neutrals
* **FE-13**: Strong, dramatic hierarchy (large size/weight jumps)
* **FE-14**: Use animations intentionally; prefer CSS-only
* **FE-15**: Use layered gradients/patterns over flat backgrounds
* **FE-16**: Keep visual style consistent across the app

---

# **7. Code Quality**

* **CQ-1**: Check `types.ts` before assuming object shape
* **CQ-2**: DRY; centralize constants (especially design tokens)
* **CQ-3**: Refactor continuously with tests green
* **CQ-4**: Run type checks + tests frequently
* **CQ-5**: Remove dead/backwards-compatibility code

---

# **8. Agent Summary (TL;DR)**

* Plan first → get approval → write tests → write code
* Use strict TDD on both backend & frontend
* Use the theme for *all* styling; never hardcode
* Use ES modules + factory patterns
* Keep Swagger/types/tests updated on every change
* Maintain consistent “Warm Athletic Performance” aesthetic
