import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { asyncHandler } from '../utils/asyncHandler';
import { registerUser, loginUser } from '../services/auth.service';
import { AppError } from '../middleware/errorHandler';

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
  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation failed', 400);
  }

  const { email, password, name } = req.body;

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
  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation failed', 400);
  }

  const { email, password } = req.body;

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
export const logout = asyncHandler(async (_req: Request, res: Response) => {
  // Since we're using stateless JWT, logout is handled client-side
  // by removing the token. This endpoint is just for consistency.
  res.json({
    success: true,
    message: 'Logged out successfully',
  });
});
