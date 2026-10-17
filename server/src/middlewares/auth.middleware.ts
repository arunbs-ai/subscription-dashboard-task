import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, TokenPayload } from '../utils/jwt.util.js';
import { User, IUser } from '../models/User.js';
import { IRole } from '../models/Role.js';

export interface AuthenticatedRequest extends Request {
  user?: IUser & { role: IRole };
  tokenPayload?: TokenPayload;
}

export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'Access denied. No authentication token provided.',
      });
      return;
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Malformed authorization header.',
      });
      return;
    }

    const decoded = verifyAccessToken(token);
    const user = await User.findById(decoded.id).populate<{ role: IRole }>('role');

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Invalid token. User account does not exist.',
      });
      return;
    }

    req.user = user as any;
    req.tokenPayload = decoded;
    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      res.status(401).json({
        success: false,
        code: 'TOKEN_EXPIRED',
        message: 'Access token has expired. Please refresh your token.',
      });
      return;
    }

    res.status(401).json({
      success: false,
      message: 'Invalid or corrupted access token.',
    });
  }
};

export const authorize = (...allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !req.user.role) {
      res.status(403).json({
        success: false,
        message: 'Forbidden. No role permissions found for user.',
      });
      return;
    }

    const roleName = (req.user.role as IRole).name;
    if (!allowedRoles.includes(roleName)) {
      res.status(403).json({
        success: false,
        message: `Forbidden. Role '${roleName}' does not have sufficient permissions.`,
      });
      return;
    }

    next();
  };
};
