import { Router } from 'express';
import { auth } from '../middleware/auth';
import { getWeeklySchedule, getTodayAttendance } from '../controllers/attendanceController';

const router = Router();

router.get('/week', auth, getWeeklySchedule);
router.get('/today', auth, getTodayAttendance);

export default router;
