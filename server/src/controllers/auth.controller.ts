import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User.js';
import { Role, IRole } from '../models/Role.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '../utils/jwt.util.js';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';

export class AuthController {
  /**
   * User Registration
   * - Maps default 'user' role from roles table to users table
   * - Generates access token & refresh token
   */
  static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, email, password, company, phone } = req.body;

      // 1. Check if user already exists
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        res.status(409).json({
          success: false,
          message: 'An account with this email address already exists.',
        });
        return;
      }

      // 2. Fetch the default 'user' role from the roles collection
      let defaultRole = await Role.findOne({ name: 'user' });
      if (!defaultRole) {
        // Fallback in case roles have not been seeded yet
        defaultRole = await Role.create({
          name: 'user',
          description: 'Standard subscriber and workspace member',
        });
      }

      // 3. Create the user mapping role ID to the user document
      const user = new User({
        name,
        email: email.toLowerCase(),
        password, // Pre-save hook hashes with bcrypt
        role: defaultRole._id, // Role mapped by ID
        company: company || '',
        phone: phone || '',
      });

      await user.save();

      // 4. Generate Access and Refresh Tokens
      const accessToken = generateAccessToken({
        id: user._id.toString(),
        email: user.email,
        role: defaultRole.name,
      });

      const refreshToken = generateRefreshToken({
        id: user._id.toString(),
      });

      // 5. Store refresh token in user record
      user.refreshToken = refreshToken;
      await user.save();

      res.status(201).json({
        success: true,
        message: 'Account created successfully.',
        data: {
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: defaultRole.name,
            company: user.company,
            phone: user.phone,
            createdAt: user.createdAt,
          },
          tokens: {
            accessToken,
            refreshToken,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * User & Admin Login
   * - Validates credentials
   * - Returns Access Token + Refresh Token + Populated Role
   */
  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;

      // 1. Find user by email and populate role document
      const user = await User.findOne({ email: email.toLowerCase() }).populate<{ role: IRole }>('role');
      if (!user) {
        res.status(401).json({
          success: false,
          message: 'Invalid email or password credentials.',
        });
        return;
      }

      // 2. Verify password
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        res.status(401).json({
          success: false,
          message: 'Invalid email or password credentials.',
        });
        return;
      }

      const roleName = (user.role as IRole).name;

      // 3. Generate tokens
      const accessToken = generateAccessToken({
        id: user._id.toString(),
        email: user.email,
        role: roleName,
      });

      const refreshToken = generateRefreshToken({
        id: user._id.toString(),
      });

      // 4. Update stored refresh token
      user.refreshToken = refreshToken;
      await user.save();

      res.status(200).json({
        success: true,
        message: 'Logged in successfully.',
        data: {
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: roleName,
            company: user.company,
            phone: user.phone,
            createdAt: user.createdAt,
          },
          tokens: {
            accessToken,
            refreshToken,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Refresh Access Token
   * - Validates refresh token and issues a new access token
   */
  static async refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body;

      // 1. Verify Refresh Token signature
      let decoded;
      try {
        decoded = verifyRefreshToken(refreshToken);
      } catch (err: any) {
        res.status(401).json({
          success: false,
          message: 'Invalid or expired refresh token. Please sign in again.',
        });
        return;
      }

      // 2. Verify user exists and stored refresh token matches
      const user = await User.findById(decoded.id).populate<{ role: IRole }>('role');
      if (!user || user.refreshToken !== refreshToken) {
        res.status(401).json({
          success: false,
          message: 'Revoked or invalid refresh token. Please sign in again.',
        });
        return;
      }

      const roleName = (user.role as IRole).name;

      // 3. Generate new access token
      const newAccessToken = generateAccessToken({
        id: user._id.toString(),
        email: user.email,
        role: roleName,
      });

      // Optional: Rotate refresh token
      const newRefreshToken = generateRefreshToken({
        id: user._id.toString(),
      });
      user.refreshToken = newRefreshToken;
      await user.save();

      res.status(200).json({
        success: true,
        message: 'Access token refreshed successfully.',
        data: {
          tokens: {
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Logout
   * - Invalidates user's refresh token
   */
  static async logout(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (req.user) {
        req.user.refreshToken = null;
        await req.user.save();
      }

      res.status(200).json({
        success: true,
        message: 'Successfully logged out.',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get Current Authenticated User (Self)
   */
  static async getMe(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Not authenticated.' });
        return;
      }

      const roleName = (req.user.role as IRole).name;

      res.status(200).json({
        success: true,
        data: {
          user: {
            id: req.user._id,
            name: req.user.name,
            email: req.user.email,
            role: roleName,
            company: req.user.company,
            phone: req.user.phone,
            createdAt: req.user.createdAt,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
