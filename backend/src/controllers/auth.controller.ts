import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { registerUser, loginUser } from '../services/auth.service';
import { AppError } from '../middleware/errorHandler';
import { RegisterSchema, LoginSchema } from '../types/validation';

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
 * Register a new user
 */
export const register = asyncHandler(async (req: Request, res: Response) => {
  // Validate request with Zod
  const validationResult = RegisterSchema.safeParse(req.body);

  if (!validationResult.success) {
    const errorMessage = validationResult.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join(', ');
    throw new AppError(`Validation failed: ${errorMessage}`, 400);
  }

  const { email, password, name } = validationResult.data;

  // Register user
  const result = await registerUser(email, password, name);

  res.status(201).json({
    success: true,
    data: result,
  });
});

/**
 * Login a user
 */
export const login = asyncHandler(async (req: Request, res: Response) => {
  // Validate request with Zod
  const validationResult = LoginSchema.safeParse(req.body);

  if (!validationResult.success) {
    const errorMessage = validationResult.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join(', ');
    throw new AppError(`Validation failed: ${errorMessage}`, 400);
  }

  const { email, password } = validationResult.data;

  // Login user
  const result = await loginUser(email, password);

  res.json({
    success: true,
    data: result,
  });
});

/**
 * Logout a user (client-side token removal)
 */
export const logout = asyncHandler((_req: Request, res: Response) => {
  // Since we're using stateless JWT, logout is handled client-side
  // by removing the token. This endpoint is just for consistency.
  res.json({
    success: true,
    message: 'Logged out successfully',
  });
});
