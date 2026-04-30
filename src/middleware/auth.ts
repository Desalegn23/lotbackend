import { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { sendError } from '../utils/response.js';
import { Role } from '@prisma/client';

const JWT_SECRET: string = process.env.JWT_SECRET ?? 'fallback_secret';

export interface AuthUser {
  id: string;
  role: Role;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

/**
 * Verify JWT from Authorization header and attach req.user
 */
export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return sendError(res, 401, 'Unauthorized: No token provided');
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    return sendError(res, 401, 'Unauthorized: Malformed token');
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as unknown as JwtPayload & AuthUser;
    req.user = { id: decoded.id, role: decoded.role };
    next();
  } catch (err) {
    return sendError(res, 401, 'Unauthorized: Invalid or expired token');
  }
};

/**
 * Optional JWT verification - doesn't fail if token missing
 */
export const authenticateOptional = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];
  if (!token) return next();

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as unknown as JwtPayload & AuthUser;
    req.user = { id: decoded.id, role: decoded.role };
    next();
  } catch (err) {
    // If token is invalid, we still treat as guest but log it? 
    // Usually optional auth should just ignore invalid tokens or fail only if token is present but bad.
    // Let's just proceed as guest.
    next();
  }
};

export const authorize = (roles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;

    if (!user || !roles.includes(user.role)) {
      return sendError(res, 403, 'Forbidden: You do not have permission');
    }

    next();
  };
};

export const adminOnly = authorize([Role.ADMIN]);
export const agentOnly = authorize([Role.AGENT, Role.ADMIN]); // admin can also act on agent routes
export const userOnly = authorize([Role.USER, Role.AGENT, Role.ADMIN]);
