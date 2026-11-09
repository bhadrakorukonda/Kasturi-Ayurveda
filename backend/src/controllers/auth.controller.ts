import { Request, Response, NextFunction } from 'express';
import z from 'zod';
import jwt from 'jsonwebtoken';
import User from '../models/User.model';
import { AuthRequest } from '../middleware/auth.middleware';
import { env } from '../config/env';

const registerSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required'),
    email: z.string().trim().email('Please provide a valid email'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    role: z.enum(['admin', 'staff']).optional(),
  })
  .strict();

const loginSchema = z
  .object({
    email: z.string().trim().email('Please provide a valid email'),
    password: z.string().min(1, 'Password is required'),
  })
  .strict();

const updatePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(6, 'New password must be at least 6 characters'),
  })
  .strict();

// Generate JWT Token
const generateToken = (id: string): string => {
  // @ts-ignore - expiresIn type issue
  return jwt.sign({ id }, env.JWT_SECRET, { expiresIn: '7d' });
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Private (Admin only)
export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid input',
        errors: parsed.error.format(),
      });
      return;
    }

    const { name, email, password, role } = parsed.data;

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      res.status(400).json({
        status: 'error',
        message: 'User already exists',
      });
      return;
    }

    const user = await User.create({
      name,
      email,
      password,
      role: role || 'staff',
    });

    const token = generateToken(user._id.toString());

    res.status(201).json({
      status: 'success',
      message: 'User registered successfully',
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      token,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid input',
        errors: parsed.error.format(),
      });
      return;
    }

    const { email, password } = parsed.data;

    // Check for user
    const user = await User.findOne({ email }).select('+password');

    if (!user || !user.isActive) {
      res.status(401).json({
        status: 'error',
        message: 'Invalid credentials',
      });
      return;
    }

    // Check password
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      res.status(401).json({
        status: 'error',
        message: 'Invalid credentials',
      });
      return;
    }

    const token = generateToken(user._id.toString());

    res.status(200).json({
      status: 'success',
      message: 'Login successful',
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      token,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await User.findById(req.user?._id);

    res.status(200).json({
      status: 'success',
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update password
// @route   PUT /api/auth/updatepassword
// @access  Private
export const updatePassword = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const parsed = updatePasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid input',
        errors: parsed.error.format(),
      });
      return;
    }

    const { currentPassword, newPassword } = parsed.data;

    const user = await User.findById(req.user?._id).select('+password');

    if (!user) {
      res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
      return;
    }

    // Check current password
    const isMatch = await user.comparePassword(currentPassword);

    if (!isMatch) {
      res.status(401).json({
        status: 'error',
        message: 'Current password is incorrect',
      });
      return;
    }

    user.password = newPassword;
    await user.save();

    const token = generateToken(user._id.toString());

    res.status(200).json({
      status: 'success',
      message: 'Password updated successfully',
      token,
    });
  } catch (error) {
    next(error);
  }
};
