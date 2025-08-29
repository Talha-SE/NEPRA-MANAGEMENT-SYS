import { Router } from 'express';
import { auth } from '../middleware/auth';
import { getProfile, updateProfile } from '../controllers/profileController';

const router = Router();

router.get('/', auth, getProfile);
router.put('/', auth, updateProfile);

export default router;
