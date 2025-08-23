import { Request, Response, NextFunction } from 'express';

export function requireRole(role: 'hr' | 'employee') {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) return res.status(401).json({ message: 'Unauthorized' });
    if (user.role !== role) return res.status(403).json({ message: 'Forbidden: wrong role' });
    next();
  };
}
