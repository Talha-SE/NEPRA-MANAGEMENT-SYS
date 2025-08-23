import { Request, Response, NextFunction } from 'express';
import { verifyJwt } from '../utils/jwt';

export interface AuthUser {
  id: string;
  role: 'hr' | 'employee';
}

declare global {
  namespace Express {
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface Request {
      user?: AuthUser;
    }
  }
}

export function auth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.token as string | undefined;
  if (!token) return res.status(401).json({ message: 'Unauthorized' });

  const payload = verifyJwt(token);
  if (!payload) return res.status(401).json({ message: 'Invalid or expired token' });

  req.user = { id: payload.sub, role: payload.role };
  next();
}
