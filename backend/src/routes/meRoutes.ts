import { Router } from 'express';
import { auth } from '../middleware/auth';
import { me } from '../controllers/authController';

const router = Router();

router.get('/', auth, me);

export default router;
