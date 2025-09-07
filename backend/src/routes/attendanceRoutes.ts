import { Router } from 'express';
import { auth } from '../middleware/auth';
import { getWeeklySchedule, getTodayAttendance, getDailyAttendance } from '../controllers/attendanceController';

const router = Router();

// These are mounted at '/api/attendance' from src/index.ts
router.get('/week', auth, getWeeklySchedule);
router.get('/today', auth, getTodayAttendance);
router.get('/daily', auth, getDailyAttendance);

export default router;
