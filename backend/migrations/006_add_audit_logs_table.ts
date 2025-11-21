import { Kysely, sql } from 'kysely';

/**
 * Migration to add audit_logs table for security event tracking
 * Addresses VULN-012: No Audit Logging
 *
 * This table stores security-relevant events including:
 * - Authentication attempts (success/failure)
 * - Authorization failures (403 errors)
 * - Data modifications (create/update/delete)
 * - Account changes (password resets, email changes)
 * - Suspicious activity (rate limits, prompt injection)
 */
export async function up(db: Kysely<any>): Promise<void> {
  // Create audit_logs table
  await db.schema
    .createTable('audit_logs')
    .addColumn('id', 'bigserial', (col) => col.primaryKey())
    .addColumn('user_id', 'bigint', (col) =>
      col.references('users.id').onDelete('set null')
    )
    .addColumn('action', 'varchar(100)', (col) => col.notNull())
    .addColumn('resource_type', 'varchar(100)')
    .addColumn('resource_id', 'varchar(100)')
    .addColumn('ip_address', 'varchar(45)') // IPv6 max length
    .addColumn('user_agent', 'text')
    .addColumn('metadata', 'jsonb')
    .addColumn('severity', 'varchar(10)', (col) => col.notNull().defaultTo('info'))
    .addColumn('created_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`)
    )
    .execute();

  // Create index on user_id for efficient querying of user activity
  await db.schema
    .createIndex('audit_logs_user_id_idx')
    .on('audit_logs')
    .column('user_id')
    .execute();

  // Create index on action for filtering by event type
  await db.schema
    .createIndex('audit_logs_action_idx')
    .on('audit_logs')
    .column('action')
    .execute();

  // Create index on created_at for time-based queries
  await db.schema
    .createIndex('audit_logs_created_at_idx')
    .on('audit_logs')
    .column('created_at')
    .execute();

  // Create composite index for common query patterns (user + time range)
  await db.schema
    .createIndex('audit_logs_user_id_created_at_idx')
    .on('audit_logs')
    .columns(['user_id', 'created_at'])
    .execute();

  // Add check constraint for severity values
  await sql`
    ALTER TABLE audit_logs
    ADD CONSTRAINT audit_logs_severity_check
    CHECK (severity IN ('info', 'warn', 'error'))
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  // Drop the audit_logs table (cascades to indexes automatically)
  await db.schema.dropTable('audit_logs').execute();
}
