import type { Request } from 'express';
import type { AuditRepository } from '../repositories/AuditRepository';
import type { AuditLogAction, AuditLogSeverity, AuthenticatedRequest } from '../types';
import { auditLogger } from '../config/logger';

/**
 * AuditService
 * Provides high-level methods for logging security-relevant events
 * Uses dual output: Pino for structured logs + AuditRepository for DB persistence
 *
 * Addresses VULN-012: No Audit Logging
 * - Logs authentication attempts (success/failure)
 * - Logs authorization failures (403 errors)
 * - Logs data modifications (create/update/delete)
 * - Logs account changes (password resets, email changes)
 * - Logs suspicious activity (rate limits, prompt injection)
 */
export function createAuditService(auditRepository: AuditRepository) {
  /**
   * Extract IP address from request (handles proxies)
   */
  function getIpAddress(req: Request): string | null {
    // Check X-Forwarded-For header (Railway, load balancers)
    const forwardedFor = req.headers['x-forwarded-for'];
    if (forwardedFor && typeof forwardedFor === 'string') {
      return forwardedFor.split(',')[0].trim();
    }

    // Check X-Real-IP header (nginx)
    const realIp = req.headers['x-real-ip'];
    if (realIp && typeof realIp === 'string') {
      return realIp;
    }

    // Fallback to req.ip
    return req.ip ?? null;
  }

  /**
   * Extract user agent from request
   */
  function getUserAgent(req: Request): string | null {
    return (req.headers['user-agent'] as string) ?? null;
  }

  return {
    /**
     * Log authentication events (login success/failure, registration, logout)
     */
    async logAuth(
      action: AuditLogAction,
      req: Request,
      metadata?: {
        userId?: string;
        email?: string;
        reason?: string;
        [key: string]: any;
      }
    ): Promise<void> {
      const severity: AuditLogSeverity =
        action === 'LOGIN_FAILED' || action === 'INVALID_TOKEN' ? 'warn' : 'info';

      const logData = {
        userId: metadata?.userId ?? null,
        action,
        resourceType: 'user' as const,
        resourceId: metadata?.userId ?? null,
        ipAddress: getIpAddress(req),
        userAgent: getUserAgent(req),
        metadata: metadata ?? null,
        severity,
      };

      // Log to Pino (structured logs for Railway)
      auditLogger[severity]({
        ...logData,
        message: `Auth event: ${action}`,
      });

      // Persist to database
      await auditRepository.create(logData);
    },

    /**
     * Log data modification events (create, update, delete)
     */
    async logDataModification(
      action: AuditLogAction,
      req: AuthenticatedRequest,
      resourceType: string,
      resourceId: string,
      metadata?: Record<string, any>
    ): Promise<void> {
      const logData = {
        userId: req.userId ?? null,
        action,
        resourceType,
        resourceId,
        ipAddress: getIpAddress(req),
        userAgent: getUserAgent(req),
        metadata: metadata ?? null,
        severity: 'info' as const,
      };

      // Log to Pino
      auditLogger.info({
        ...logData,
        message: `Data modification: ${action} on ${resourceType}:${resourceId}`,
      });

      // Persist to database
      await auditRepository.create(logData);
    },

    /**
     * Log authorization failures (403 errors)
     */
    async logAuthorizationFailure(
      req: AuthenticatedRequest,
      resourceType: string,
      resourceId: string,
      reason?: string
    ): Promise<void> {
      const logData = {
        userId: req.userId ?? null,
        action: 'AUTHORIZATION_FAILED' as AuditLogAction,
        resourceType,
        resourceId,
        ipAddress: getIpAddress(req),
        userAgent: getUserAgent(req),
        metadata: { reason: reason ?? 'Access denied' },
        severity: 'warn' as const,
      };

      // Log to Pino
      auditLogger.warn({
        ...logData,
        message: `Authorization failed: ${resourceType}:${resourceId}`,
      });

      // Persist to database
      await auditRepository.create(logData);
    },

    /**
     * Log security events (rate limits, prompt injection, suspicious activity)
     */
    async logSecurityEvent(
      action: AuditLogAction,
      req: Request,
      severity: AuditLogSeverity = 'warn',
      metadata?: Record<string, any>
    ): Promise<void> {
      const userId = (req as AuthenticatedRequest).userId ?? null;

      const logData = {
        userId,
        action,
        resourceType: null,
        resourceId: null,
        ipAddress: getIpAddress(req),
        userAgent: getUserAgent(req),
        metadata: metadata ?? null,
        severity,
      };

      // Log to Pino
      auditLogger[severity]({
        ...logData,
        message: `Security event: ${action}`,
      });

      // Persist to database
      await auditRepository.create(logData);
    },

    /**
     * Log server errors (500 errors)
     */
    async logError(
      error: Error,
      req?: Request,
      metadata?: Record<string, any>
    ): Promise<void> {
      const userId = req ? (req as AuthenticatedRequest).userId ?? null : null;

      const logData = {
        userId,
        action: 'SERVER_ERROR' as AuditLogAction,
        resourceType: null,
        resourceId: null,
        ipAddress: req ? getIpAddress(req) : null,
        userAgent: req ? getUserAgent(req) : null,
        metadata: {
          error: error.message,
          stack: error.stack,
          ...metadata,
        },
        severity: 'error' as const,
      };

      // Log to Pino
      auditLogger.error({
        ...logData,
        message: `Server error: ${error.message}`,
      });

      // Persist to database
      await auditRepository.create(logData);
    },

    /**
     * Log account changes (password changes, email changes, account deletion)
     */
    async logAccountChange(
      action: AuditLogAction,
      req: AuthenticatedRequest,
      metadata?: Record<string, any>
    ): Promise<void> {
      const logData = {
        userId: req.userId ?? null,
        action,
        resourceType: 'user',
        resourceId: req.userId ?? null,
        ipAddress: getIpAddress(req),
        userAgent: getUserAgent(req),
        metadata: metadata ?? null,
        severity: 'info' as const,
      };

      // Log to Pino
      auditLogger.info({
        ...logData,
        message: `Account change: ${action}`,
      });

      // Persist to database
      await auditRepository.create(logData);
    },
  };
}

/**
 * Type definition for AuditService (inferred from factory return type)
 */
export type AuditService = ReturnType<typeof createAuditService>;
