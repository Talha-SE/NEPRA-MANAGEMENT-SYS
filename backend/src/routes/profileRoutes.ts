import { Router } from 'express';
import { auth } from '../middleware/auth';
import { getProfile, updateProfile, uploadPhoto } from '../controllers/profileController';
import multer from 'multer';
import fs from 'fs';
import path from 'path';

const router = Router();

// Configure multer storage under /uploads/profile
const uploadsRoot = path.join(process.cwd(), 'uploads');
const profileDir = path.join(uploadsRoot, 'profile');
if (!fs.existsSync(profileDir)) {
  fs.mkdirSync(profileDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req: any, _file: any, cb: (err: any, destination: string) => void) => cb(null, profileDir),
  filename: (req: any, file: { originalname: string }, cb: (err: any, filename: string) => void) => {
    const uid = req.user?.id ?? 'anon';
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `u${uid}-${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

router.get('/', auth, getProfile);
router.put('/', auth, updateProfile);
router.post('/photo', auth, upload.single('photo'), uploadPhoto);

export default router;
