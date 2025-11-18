# Test Fixtures

This directory contains SQL dumps used for seeding integration tests with realistic data.

## exercises_seed.sql

Contains a dump of the `exercises` and `exercise_tags` tables from the development database.

### Regenerating the Seed Data

If you need to update the seed data (e.g., after adding new exercises to the dev database), run:

```bash
cd backend
PGPASSWORD=postgres pg_dump -h localhost -p 5432 -U postgres -d fit_gpt_dev \
  --table=exercises \
  --table=exercise_tags \
  --data-only \
  --column-inserts \
  --no-comments \
  | grep -v '^\\' > tests/fixtures/exercises_seed.sql
```

This command:
- Dumps only the data (no schema) from `exercises` and `exercise_tags` tables
- Uses column-inserts format (more readable)
- Filters out psql meta-commands (lines starting with `\`)

### Using in Tests

Import and use the `seedExercises` helper function:

```typescript
import { connect, closeDatabase, clearDatabase, getTestDb, seedExercises } from '../../utils/testDb';

describe('My Test Suite', () => {
  let db: Kysely<Database>;

  beforeAll(async () => {
    await connect();
    db = getTestDb();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  beforeEach(async () => {
    await clearDatabase();
    await seedExercises(); // Load exercises seed data
  });

  it('should have access to real exercise data', async () => {
    const exercises = await db.selectFrom('exercises').selectAll().execute();
    expect(exercises.length).toBeGreaterThan(0);
  });
});
```

The `seedExercises()` function:
- Loads data from `tests/fixtures/exercises_seed.sql`
- Uses `psql` to properly handle all SQL syntax
- Preserves original IDs and relationships
- Sets sequence counters appropriately

### Notes

- The seed data includes 900+ exercises with their associated tags
- Exercise IDs are preserved from the dump (not sequential from 1)
- Foreign key relationships are maintained
- Triggers are handled automatically by the SQL dump
