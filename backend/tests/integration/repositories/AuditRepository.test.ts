import { Kysely } from 'kysely';
import { Database } from '../../../src/db/types';
import { createAuditRepository } from '../../../src/repositories/AuditRepository';
import { createUserRepository } from '../../../src/repositories/UserRepository';
import { TestContainer } from '../../utils/testContainer';
import { AuditLogAction } from '../../../src/types';

describe('AuditRepository', () => {
  const testContainer = new TestContainer();
  let db: Kysely<Database>;
  let auditRepository: ReturnType<typeof createAuditRepository>;
  let userRepository: ReturnType<typeof createUserRepository>;
  let testUserId: string;

  beforeAll(async () => {
    db = await testContainer.start();
    auditRepository = createAuditRepository(db);
    userRepository = createUserRepository(db);
  });

  afterAll(async () => {
    await testContainer.stop();
  });

  beforeEach(async () => {
    await testContainer.clearDatabase();

    // Create a test user for audit logs
    const user = await userRepository.create({
      email: 'test@example.com',
      password: 'hashedpassword123',
      name: 'Test User',
    });
    testUserId = user.id;
  });

  describe('create', () => {
    it('should create a new audit log entry with all fields', async () => {
      const auditData = {
        userId: testUserId,
        action: AuditLogAction.LOGIN_SUCCESS,
        resourceType: 'user',
        resourceId: testUserId,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        metadata: { loginMethod: 'email', twoFactorEnabled: false },
        severity: 'info' as const,
      };

      const auditLog = await auditRepository.create(auditData);

      expect(auditLog).toBeDefined();
      expect(auditLog.id).toBeDefined();
      expect(auditLog.userId).toBe(testUserId);
      expect(auditLog.action).toBe(AuditLogAction.LOGIN_SUCCESS);
      expect(auditLog.resourceType).toBe('user');
      expect(auditLog.resourceId).toBe(testUserId);
      expect(auditLog.ipAddress).toBe('192.168.1.1');
      expect(auditLog.userAgent).toBe('Mozilla/5.0');
      expect(auditLog.metadata).toEqual({ loginMethod: 'email', twoFactorEnabled: false });
      expect(auditLog.severity).toBe('info');
      expect(auditLog.createdAt).toBeInstanceOf(Date);
    });

    it('should create audit log with minimal required fields', async () => {
      const auditData = {
        action: AuditLogAction.LOGIN_FAILED,
        severity: 'warn' as const,
      };

      const auditLog = await auditRepository.create(auditData);

      expect(auditLog).toBeDefined();
      expect(auditLog.id).toBeDefined();
      expect(auditLog.userId).toBeNull();
      expect(auditLog.action).toBe(AuditLogAction.LOGIN_FAILED);
      expect(auditLog.resourceType).toBeNull();
      expect(auditLog.resourceId).toBeNull();
      expect(auditLog.ipAddress).toBeNull();
      expect(auditLog.userAgent).toBeNull();
      expect(auditLog.metadata).toBeNull();
      expect(auditLog.severity).toBe('warn');
      expect(auditLog.createdAt).toBeInstanceOf(Date);
    });

    it('should create audit log for unauthenticated event (null userId)', async () => {
      const auditData = {
        userId: null,
        action: AuditLogAction.LOGIN_FAILED,
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0',
        metadata: { email: 'unknown@example.com', reason: 'invalid_credentials' },
        severity: 'warn' as const,
      };

      const auditLog = await auditRepository.create(auditData);

      expect(auditLog).toBeDefined();
      expect(auditLog.userId).toBeNull();
      expect(auditLog.action).toBe(AuditLogAction.LOGIN_FAILED);
      expect(auditLog.ipAddress).toBe('192.168.1.100');
      expect(auditLog.metadata).toEqual({ email: 'unknown@example.com', reason: 'invalid_credentials' });
    });

    it('should handle complex metadata objects', async () => {
      const complexMetadata = {
        workoutId: '12345',
        changes: {
          name: { old: 'Morning Workout', new: 'Evening Workout' },
          date: { old: '2024-01-01', new: '2024-01-02' },
        },
        blocksAffected: [1, 2, 3],
        nested: {
          deep: {
            value: 'test',
          },
        },
      };

      const auditData = {
        userId: testUserId,
        action: AuditLogAction.WORKOUT_UPDATED,
        resourceType: 'workout',
        resourceId: '12345',
        metadata: complexMetadata,
        severity: 'info' as const,
      };

      const auditLog = await auditRepository.create(auditData);

      expect(auditLog.metadata).toEqual(complexMetadata);
    });

    it('should create audit log with different severity levels', async () => {
      const infoLog = await auditRepository.create({
        userId: testUserId,
        action: AuditLogAction.LOGIN_SUCCESS,
        severity: 'info',
      });

      const warnLog = await auditRepository.create({
        userId: testUserId,
        action: AuditLogAction.AUTHORIZATION_FAILED,
        severity: 'warn',
      });

      const errorLog = await auditRepository.create({
        action: AuditLogAction.SERVER_ERROR,
        severity: 'error',
      });

      expect(infoLog.severity).toBe('info');
      expect(warnLog.severity).toBe('warn');
      expect(errorLog.severity).toBe('error');
    });
  });

  describe('findByUserId', () => {
    beforeEach(async () => {
      // Create multiple audit logs for the test user
      await auditRepository.create({
        userId: testUserId,
        action: AuditLogAction.LOGIN_SUCCESS,
        severity: 'info',
      });

      await auditRepository.create({
        userId: testUserId,
        action: AuditLogAction.WORKOUT_CREATED,
        resourceType: 'workout',
        resourceId: '123',
        severity: 'info',
      });

      await auditRepository.create({
        userId: testUserId,
        action: AuditLogAction.WORKOUT_DELETED,
        resourceType: 'workout',
        resourceId: '123',
        severity: 'info',
      });

      // Create audit log for a different user
      const otherUser = await userRepository.create({
        email: 'other@example.com',
        password: 'hashedpassword456',
        name: 'Other User',
      });

      await auditRepository.create({
        userId: otherUser.id,
        action: AuditLogAction.LOGIN_SUCCESS,
        severity: 'info',
      });
    });

    it('should find all audit logs for a specific user', async () => {
      const logs = await auditRepository.findByUserId(testUserId);

      expect(logs).toHaveLength(3);
      expect(logs.every((log) => log.userId === testUserId)).toBe(true);
    });

    it('should return empty array for user with no logs', async () => {
      const newUser = await userRepository.create({
        email: 'newuser@example.com',
        password: 'hashedpassword789',
        name: 'New User',
      });

      const logs = await auditRepository.findByUserId(newUser.id);

      expect(logs).toHaveLength(0);
    });

    it('should order logs by created_at descending (newest first)', async () => {
      const logs = await auditRepository.findByUserId(testUserId);

      expect(logs[0].action).toBe(AuditLogAction.WORKOUT_DELETED);
      expect(logs[1].action).toBe(AuditLogAction.WORKOUT_CREATED);
      expect(logs[2].action).toBe(AuditLogAction.LOGIN_SUCCESS);
    });
  });

  describe('findByAction', () => {
    beforeEach(async () => {
      // Create logs with different actions
      await auditRepository.create({
        userId: testUserId,
        action: AuditLogAction.LOGIN_SUCCESS,
        severity: 'info',
      });

      await auditRepository.create({
        userId: testUserId,
        action: AuditLogAction.LOGIN_SUCCESS,
        severity: 'info',
      });

      await auditRepository.create({
        action: AuditLogAction.LOGIN_FAILED,
        ipAddress: '192.168.1.100',
        severity: 'warn',
      });

      await auditRepository.create({
        userId: testUserId,
        action: AuditLogAction.WORKOUT_CREATED,
        severity: 'info',
      });
    });

    it('should find all audit logs for a specific action', async () => {
      const logs = await auditRepository.findByAction(AuditLogAction.LOGIN_SUCCESS);

      expect(logs).toHaveLength(2);
      expect(logs.every((log) => log.action === AuditLogAction.LOGIN_SUCCESS)).toBe(true);
    });

    it('should find failed login attempts', async () => {
      const logs = await auditRepository.findByAction(AuditLogAction.LOGIN_FAILED);

      expect(logs).toHaveLength(1);
      expect(logs[0].action).toBe(AuditLogAction.LOGIN_FAILED);
      expect(logs[0].userId).toBeNull();
      expect(logs[0].severity).toBe('warn');
    });

    it('should return empty array for action with no logs', async () => {
      const logs = await auditRepository.findByAction(AuditLogAction.PASSWORD_CHANGED);

      expect(logs).toHaveLength(0);
    });
  });

  describe('findByDateRange', () => {
    beforeEach(async () => {
      // Create logs at different times (we'll use the database timestamps)
      await auditRepository.create({
        userId: testUserId,
        action: AuditLogAction.LOGIN_SUCCESS,
        severity: 'info',
      });

      // Wait a tiny bit to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 10));

      await auditRepository.create({
        userId: testUserId,
        action: AuditLogAction.WORKOUT_CREATED,
        severity: 'info',
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      await auditRepository.create({
        userId: testUserId,
        action: AuditLogAction.WORKOUT_DELETED,
        severity: 'info',
      });
    });

    it('should find logs within date range', async () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

      const logs = await auditRepository.findByDateRange(oneHourAgo, oneHourFromNow);

      expect(logs.length).toBeGreaterThanOrEqual(3);
    });

    it('should return empty array for future date range', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);

      const logs = await auditRepository.findByDateRange(tomorrow, nextWeek);

      expect(logs).toHaveLength(0);
    });

    it('should include logs at exact boundary timestamps', async () => {
      // Get the actual timestamps from the created logs
      const allLogs = await auditRepository.findByUserId(testUserId);
      const oldestLog = allLogs[allLogs.length - 1];
      const newestLog = allLogs[0];

      const logs = await auditRepository.findByDateRange(
        oldestLog.createdAt,
        newestLog.createdAt
      );

      expect(logs.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('findBySeverity', () => {
    beforeEach(async () => {
      await auditRepository.create({
        userId: testUserId,
        action: AuditLogAction.LOGIN_SUCCESS,
        severity: 'info',
      });

      await auditRepository.create({
        action: AuditLogAction.LOGIN_FAILED,
        severity: 'warn',
      });

      await auditRepository.create({
        action: AuditLogAction.LOGIN_FAILED,
        severity: 'warn',
      });

      await auditRepository.create({
        action: AuditLogAction.SERVER_ERROR,
        severity: 'error',
      });
    });

    it('should find all info logs', async () => {
      const logs = await auditRepository.findBySeverity('info');

      expect(logs).toHaveLength(1);
      expect(logs[0].severity).toBe('info');
    });

    it('should find all warning logs', async () => {
      const logs = await auditRepository.findBySeverity('warn');

      expect(logs).toHaveLength(2);
      expect(logs.every((log) => log.severity === 'warn')).toBe(true);
    });

    it('should find all error logs', async () => {
      const logs = await auditRepository.findBySeverity('error');

      expect(logs).toHaveLength(1);
      expect(logs[0].severity).toBe('error');
      expect(logs[0].action).toBe(AuditLogAction.SERVER_ERROR);
    });
  });

  describe('complex queries', () => {
    beforeEach(async () => {
      // Create a realistic audit trail
      await auditRepository.create({
        userId: testUserId,
        action: AuditLogAction.LOGIN_SUCCESS,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        severity: 'info',
      });

      await auditRepository.create({
        userId: testUserId,
        action: AuditLogAction.WORKOUT_CREATED,
        resourceType: 'workout',
        resourceId: '100',
        ipAddress: '192.168.1.1',
        severity: 'info',
      });

      await auditRepository.create({
        userId: testUserId,
        action: AuditLogAction.WORKOUT_UPDATED,
        resourceType: 'workout',
        resourceId: '100',
        ipAddress: '192.168.1.1',
        metadata: { changes: { name: 'Updated Name' } },
        severity: 'info',
      });

      await auditRepository.create({
        userId: testUserId,
        action: AuditLogAction.WORKOUT_DELETED,
        resourceType: 'workout',
        resourceId: '100',
        ipAddress: '192.168.1.1',
        severity: 'info',
      });

      await auditRepository.create({
        action: AuditLogAction.LOGIN_FAILED,
        ipAddress: '192.168.1.100',
        metadata: { email: 'hacker@example.com' },
        severity: 'warn',
      });
    });

    it('should track complete audit trail for a user', async () => {
      const userLogs = await auditRepository.findByUserId(testUserId);

      expect(userLogs).toHaveLength(4);

      // Should be in reverse chronological order
      expect(userLogs[0].action).toBe(AuditLogAction.WORKOUT_DELETED);
      expect(userLogs[1].action).toBe(AuditLogAction.WORKOUT_UPDATED);
      expect(userLogs[2].action).toBe(AuditLogAction.WORKOUT_CREATED);
      expect(userLogs[3].action).toBe(AuditLogAction.LOGIN_SUCCESS);
    });

    it('should identify security incidents (failed logins)', async () => {
      const securityIncidents = await auditRepository.findBySeverity('warn');

      expect(securityIncidents).toHaveLength(1);
      expect(securityIncidents[0].action).toBe(AuditLogAction.LOGIN_FAILED);
      expect(securityIncidents[0].ipAddress).toBe('192.168.1.100');
      expect(securityIncidents[0].metadata).toEqual({ email: 'hacker@example.com' });
    });

    it('should track resource lifecycle (workout creation → update → deletion)', async () => {
      const workoutLogs = await auditRepository.findByUserId(testUserId);
      const workoutLifecycle = workoutLogs.filter(
        (log) =>
          log.action === AuditLogAction.WORKOUT_CREATED ||
          log.action === AuditLogAction.WORKOUT_UPDATED ||
          log.action === AuditLogAction.WORKOUT_DELETED
      );

      expect(workoutLifecycle).toHaveLength(3);
      expect(workoutLifecycle.every((log) => log.resourceId === '100')).toBe(true);
      expect(workoutLifecycle.every((log) => log.resourceType === 'workout')).toBe(true);
    });
  });
});
