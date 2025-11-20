import { Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // Add failed_login_attempts column (default 0)
  await db.schema
    .alterTable('users')
    .addColumn('failed_login_attempts', 'integer', (col) => col.notNull().defaultTo(0))
    .execute();

  // Add locked_until column (nullable timestamptz)
  await db.schema
    .alterTable('users')
    .addColumn('locked_until', 'timestamptz')
    .execute();

  // Create index on locked_until for efficient lockout checks
  await db.schema
    .createIndex('users_locked_until_idx')
    .on('users')
    .column('locked_until')
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  // Drop index
  await db.schema.dropIndex('users_locked_until_idx').execute();

  // Drop columns in reverse order
  await db.schema.alterTable('users').dropColumn('locked_until').execute();
  await db.schema.alterTable('users').dropColumn('failed_login_attempts').execute();
}
