import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // Enable pg_trgm extension for trigram similarity search
  await sql`CREATE EXTENSION IF NOT EXISTS pg_trgm`.execute(db);

  // Create users table
  await db.schema
    .createTable('users')
    .addColumn('id', 'bigserial', (col) => col.primaryKey())
    .addColumn('email', 'varchar(255)', (col) => col.notNull().unique())
    .addColumn('password', 'varchar(255)', (col) => col.notNull())
    .addColumn('name', 'varchar(255)', (col) => col.notNull())
    .addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn('updated_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  // Create exercises table
  await db.schema
    .createTable('exercises')
    .addColumn('id', 'bigserial', (col) => col.primaryKey())
    .addColumn('name', 'varchar(255)', (col) => col.notNull())
    .addColumn('slug', 'varchar(255)', (col) => col.notNull().unique())
    .addColumn('needs_review', 'boolean', (col) => col.notNull().defaultTo(false))
    .addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn('updated_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  // Create indexes for exercises
  await db.schema.createIndex('exercises_name_idx').on('exercises').column('name').execute();

  await db.schema
    .createIndex('exercises_needs_review_idx')
    .on('exercises')
    .column('needs_review')
    .execute();

  // Create GIN index for trigram search on exercise name
  await sql`CREATE INDEX exercises_name_trgm_idx ON exercises USING gin (name gin_trgm_ops)`.execute(
    db
  );

  // Create exercise_tags table (junction table)
  await db.schema
    .createTable('exercise_tags')
    .addColumn('id', 'bigserial', (col) => col.primaryKey())
    .addColumn('exercise_id', 'bigint', (col) =>
      col.notNull().references('exercises.id').onDelete('cascade')
    )
    .addColumn('tag', 'varchar(100)', (col) => col.notNull())
    .addUniqueConstraint('exercise_tags_exercise_id_tag_unique', ['exercise_id', 'tag'])
    .execute();

  // Create indexes for exercise_tags
  await db.schema
    .createIndex('exercise_tags_exercise_id_idx')
    .on('exercise_tags')
    .column('exercise_id')
    .execute();

  await db.schema.createIndex('exercise_tags_tag_idx').on('exercise_tags').column('tag').execute();

  // Create workouts table
  await db.schema
    .createTable('workouts')
    .addColumn('id', 'bigserial', (col) => col.primaryKey())
    .addColumn('user_id', 'bigint', (col) =>
      col.notNull().references('users.id').onDelete('cascade')
    )
    .addColumn('name', 'varchar(255)', (col) => col.notNull())
    .addColumn('date', 'date', (col) => col.notNull())
    .addColumn('last_modified_time', 'timestamptz', (col) => col.notNull())
    .addColumn('notes', 'text')
    .addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn('updated_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  // Create indexes for workouts
  await db.schema.createIndex('workouts_user_id_idx').on('workouts').column('user_id').execute();

  await db.schema
    .createIndex('workouts_user_id_date_idx')
    .on('workouts')
    .columns(['user_id', 'date'])
    .execute();

  await db.schema
    .createIndex('workouts_user_id_last_modified_time_idx')
    .on('workouts')
    .columns(['user_id', 'last_modified_time'])
    .execute();

  // Create workout_blocks table
  await db.schema
    .createTable('workout_blocks')
    .addColumn('id', 'bigserial', (col) => col.primaryKey())
    .addColumn('workout_id', 'bigint', (col) =>
      col.notNull().references('workouts.id').onDelete('cascade')
    )
    .addColumn('label', 'varchar(255)')
    .addColumn('notes', 'text')
    .addColumn('order_in_workout', 'integer', (col) => col.notNull())
    .execute();

  // Create indexes for workout_blocks
  await db.schema
    .createIndex('workout_blocks_workout_id_idx')
    .on('workout_blocks')
    .column('workout_id')
    .execute();

  await db.schema
    .createIndex('workout_blocks_workout_id_order_idx')
    .on('workout_blocks')
    .columns(['workout_id', 'order_in_workout'])
    .execute();

  // Create exercise_instances table
  await db.schema
    .createTable('exercise_instances')
    .addColumn('id', 'bigserial', (col) => col.primaryKey())
    .addColumn('workout_block_id', 'bigint', (col) =>
      col.notNull().references('workout_blocks.id').onDelete('cascade')
    )
    .addColumn('exercise_id', 'bigint', (col) => col.notNull().references('exercises.id'))
    .addColumn('order_in_block', 'integer', (col) => col.notNull())
    .addColumn('prescription', 'text')
    .addColumn('notes', 'text')
    .execute();

  // Create indexes for exercise_instances
  await db.schema
    .createIndex('exercise_instances_workout_block_id_idx')
    .on('exercise_instances')
    .column('workout_block_id')
    .execute();

  await db.schema
    .createIndex('exercise_instances_exercise_id_idx')
    .on('exercise_instances')
    .column('exercise_id')
    .execute();

  await db.schema
    .createIndex('exercise_instances_workout_block_id_order_idx')
    .on('exercise_instances')
    .columns(['workout_block_id', 'order_in_block'])
    .execute();

  // Create set_instances table
  await db.schema
    .createTable('set_instances')
    .addColumn('id', 'bigserial', (col) => col.primaryKey())
    .addColumn('exercise_instance_id', 'bigint', (col) =>
      col.notNull().references('exercise_instances.id').onDelete('cascade')
    )
    .addColumn('set_number', 'integer', (col) => col.notNull())
    .addColumn('reps', 'integer')
    .addColumn('weight', 'numeric(10, 2)')
    .addColumn('weight_unit', 'varchar(10)', (col) => col.notNull())
    .addColumn('duration', 'integer')
    .addColumn('rpe', 'integer')
    .addColumn('notes', 'text')
    .execute();

  // Add check constraints for set_instances
  await sql`ALTER TABLE set_instances ADD CONSTRAINT weight_unit_check CHECK (weight_unit IN ('lbs', 'kg'))`.execute(
    db
  );

  await sql`ALTER TABLE set_instances ADD CONSTRAINT rpe_check CHECK (rpe >= 1 AND rpe <= 10)`.execute(
    db
  );

  // Create indexes for set_instances
  await db.schema
    .createIndex('set_instances_exercise_instance_id_idx')
    .on('set_instances')
    .column('exercise_instance_id')
    .execute();

  await db.schema
    .createIndex('set_instances_exercise_instance_id_set_number_idx')
    .on('set_instances')
    .columns(['exercise_instance_id', 'set_number'])
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  // Drop tables in reverse order (respecting foreign key constraints)
  await db.schema.dropTable('set_instances').ifExists().execute();
  await db.schema.dropTable('exercise_instances').ifExists().execute();
  await db.schema.dropTable('workout_blocks').ifExists().execute();
  await db.schema.dropTable('workouts').ifExists().execute();
  await db.schema.dropTable('exercise_tags').ifExists().execute();
  await db.schema.dropTable('exercises').ifExists().execute();
  await db.schema.dropTable('users').ifExists().execute();

  // Drop pg_trgm extension
  await sql`DROP EXTENSION IF EXISTS pg_trgm`.execute(db);
}
