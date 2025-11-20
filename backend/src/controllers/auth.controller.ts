import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import type { AuthService } from '../services/auth.service';
import type { AuditService } from '../services/audit.service';
import { AppError } from '../middleware/errorHandler';
import { RegisterSchema, LoginSchema, AuditLogAction } from '../types';

/**
 * @swagger
 * components:
 *   schemas:
 *     AuthResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: object
 *           properties:
 *             user:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 email:
 *                   type: string
 *                 name:
 *                   type: string
 *             token:
 *               type: string
 */

/**
 * Create Auth Controller with injected dependencies
 * Factory function pattern for dependency injection
 */
export function createAuthController(authService: AuthService, auditService: AuditService) {
  return {
    /**
     * Register a new user
     */
    register: asyncHandler(async (req: Request, res: Response) => {
      // Validate request with Zod
      const validationResult = RegisterSchema.safeParse(req.body);

      if (!validationResult.success) {
        const errorMessage = validationResult.error.issues
          .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
          .join(', ');
        throw new AppError(`Validation failed: ${errorMessage}`, 400);
      }

      const { email, password, name } = validationResult.data;

      // Register user
      const result = await authService.registerUser(email, password, name);

      // Log successful registration
      await auditService.logAuth(AuditLogAction.USER_REGISTERED, req, {
        userId: result.user.id,
        email: result.user.email,
      });

      res.status(201).json({
        success: true,
        data: result,
      });
    }),

    /**
     * Login a user
     */
    login: asyncHandler(async (req: Request, res: Response) => {
      // Validate request with Zod
      const validationResult = LoginSchema.safeParse(req.body);

      if (!validationResult.success) {
        const errorMessage = validationResult.error.issues
          .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
          .join(', ');
        throw new AppError(`Validation failed: ${errorMessage}`, 400);
      }

      const { email, password } = validationResult.data;

      // Attempt login
      try {
        const result = await authService.loginUser(email, password);

        // Log successful login
        await auditService.logAuth(AuditLogAction.LOGIN_SUCCESS, req, {
          userId: result.user.id,
          email: result.user.email,
        });

        res.json({
          success: true,
          data: result,
        });
      } catch (error) {
        // Log failed login attempt
        await auditService.logAuth(AuditLogAction.LOGIN_FAILED, req, {
          email,
          reason: error instanceof AppError ? error.message : 'Unknown error',
        });

        // Re-throw the error to be handled by error handler
        throw error;
      }
    }),

    /**
     * Logout a user (client-side token removal)
     */
    logout: asyncHandler((_req: Request, res: Response) => {
      // Since we're using stateless JWT, logout is handled client-side
      // by removing the token. This endpoint is just for consistency.
      res.json({
        success: true,
        message: 'Logged out successfully',
      });
    }),
  };
}

/**
 * Type definition for AuthController (inferred from factory return type)
 */
export type AuthController = ReturnType<typeof createAuthController>;
