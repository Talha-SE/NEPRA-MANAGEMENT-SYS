import { Router } from 'express';
import { auth } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { createLeaveRequest, listPending, listByEmployee, updateStatus, getEmployeeLeaveSummary, upsertEmployeeLeave, accrueEarnedLeave, getAttachment } from '../controllers/leaveController';

const router = Router();

// Employee: create a new leave request
router.post('/', auth, requireRole('employee'), createLeaveRequest);

// HR: list pending requests
router.get('/pending', auth, requireRole('hr'), listPending);

// HR or Employee: list by employee (HR can query any, employee only self via auth in future)
router.get('/by-employee', auth, listByEmployee);

// HR: update status (approve/reject)
router.patch('/:id/status', auth, requireRole('hr'), updateStatus);

// HR: open/download attachment of a leave request
router.get('/:id/attachment', auth, requireRole('hr'), getAttachment);

// Employee Leave Summary (Available/Approved only)
// Get summary for an employee (if empId omitted, self)
router.get('/summary', auth, getEmployeeLeaveSummary);

// Upsert a single leave summary row for an employee (HR only)
router.put('/summary', auth, requireRole('hr'), upsertEmployeeLeave);

// Accrue Earned Leave for a given month (HR only)
router.post('/accrue-el', auth, requireRole('hr'), accrueEarnedLeave);

export default router;
