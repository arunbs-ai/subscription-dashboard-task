import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User.js';
import { Role, IRole } from '../models/Role.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt.util.js';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, email, password, company, phone } = req.body;

      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        res.status(409).json({
          success: false,
          message: 'An account with this email address already exists.',
        });
        return;
      }

      let defaultRole = await Role.findOne({ name: 'user' });
      if (!defaultRole) {
        defaultRole = await Role.create({
          name: 'user',
          description: 'Standard subscriber and workspace member',
        });
      }

      const user = new User({
        name,
        email: email.toLowerCase(),
        password,
        role: defaultRole._id,
        company: company || '',
        phone: phone || '',
      });

      await user.save();

      const accessToken = generateAccessToken({
        id: user._id.toString(),
        email: user.email,
        role: defaultRole.name,
      });

      const refreshToken = generateRefreshToken({
        id: user._id.toString(),
      });

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

  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;

      const user = await User.findOne({ email: email.toLowerCase() }).populate<{ role: IRole }>('role');
      if (!user) {
        res.status(401).json({
          success: false,
          message: 'Invalid email or password credentials.',
        });
        return;
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        res.status(401).json({
          success: false,
          message: 'Invalid email or password credentials.',
        });
        return;
      }

      const roleName = (user.role as IRole).name;

      const accessToken = generateAccessToken({
        id: user._id.toString(),
        email: user.email,
        role: roleName,
      });

      const refreshToken = generateRefreshToken({
        id: user._id.toString(),
      });

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

  static async refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body;

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

      const user = await User.findById(decoded.id).populate<{ role: IRole }>('role');
      if (!user || user.refreshToken !== refreshToken) {
        res.status(401).json({
          success: false,
          message: 'Revoked or invalid refresh token. Please sign in again.',
        });
        return;
      }

      const roleName = (user.role as IRole).name;

      const newAccessToken = generateAccessToken({
        id: user._id.toString(),
        email: user.email,
        role: roleName,
      });

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
