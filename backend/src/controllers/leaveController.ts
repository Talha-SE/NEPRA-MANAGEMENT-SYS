import { Request, Response } from 'express';
import sql from 'mssql';
import { getPool } from '../config/db';

// Table: dbo.employee_leaves_request
// Columns (as per screenshot):
// id (PK, int, not null, identity?)
// emp_id (FK, int, not null)
// leave_type (nvarchar(100), not null)
// start_date (date, not null)
// end_date (date, not null)
// total_days (Computed, int, null) -- computed by DB, do not insert
// leave_status (nvarchar(20), not null)
// contact_number (nvarchar(20), not null)
// alternate_officer (nvarchar(100), null)
// reason (nvarchar(500), null)
// attachment (varbinary(max), null)

function parseBase64ToBuffer(data?: string | null): Buffer | null {
  if (!data) return null;
  try {
    // Accept data URLs (data:...;base64,xxxxx) or raw base64 string
    const commaIdx = data.indexOf(',');
    const base64 = data.startsWith('data:') && commaIdx !== -1 ? data.slice(commaIdx + 1) : data;
    return Buffer.from(base64, 'base64');
  } catch {
    return null;
  }
}

export async function createLeaveRequest(req: Request, res: Response) {
  try {
    const pool = getPool();

    const {
      empId,
      leaveType, // string label/key stored in leave_type
      startDate, // yyyy-mm-dd
      endDate,   // yyyy-mm-dd
      contactNumber,
      alternateOfficerName,
      reason,
      attachmentBase64, // optional base64 string (data URL or raw base64)
      status,
    } = req.body || {};

    if (!empId || !leaveType || !startDate || !endDate || !contactNumber || !alternateOfficerName || !reason) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const attachBuf = parseBase64ToBuffer(attachmentBase64);

    const r = await pool
      .request()
      .input('emp_id', sql.Int, Number(empId))
      .input('leave_type', sql.NVarChar(100), String(leaveType))
      .input('start_date', sql.Date, new Date(startDate))
      .input('end_date', sql.Date, new Date(endDate))
      .input('leave_status', sql.NVarChar(20), String(status || 'pending'))
      .input('contact_number', sql.NVarChar(20), String(contactNumber))
      .input('alternate_officer', sql.NVarChar(100), String(alternateOfficerName))
      .input('reason', sql.NVarChar(500), String(reason))
      .input('attachment', sql.VarBinary(sql.MAX), attachBuf)
      .query(`
        INSERT INTO dbo.employee_leaves_request
          (emp_id, leave_type, start_date, end_date, leave_status, contact_number, alternate_officer, reason, attachment)
        OUTPUT INSERTED.id, INSERTED.emp_id, INSERTED.leave_type, INSERTED.start_date, INSERTED.end_date, INSERTED.total_days, INSERTED.leave_status,
               INSERTED.contact_number, INSERTED.alternate_officer, INSERTED.reason
        VALUES
          (@emp_id, @leave_type, @start_date, @end_date, @leave_status, @contact_number, @alternate_officer, @reason, @attachment)
      `);

    const row = r.recordset?.[0];
    return res.status(201).json({ success: true, data: row });
  } catch (err) {
    console.error('[leave] create error', err);
    return res.status(500).json({ message: 'Failed to create leave request' });
  }
}

export async function listPending(req: Request, res: Response) {
  try {
    const pool = getPool();
    const r = await pool
      .request()
      .input('pending', sql.NVarChar(20), 'pending')
      .query(`
        SELECT TOP (200) id, emp_id, leave_type, start_date, end_date, total_days, leave_status,
               contact_number, alternate_officer, reason
        FROM dbo.employee_leaves_request
        WHERE leave_status = @pending
        ORDER BY id DESC
      `);
    return res.json({ success: true, data: r.recordset });
  } catch (err) {
    console.error('[leave] listPending error', err);
    return res.status(500).json({ message: 'Failed to fetch pending requests' });
  }
}

export async function listByEmployee(req: Request, res: Response) {
  try {
    const pool = getPool();
    const empId = Number(req.query.empId);
    if (!empId) return res.status(400).json({ message: 'empId is required' });
    const r = await pool
      .request()
      .input('emp_id', sql.Int, empId)
      .query(`
        SELECT id, emp_id, leave_type, start_date, end_date, total_days, leave_status,
               contact_number, alternate_officer, reason
        FROM dbo.employee_leaves_request
        WHERE emp_id = @emp_id
        ORDER BY id DESC
      `);
    return res.json({ success: true, data: r.recordset });
  } catch (err) {
    console.error('[leave] listByEmployee error', err);
    return res.status(500).json({ message: 'Failed to fetch requests' });
  }
}

export async function updateStatus(req: Request, res: Response) {
  try {
    const pool = getPool();
    const id = Number(req.params.id);
    const { status } = req.body || {};
    if (!id || !status) return res.status(400).json({ message: 'id and status are required' });

    const r = await pool
      .request()
      .input('id', sql.Int, id)
      .input('status', sql.NVarChar(20), String(status))
      .query(`
        UPDATE dbo.employee_leaves_request
        SET leave_status = @status
        OUTPUT INSERTED.id, INSERTED.emp_id, INSERTED.leave_type, INSERTED.start_date, INSERTED.end_date, INSERTED.total_days, INSERTED.leave_status,
               INSERTED.contact_number, INSERTED.alternate_officer, INSERTED.reason
        WHERE id = @id
      `);

    const row = r.recordset?.[0];
    if (!row) return res.status(404).json({ message: 'Request not found' });
    return res.json({ success: true, data: row });
  } catch (err) {
    console.error('[leave] updateStatus error', err);
    return res.status(500).json({ message: 'Failed to update status' });
  }
}
