import { Router } from 'express';
import { auth } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { createLeaveRequest, listPending, listByEmployee, updateStatus } from '../controllers/leaveController';

const router = Router();

// Employee: create a new leave request
router.post('/', auth, requireRole('employee'), createLeaveRequest);

// HR: list pending requests
router.get('/pending', auth, requireRole('hr'), listPending);

// HR or Employee: list by employee (HR can query any, employee only self via auth in future)
router.get('/by-employee', auth, listByEmployee);

// HR: update status (approve/reject)
router.patch('/:id/status', auth, requireRole('hr'), updateStatus);

export default router;
