import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import { User } from '../models/User.js';
import { IRole } from '../models/Role.js';

export class UserController {
  static async getProfile(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
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

  static async updateProfile(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const { name, email, company, phone } = req.body;

      if (email && email !== req.user.email) {
        const taken = await User.findOne({ email, _id: { $ne: req.user._id } });
        if (taken) {
          res.status(409).json({
            success: false,
            message: 'An account with this email address already exists.',
          });
          return;
        }
        req.user.email = email;
      }

      if (name) req.user.name = name;
      if (company !== undefined) req.user.company = company;
      if (phone !== undefined) req.user.phone = phone;

      await req.user.save();

      const roleName = (req.user.role as IRole).name;

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully.',
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

  static async changePassword(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const { currentPassword, newPassword } = req.body;

      const isMatch = await req.user.comparePassword(currentPassword);
      if (!isMatch) {
        res.status(400).json({
          success: false,
          message: 'Incorrect current password.',
        });
        return;
      }

      req.user.password = newPassword;
      await req.user.save();

      res.status(200).json({
        success: true,
        message: 'Password changed successfully.',
      });
    } catch (error) {
      next(error);
    }
  }

  static async getAllUsers(
    _req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const users = await User.find()
        .populate<{ role: IRole }>('role', 'name description')
        .sort({ createdAt: -1 });

      res.status(200).json({
        success: true,
        data: {
          users: users.map((u) => ({
            id: u._id,
            name: u.name,
            email: u.email,
            role: (u.role as IRole)?.name || 'user',
            company: u.company,
            phone: u.phone,
            createdAt: u.createdAt,
          })),
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
