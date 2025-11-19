import { Kysely } from 'kysely';
import { Database } from '../../../src/db/types';
import { TestContainer } from '../../utils/testContainer';

describe('seedExercises', () => {
  const testContainer = new TestContainer();
  let db: Kysely<Database>;

  beforeAll(async () => {
    db = await testContainer.start();
  });

  afterAll(async () => {
    await testContainer.stop();
  });

  beforeEach(async () => {
    await testContainer.clearDatabase();
  });

  it('should seed exercises from SQL dump file', async () => {
    // Verify database is empty before seeding
    const beforeCount = await db
      .selectFrom('exercises')
      .select(db.fn.count('id').as('count'))
      .executeTakeFirst();

    expect(Number(beforeCount?.count)).toBe(0);

    // Seed the exercises
    await testContainer.seedExercises();

    // Verify exercises were seeded
    const afterCount = await db
      .selectFrom('exercises')
      .select(db.fn.count('id').as('count'))
      .executeTakeFirst();

    expect(Number(afterCount?.count)).toBeGreaterThan(0);

    // Verify we can query the seeded data
    const exercises = await db.selectFrom('exercises').selectAll().limit(5).execute();

    expect(exercises.length).toBeGreaterThan(0);
    expect(exercises[0]).toHaveProperty('id');
    expect(exercises[0]).toHaveProperty('name');
    expect(exercises[0]).toHaveProperty('slug');
    expect(exercises[0]).toHaveProperty('needs_review');
  });

  it('should seed exercise tags along with exercises', async () => {
    await testContainer.seedExercises();

    // Verify tags were seeded
    const tagsCount = await db
      .selectFrom('exercise_tags')
      .select(db.fn.count('id').as('count'))
      .executeTakeFirst();

    expect(Number(tagsCount?.count)).toBeGreaterThan(0);

    // Verify tags are linked to exercises
    const exerciseWithTags = await db
      .selectFrom('exercises')
      .innerJoin('exercise_tags', 'exercise_tags.exercise_id', 'exercises.id')
      .select(['exercises.id', 'exercises.name', 'exercise_tags.tag'])
      .limit(1)
      .executeTakeFirst();

    expect(exerciseWithTags).toBeDefined();
    expect(exerciseWithTags?.tag).toBeDefined();
  });
});
