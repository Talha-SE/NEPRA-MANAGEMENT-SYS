import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { User } from '../models/User';
import { signJwt } from '../utils/jwt';

export async function register(_req: Request, res: Response) {
  // Registration is disabled because users are managed in existing zkbiotime.personnel_employee
  return res.status(501).json({ message: 'Registration disabled. Seed users in zkbiotime.dbo.personnel_employee.' });
}

export async function login(req: Request, res: Response) {
  try {
    const { role, email, password } = req.body as Record<string, string>;
    if (!role || !['hr', 'employee'].includes(role)) return res.status(400).json({ message: 'Invalid role' });
    if (!email || !password) return res.status(400).json({ message: 'Missing credentials' });

    console.log(`[AUTH] login start role=${role} email=${email}`);
    const user = await User.findOne({ email: email.toLowerCase() });
    console.log(`[AUTH] login db lookup email=${email} found=${!!user}`);
    if (!user) {
      console.log('[AUTH] login fail: user not found');
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    if (user.role !== role) {
      console.log(`[AUTH] login fail: role mismatch expected=${role} actual=${user.role}`);
      return res.status(403).json({ message: 'Role mismatch' });
    }

    let ok = false;
    const stored = user.passwordHash ?? '';
    const isBcrypt = stored.startsWith('$2a$') || stored.startsWith('$2b$') || stored.startsWith('$2y$');
    if (isBcrypt) {
      ok = await bcrypt.compare(password, stored);
    } else {
      // Plaintext fallback for self_password column
      ok = password === stored;
    }
    console.log(`[AUTH] login password compare ok=${ok}`);
    if (!ok) {
      console.log('[AUTH] login fail: bad password');
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = signJwt({ sub: String(user.id), role: user.role });
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24,
    });

    console.log(`[AUTH] login success set cookie for user id=${user.id}`);
    return res.json({
      user: {
        id: user.id,
        role: user.role,
        firstName: user.firstName,
        middleName: user.middleName,
        lastName: user.lastName,
        email: user.email,
      },
    });
  } catch (err) {
    console.error('[login] error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function me(req: Request, res: Response) {
  try {
    const id = req.user?.id;
    if (!id) return res.status(401).json({ message: 'Unauthorized' });
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    return res.json({
      user: {
        id: user.id,
        role: user.role,
        firstName: user.firstName,
        middleName: user.middleName,
        lastName: user.lastName,
        email: user.email,
      },
    });
  } catch (err) {
    console.error('[me] error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function logout(_req: Request, res: Response) {
  res.clearCookie('token', { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' });
  return res.json({ message: 'Logged out' });
}
