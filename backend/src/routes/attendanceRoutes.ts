import { Router } from 'express';
import { auth } from '../middleware/auth';
import { getWeeklySchedule, getTodayAttendance, getDailyAttendance } from '../controllers/attendanceController';

const router = Router();

router.get('/api/attendance/week', auth, getWeeklySchedule);
router.get('/api/attendance/today', auth, getTodayAttendance);
router.get('/api/attendance/daily', auth, getDailyAttendance);

export default router;
