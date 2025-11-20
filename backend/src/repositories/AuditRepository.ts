import { Kysely } from 'kysely';
import { Database } from '../db/types';
import type {
  AuditLog,
  CreateAuditLogData,
  AuditLogAction,
  AuditLogSeverity,
} from '../types';

/**
 * AuditRepository
 * Handles database operations for audit logging
 * Provides methods to create and query audit logs for security monitoring and compliance
 */
export function createAuditRepository(db: Kysely<Database>) {
  return {
    /**
     * Create a new audit log entry
     * @param data - Audit log data
     * @returns Created audit log
     */
    async create(data: CreateAuditLogData): Promise<AuditLog> {
      const result = await db
        .insertInto('audit_logs')
        .values({
          user_id: data.userId !== undefined ? BigInt(data.userId ?? 0) : null,
          action: data.action,
          resource_type: data.resourceType ?? null,
          resource_id: data.resourceId ?? null,
          ip_address: data.ipAddress ?? null,
          user_agent: data.userAgent ?? null,
          metadata: data.metadata !== undefined ? JSON.stringify(data.metadata) : null,
          severity: data.severity,
        })
        .returningAll()
        .executeTakeFirstOrThrow();

      return {
        id: result.id.toString(),
        userId: result.user_id !== null ? result.user_id.toString() : null,
        action: result.action as AuditLogAction,
        resourceType: result.resource_type,
        resourceId: result.resource_id,
        ipAddress: result.ip_address,
        userAgent: result.user_agent,
        metadata: result.metadata !== null ? (result.metadata as Record<string, any>) : null,
        severity: result.severity as AuditLogSeverity,
        createdAt: new Date(result.created_at as any),
      };
    },

    /**
     * Find all audit logs for a specific user
     * @param userId - User ID to search for
     * @returns Array of audit logs, ordered by created_at descending
     */
    async findByUserId(userId: string): Promise<AuditLog[]> {
      const results = await db
        .selectFrom('audit_logs')
        .selectAll()
        .where('user_id', '=', BigInt(userId))
        .orderBy('created_at', 'desc')
        .execute();

      return results.map((row) => ({
        id: row.id.toString(),
        userId: row.user_id !== null ? row.user_id.toString() : null,
        action: row.action as AuditLogAction,
        resourceType: row.resource_type,
        resourceId: row.resource_id,
        ipAddress: row.ip_address,
        userAgent: row.user_agent,
        metadata: row.metadata !== null ? (row.metadata as Record<string, any>) : null,
        severity: row.severity as AuditLogSeverity,
        createdAt: new Date(row.created_at as any),
      }));
    },

    /**
     * Find all audit logs for a specific action
     * @param action - Action type to search for
     * @returns Array of audit logs, ordered by created_at descending
     */
    async findByAction(action: AuditLogAction): Promise<AuditLog[]> {
      const results = await db
        .selectFrom('audit_logs')
        .selectAll()
        .where('action', '=', action)
        .orderBy('created_at', 'desc')
        .execute();

      return results.map((row) => ({
        id: row.id.toString(),
        userId: row.user_id !== null ? row.user_id.toString() : null,
        action: row.action as AuditLogAction,
        resourceType: row.resource_type,
        resourceId: row.resource_id,
        ipAddress: row.ip_address,
        userAgent: row.user_agent,
        metadata: row.metadata !== null ? (row.metadata as Record<string, any>) : null,
        severity: row.severity as AuditLogSeverity,
        createdAt: new Date(row.created_at as any),
      }));
    },

    /**
     * Find audit logs within a date range
     * @param startDate - Start of date range (inclusive)
     * @param endDate - End of date range (inclusive)
     * @returns Array of audit logs, ordered by created_at descending
     */
    async findByDateRange(startDate: Date, endDate: Date): Promise<AuditLog[]> {
      const results = await db
        .selectFrom('audit_logs')
        .selectAll()
        .where('created_at', '>=', startDate as any)
        .where('created_at', '<=', endDate as any)
        .orderBy('created_at', 'desc')
        .execute();

      return results.map((row) => ({
        id: row.id.toString(),
        userId: row.user_id !== null ? row.user_id.toString() : null,
        action: row.action as AuditLogAction,
        resourceType: row.resource_type,
        resourceId: row.resource_id,
        ipAddress: row.ip_address,
        userAgent: row.user_agent,
        metadata: row.metadata !== null ? (row.metadata as Record<string, any>) : null,
        severity: row.severity as AuditLogSeverity,
        createdAt: new Date(row.created_at as any),
      }));
    },

    /**
     * Find audit logs by severity level
     * @param severity - Severity level to search for (info, warn, error)
     * @returns Array of audit logs, ordered by created_at descending
     */
    async findBySeverity(severity: AuditLogSeverity): Promise<AuditLog[]> {
      const results = await db
        .selectFrom('audit_logs')
        .selectAll()
        .where('severity', '=', severity)
        .orderBy('created_at', 'desc')
        .execute();

      return results.map((row) => ({
        id: row.id.toString(),
        userId: row.user_id !== null ? row.user_id.toString() : null,
        action: row.action as AuditLogAction,
        resourceType: row.resource_type,
        resourceId: row.resource_id,
        ipAddress: row.ip_address,
        userAgent: row.user_agent,
        metadata: row.metadata !== null ? (row.metadata as Record<string, any>) : null,
        severity: row.severity as AuditLogSeverity,
        createdAt: new Date(row.created_at as any),
      }));
    },

    /**
     * Find all audit logs (for admin/debugging purposes)
     * Use with caution - should be paginated in production
     * @param limit - Maximum number of records to return (default: 100)
     * @returns Array of audit logs, ordered by created_at descending
     */
    async findAll(limit: number = 100): Promise<AuditLog[]> {
      const results = await db
        .selectFrom('audit_logs')
        .selectAll()
        .orderBy('created_at', 'desc')
        .limit(limit)
        .execute();

      return results.map((row) => ({
        id: row.id.toString(),
        userId: row.user_id !== null ? row.user_id.toString() : null,
        action: row.action as AuditLogAction,
        resourceType: row.resource_type,
        resourceId: row.resource_id,
        ipAddress: row.ip_address,
        userAgent: row.user_agent,
        metadata: row.metadata !== null ? (row.metadata as Record<string, any>) : null,
        severity: row.severity as AuditLogSeverity,
        createdAt: new Date(row.created_at as any),
      }));
    },
  };
}

/**
 * Type definition for AuditRepository (inferred from factory return type)
 */
export type AuditRepository = ReturnType<typeof createAuditRepository>;
