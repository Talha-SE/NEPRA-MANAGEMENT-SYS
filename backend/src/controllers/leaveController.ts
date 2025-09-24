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

// --- Employee Leave Summary (Available/Approved only) ---
// Table: dbo.employee_leaves
// Columns:
// id (PK, int, not null)
// emp_id (FK, int, not null)
// leave_type (nvarchar(100), not null)
// available (int, null)
// accrued (int, null) -- NOT used for now
// approved (int, null)

// GET /api/leaves/summary?empId=123
// HR can query any empId; employees can only query themselves (enforced by auth middleware, if available)
export async function getEmployeeLeaveSummary(req: Request, res: Response) {
  try {
    const pool = getPool();
    const qEmpId = Number(req.query.empId);

    // If empId not provided, fallback to authenticated user's id
    const empId = Number.isInteger(qEmpId) && qEmpId > 0 ? qEmpId : Number(req.user?.id);
    if (!empId) return res.status(400).json({ message: 'empId is required' });

    const r = await pool
      .request()
      .input('emp_id', sql.Int, empId)
      .query(`
        SELECT id, emp_id, leave_type, available, approved
        FROM dbo.employee_leaves
        WHERE emp_id = @emp_id
        ORDER BY leave_type
      `);

    return res.json({ success: true, data: r.recordset });
  } catch (err) {
    console.error('[leave] getEmployeeLeaveSummary error', err);
    return res.status(500).json({ message: 'Failed to fetch leave summary' });
  }
}

// PUT /api/leaves/summary
// Body: { empId: number, leaveType: string, available?: number | null, approved?: number | null }
// Upserts a single row for the employee + leaveType
export async function upsertEmployeeLeave(req: Request, res: Response) {
  try {
    const pool = getPool();
    const { empId, leaveType, available, approved } = req.body || {};

    const emp_id = Number(empId);
    if (!emp_id || !leaveType || typeof leaveType !== 'string' || leaveType.trim().length === 0) {
      return res.status(400).json({ message: 'empId and leaveType are required' });
    }

    // Coerce optional numeric fields
    const availNum = available === null || available === undefined ? null : Number(available);
    const approvedNum = approved === null || approved === undefined ? null : Number(approved);

    // Use MERGE to upsert by (emp_id, leave_type)
    const r = await pool
      .request()
      .input('emp_id', sql.Int, emp_id)
      .input('leave_type', sql.NVarChar(100), String(leaveType))
      .input('available', availNum === null || Number.isNaN(availNum) ? null : availNum)
      .input('approved', approvedNum === null || Number.isNaN(approvedNum) ? null : approvedNum)
      .query(`
        MERGE dbo.employee_leaves AS tgt
        USING (SELECT @emp_id AS emp_id, @leave_type AS leave_type) AS src
          ON (tgt.emp_id = src.emp_id AND tgt.leave_type = src.leave_type)
        WHEN MATCHED THEN
          UPDATE SET available = @available, approved = @approved
        WHEN NOT MATCHED THEN
          INSERT (emp_id, leave_type, available, approved)
          VALUES (@emp_id, @leave_type, @available, @approved)
        OUTPUT INSERTED.id, INSERTED.emp_id, INSERTED.leave_type, INSERTED.available, INSERTED.approved;`);

    const row = r.recordset?.[0];
    return res.json({ success: true, data: row });
  } catch (err) {
    console.error('[leave] upsertEmployeeLeave error', err);
    return res.status(500).json({ message: 'Failed to save leave summary' });
  }
}

// --- EL (Earned Leave) business rules helpers ---
const EL_LEAVE_TYPE_CANON = 'Earned Leave';
const EL_DEDUCT_TYPES = new Set<string>([
  // Exact labels used by the UI for leaves that deduct from Earned Leave
  'Leave Not Due (LND)',
  'Study Leave',
  'Ex-Pakistan Leave',
  'Leave Preparatory to Retirement (LPR)',
  'Medical Leave',
  // If a generic label is ever used
  'Earned Leave',
]);

function isELType(label: string | null | undefined): boolean {
  if (!label) return false;
  return EL_DEDUCT_TYPES.has(String(label));
}

async function ensureAccrualTables(db: sql.ConnectionPool) {
  // Create log tables if they don't exist to guarantee idempotency
  await db.request().query(`
    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'employee_leaves_accrual_log')
    BEGIN
      CREATE TABLE dbo.employee_leaves_accrual_log (
        id INT IDENTITY(1,1) PRIMARY KEY,
        emp_id INT NOT NULL,
        [year] INT NOT NULL,
        [month] INT NOT NULL,
        created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT UQ_emp_year_month UNIQUE(emp_id, [year], [month])
      );
    END;

    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'employee_leaves_carry_log')
    BEGIN
      CREATE TABLE dbo.employee_leaves_carry_log (
        id INT IDENTITY(1,1) PRIMARY KEY,
        emp_id INT NOT NULL,
        [year] INT NOT NULL, -- year we are carrying into (e.g., 2025)
        carried INT NOT NULL,
        created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT UQ_emp_year_carry UNIQUE(emp_id, [year])
      );
    END;
  `);
}

async function upsertELBalance(db: sql.ConnectionPool, empId: number, deltaAvailable: number, deltaApproved: number = 0) {
  const r = await db
    .request()
    .input('emp_id', sql.Int, empId)
    .input('leave_type', sql.NVarChar(100), EL_LEAVE_TYPE_CANON)
    .input('dAvail', sql.Int, deltaAvailable)
    .input('dAppr', sql.Int, deltaApproved)
    .query(`
      MERGE dbo.employee_leaves AS tgt
      USING (SELECT @emp_id AS emp_id, @leave_type AS leave_type) AS src
        ON (tgt.emp_id = src.emp_id AND tgt.leave_type = src.leave_type)
      WHEN MATCHED THEN
        UPDATE SET available = COALESCE(tgt.available, 0) + @dAvail,
                   approved = COALESCE(tgt.approved, 0) + @dAppr
      WHEN NOT MATCHED THEN
        INSERT (emp_id, leave_type, available, approved)
        VALUES (@emp_id, @leave_type, @dAvail, @dAppr)
      OUTPUT INSERTED.id, INSERTED.emp_id, INSERTED.leave_type, INSERTED.available, INSERTED.approved;`);
  return r.recordset?.[0];
}

async function getELAvailable(db: sql.ConnectionPool, empId: number): Promise<number> {
  const rs = await db
    .request()
    .input('emp_id', sql.Int, empId)
    .input('leave_type', sql.NVarChar(100), EL_LEAVE_TYPE_CANON)
    .query('SELECT TOP 1 available FROM dbo.employee_leaves WHERE emp_id = @emp_id AND leave_type = @leave_type');
  const row = rs.recordset?.[0];
  const avail = row?.available as number | null | undefined;
  return Math.max(0, Number(avail ?? 0));
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

    // If EL-deducting type, validate balance against requested days
    if (isELType(leaveType)) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const days = Math.max(0, Math.floor((Date.UTC(end.getFullYear(), end.getMonth(), end.getDate()) - Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())) / (1000 * 60 * 60 * 24)) + 1);
      const avail = await getELAvailable(pool, Number(empId));
      if (days <= 0 || avail < days) {
        return res.status(400).json({ code: 'INSUFFICIENT_EL', message: 'Insufficient Earned Leave balance', available: avail, requested: days });
      }
    }

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

    // Fetch existing row to detect transition and compute total days
    const existing = await pool.request().input('id', sql.Int, id).query(`
      SELECT id, emp_id, leave_type, start_date, end_date, total_days, leave_status
      FROM dbo.employee_leaves_request
      WHERE id = @id
    `);
    const before = existing.recordset?.[0];
    if (!before) return res.status(404).json({ message: 'Request not found' });

    // If approving and it's an EL-deducting type, validate balance first
    const isApproving = String(status).toLowerCase() === 'approved' && String(before.leave_status).toLowerCase() !== 'approved';
    let daysToDeduct = 0;
    if (isApproving && isELType(before.leave_type)) {
      if (before.total_days != null) daysToDeduct = Number(before.total_days) || 0;
      else {
        const sd = new Date(before.start_date);
        const ed = new Date(before.end_date);
        daysToDeduct = Math.max(0, Math.floor((Date.UTC(ed.getFullYear(), ed.getMonth(), ed.getDate()) - Date.UTC(sd.getFullYear(), sd.getMonth(), sd.getDate())) / (1000 * 60 * 60 * 24)) + 1);
      }
      const avail = await getELAvailable(pool, Number(before.emp_id));
      if (daysToDeduct <= 0 || avail < daysToDeduct) {
        return res.status(400).json({ code: 'INSUFFICIENT_EL', message: 'Insufficient Earned Leave balance', available: avail, requested: daysToDeduct });
      }
    }

    // Perform the status update
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

    // If just approved and EL, deduct from EL balance (available-=:days, approved+=:days)
    if (isApproving && isELType(before.leave_type) && daysToDeduct > 0) {
      await upsertELBalance(pool, Number(before.emp_id), -daysToDeduct, daysToDeduct);
    }

    return res.json({ success: true, data: row });
  } catch (err) {
    console.error('[leave] updateStatus error', err);
    return res.status(500).json({ message: 'Failed to update status' });
  }
}

// POST /api/leaves/accrue-el  (HR only via route)
// Body: { year?: number, month?: number, empId?: number }
// Adds +2 EL to eligible employees for the given month if present days >= 15.
// Idempotent per (empId, year, month) via dbo.employee_leaves_accrual_log.
// Also, if month === 1 (January), perform carry-forward from previous year up to 20 days once per employee/year via dbo.employee_leaves_carry_log.
export async function accrueEarnedLeave(req: Request, res: Response) {
  try {
    const db = getPool();
    await ensureAccrualTables(db);

    const now = new Date();
    let year = Number(req.body?.year) || now.getUTCFullYear();
    let month = Number(req.body?.month) || now.getUTCMonth() + 1; // 1..12
    const empIdFilter = req.body?.empId ? Number(req.body.empId) : null;

    if (!Number.isInteger(year) || year < 2000 || year > 9999) return res.status(400).json({ message: 'Invalid year' });
    if (!Number.isInteger(month) || month < 1 || month > 12) return res.status(400).json({ message: 'Invalid month' });

    const changed: Array<{ empId: number; delta: number }> = [];

    // Carry-forward: if processing January, carry from previous year once per employee (cap 20) BEFORE doing January accrual
    if (month === 1) {
      const carryYear = year; // carrying into this year
      const prevYear = year - 1;

      // All employees that have any EL row
      const empRs = await db.request().query('SELECT DISTINCT emp_id FROM dbo.employee_leaves WHERE leave_type = N\'Earned Leave\'');
      for (const r of empRs.recordset) {
        const empId = Number(r.emp_id);
        if (empIdFilter && empId !== empIdFilter) continue;

        const cfExists = await db
          .request()
          .input('emp_id', sql.Int, empId)
          .input('y', sql.Int, carryYear)
          .query('SELECT 1 AS x FROM dbo.employee_leaves_carry_log WHERE emp_id = @emp_id AND [year] = @y');
        if (cfExists.recordset && cfExists.recordset.length > 0) continue;

        // Cap available to 20 from previous year's leftover
        const avail = await getELAvailable(db, empId);
        if (avail > 20) {
          // Reduce available down to 20 (delta negative)
          await upsertELBalance(db, empId, 20 - avail, 0);
        }
        const carried = Math.min(20, avail);
        await db
          .request()
          .input('emp_id', sql.Int, empId)
          .input('y', sql.Int, carryYear)
          .input('carried', sql.Int, Math.max(0, carried))
          .query('INSERT INTO dbo.employee_leaves_carry_log (emp_id, [year], carried) VALUES (@emp_id, @y, @carried)');
      }
    }

    // Determine eligible employees by attendance for the target month (including January AFTER carry step)
    const att = await db
      .request()
      .input('y', sql.Int, year)
      .input('m', sql.Int, month)
      .query(`
        SELECT emp_id, COUNT(*) AS present_days
        FROM dbo.att_payloadtimecard
        WHERE YEAR(att_date) = @y AND MONTH(att_date) = @m AND present = 1
        GROUP BY emp_id
      `);

    const eligible = att.recordset.filter((r: any) => r.present_days >= 15).map((r: any) => ({ empId: Number(r.emp_id) }));

    for (const e of eligible) {
      if (empIdFilter && e.empId !== empIdFilter) continue;

      // Idempotency: skip if already accrued for this month
      const exists = await db
        .request()
        .input('emp_id', sql.Int, e.empId)
        .input('y', sql.Int, year)
        .input('m', sql.Int, month)
        .query('SELECT 1 AS x FROM dbo.employee_leaves_accrual_log WHERE emp_id = @emp_id AND [year] = @y AND [month] = @m');
      if (exists.recordset && exists.recordset.length > 0) continue;

      // Enforce yearly accrual cap of 24 days (2 per month -> max 12 months)
      const monthsCreditedRS = await db
        .request()
        .input('emp_id', sql.Int, e.empId)
        .input('y', sql.Int, year)
        .query('SELECT COUNT(*) AS n FROM dbo.employee_leaves_accrual_log WHERE emp_id = @emp_id AND [year] = @y');
      const monthsCredited = Number(monthsCreditedRS.recordset?.[0]?.n || 0);
      if (monthsCredited >= 12) continue;

      await upsertELBalance(db, e.empId, +2, 0);
      await db
        .request()
        .input('emp_id', sql.Int, e.empId)
        .input('y', sql.Int, year)
        .input('m', sql.Int, month)
        .query('INSERT INTO dbo.employee_leaves_accrual_log (emp_id, [year], [month]) VALUES (@emp_id, @y, @m)');

      changed.push({ empId: e.empId, delta: 2 });
    }

    return res.json({ success: true, accruals: changed });
  } catch (err) {
    console.error('[leave] accrueEarnedLeave error', err);
    return res.status(500).json({ message: 'Failed to accrue earned leave' });
  }
}

