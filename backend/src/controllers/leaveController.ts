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

function detectAttachmentMeta(buf: Buffer | null | undefined): { mime: string; ext: string } {
  const fallback = { mime: 'application/octet-stream', ext: 'bin' };
  if (!buf || buf.length === 0) return fallback;
  const sig = buf.slice(0, 16);

  // PDF: %PDF
  if (sig.length >= 4 && sig[0] === 0x25 && sig[1] === 0x50 && sig[2] === 0x44 && sig[3] === 0x46) {
    return { mime: 'application/pdf', ext: 'pdf' };
  }

  // PNG
  const pngSig = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  if (sig.length >= 8 && sig.subarray(0, 8).equals(pngSig)) {
    return { mime: 'image/png', ext: 'png' };
  }

  // JPEG
  if (sig.length >= 3 && sig[0] === 0xff && sig[1] === 0xd8 && sig[2] === 0xff) {
    return { mime: 'image/jpeg', ext: 'jpg' };
  }

  // GIF
  if (sig.length >= 6) {
    const gif = sig.toString('ascii', 0, 6);
    if (gif === 'GIF87a' || gif === 'GIF89a') {
      return { mime: 'image/gif', ext: 'gif' };
    }
  }

  // WebP (RIFF....WEBP)
  if (sig.length >= 12) {
    const riff = sig.toString('ascii', 0, 4);
    const webp = sig.toString('ascii', 8, 12);
    if (riff === 'RIFF' && webp === 'WEBP') {
      return { mime: 'image/webp', ext: 'webp' };
    }
  }

  // ZIP-based formats (docx/xlsx/pptx and generic zip)
  if (sig.length >= 4 && sig[0] === 0x50 && sig[1] === 0x4B && sig[2] === 0x03 && sig[3] === 0x04) {
    return { mime: 'application/zip', ext: 'zip' };
  }

  return fallback;
}

// GET /api/leaves/:id/attachment
// Streams the attachment file if present. HR only via route protection.
export async function getAttachment(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: 'id is required' });
    const pool = getPool();
    const r = await pool
      .request()
      .input('id', sql.Int, id)
      .query(`SELECT id, leave_type, attachment FROM dbo.employee_leaves_request WHERE id = @id`);

    const row = r.recordset?.[0];
    if (!row) return res.status(404).json({ message: 'Request not found' });
    const buf: Buffer | null = row.attachment as Buffer | null;
    if (!buf || buf.length === 0) return res.status(404).json({ message: 'No attachment for this request' });

    const meta = detectAttachmentMeta(buf);
    const filenameSafe = String(row.leave_type || 'attachment').replace(/[^a-zA-Z0-9._-]+/g, '_');
    const fileName = `${filenameSafe}_${id}.${meta.ext || 'bin'}`;
    res.setHeader('Content-Type', meta.mime || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', String(buf.length));
    return res.end(buf);
  } catch (err) {
    console.error('[leave] getAttachment error', err);
    return res.status(500).json({ message: 'Failed to fetch attachment' });
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

// NEW STORAGE TABLE (per latest requirement): dbo.employee_leave_balances
// One row per employee (emp_id is PK), wide columns per leave and status
// Example columns (subset shown):
//   Casual_Leave_Available, Casual_Leave_Approved,
//   Rest_Recreation_Available, Rest_Recreation_Approved,
//   Leave_Not_Due_Available, Leave_Not_Due_Approved,
//   Study_Leave_Available, Study_Leave_Approved,
//   Ex_Pakistan_Leave_Available, Ex_Pakistan_Leave_Approved,
//   Extra_Ordinary_Leave_Available, Extra_Ordinary_Leave_Approved,
//   Disability_Leave_Available, Disability_Leave_Approved,
//   LPR_Available, LPR_Approved,
//   Medical_Leave_Available, Medical_Leave_Approved,
//   Maternity_Leave_Available, Maternity_Leave_Approved,
//   Paternity_Leave_Available, Paternity_Leave_Approved,
//   Iddat_Leave_Available, Iddat_Leave_Approved,
//   Hajj_Leave_Available, Hajj_Leave_Approved,
//   Fatal_Medical_Emergency_Available, Fatal_Medical_Emergency_Approved,
//   Encashable_Earned_Leaves_Available, Encashable_Earned_Leaves_Approved,
//   Non_Encashable_Earned_Leaves_Available, Non_Encashable_Earned_Leaves_Approved

const BALANCE_TABLE = 'dbo.employee_leave_balances';

// Mapping between UI labels (LeaveDashboard item labels) and balance table columns
const BALANCE_MAP = new Map<string, { avail: string; appr: string }>([
  ['Rest & Recreation (R&R) Leave', { avail: 'Rest_Recreation_Available', appr: 'Rest_Recreation_Approved' }],
  ['Leave Not Due (LND)', { avail: 'Leave_Not_Due_Available', appr: 'Leave_Not_Due_Approved' }],
  ['Study Leave', { avail: 'Study_Leave_Available', appr: 'Study_Leave_Approved' }],
  ['Ex-Pakistan Leave', { avail: 'Ex_Pakistan_Leave_Available', appr: 'Ex_Pakistan_Leave_Approved' }],
  ['Extra-Ordinary Leave (Leave Without Pay)', { avail: 'Extra_Ordinary_Leave_Available', appr: 'Extra_Ordinary_Leave_Approved' }],
  ['Disability Leave', { avail: 'Disability_Leave_Available', appr: 'Disability_Leave_Approved' }],
  ['Leave Preparatory to Retirement (LPR)', { avail: 'LPR_Available', appr: 'LPR_Approved' }],
  ['Medical Leave', { avail: 'Medical_Leave_Available', appr: 'Medical_Leave_Approved' }],
  ['Maternity Leave', { avail: 'Maternity_Leave_Available', appr: 'Maternity_Leave_Approved' }],
  ['Paternity Leave', { avail: 'Paternity_Leave_Available', appr: 'Paternity_Leave_Approved' }],
  ['Iddat Leave', { avail: 'Iddat_Leave_Available', appr: 'Iddat_Leave_Approved' }],
  ['Fatal Medical Emergency Leave', { avail: 'Fatal_Medical_Emergency_Available', appr: 'Fatal_Medical_Emergency_Approved' }],
  ['Hajj & Leave to Non-Muslims', { avail: 'Hajj_Leave_Available', appr: 'Hajj_Leave_Approved' }],
]);

const EARNED_ENC_AVAIL = 'Encashable_Earned_Leaves_Available';
const EARNED_ENC_APPR = 'Encashable_Earned_Leaves_Approved';
const EARNED_NON_AVAIL = 'Non_Encashable_Earned_Leaves_Available';
const EARNED_NON_APPR = 'Non_Encashable_Earned_Leaves_Approved';

function serializeLeaveRow<T extends Record<string, any>>(row: T | undefined): (Omit<T, 'attachment'> & { attachment_present?: boolean }) | undefined {
  if (!row) return row;
  const attachment = row.attachment as any;
  const attachmentLength = Buffer.isBuffer(attachment)
    ? attachment.length
    : attachment && typeof attachment === 'object' && Array.isArray(attachment.data)
      ? attachment.data.length
      : typeof attachment === 'string'
        ? attachment.length
        : 0;
  const { attachment: _omit, ...rest } = row;
  return {
    ...rest,
    attachment_present: attachmentLength > 0,
  };
}

function getColsForLeaveType(label: string): { avail: string; appr: string } | null {
  const normalized = String(label).trim();
  const exact = BALANCE_MAP.get(normalized);
  if (exact) return exact;
  if (normalized === 'Earned Leave') return { avail: EARNED_NON_AVAIL, appr: EARNED_NON_APPR };
  const lowered = normalized.toLowerCase();
  for (const [key, cols] of BALANCE_MAP.entries()) {
    if (key.toLowerCase() === lowered) return cols;
  }
  if (lowered.includes('encashable')) return { avail: EARNED_ENC_AVAIL, appr: EARNED_ENC_APPR };
  if (lowered.includes('earned')) return { avail: EARNED_NON_AVAIL, appr: EARNED_NON_APPR };
  return null;
}

async function getAvailableForLeave(db: sql.ConnectionPool, empId: number, leaveType: string): Promise<number | null> {
  const cols = getColsForLeaveType(leaveType);
  if (!cols) return null;
  const rs = await db
    .request()
    .input('emp_id', sql.Int, empId)
    .query(`SELECT TOP 1 [${cols.avail}] AS available FROM ${BALANCE_TABLE} WHERE emp_id = @emp_id`);
  const row = rs.recordset?.[0];
  const avail = row?.available as number | null | undefined;
  if (avail === null || avail === undefined) return 0;
  const num = Number(avail);
  return Number.isFinite(num) ? num : 0;
}

// GET /api/leaves/summary?empId=123
// HR can query any empId; employees can only query themselves (enforced by auth middleware, if available)
export async function getEmployeeLeaveSummary(req: Request, res: Response) {
  try {
    const pool = getPool();
    const qEmpId = Number(req.query.empId);

    // Require explicit empId for HR search. Do not fallback to authenticated user.
    const empId = Number.isInteger(qEmpId) && qEmpId > 0 ? qEmpId : NaN;
    if (!Number.isInteger(empId) || empId <= 0 || Number.isNaN(empId)) {
      return res.status(400).json({ message: 'empId is required' });
    }

    const r = await pool
      .request()
      .input('emp_id', sql.Int, empId)
      .query(`
        SELECT TOP 1 *
        FROM ${BALANCE_TABLE}
        WHERE emp_id = @emp_id
      `);

    const row: Record<string, any> | undefined = r.recordset?.[0];
    if (!row) {
      return res.status(404).json({ message: 'Leave data is not available for the provided empId' });
    }

    // Transform wide row -> array of { leave_type, available, approved }
    let idSeq = 1;
    const data = Array.from(BALANCE_MAP.entries()).map(([label, cols]) => ({
      id: idSeq++,
      emp_id: empId,
      leave_type: label,
      available: (row[cols.avail] ?? 0) as number,
      approved: (row[cols.appr] ?? 0) as number,
    }));

    // Optionally include Earned Leave aggregate buckets if present
    if (EARNED_NON_AVAIL in row || EARNED_NON_APPR in row) {
      data.push({
        id: idSeq++,
        emp_id: empId,
        leave_type: 'Earned Leave (Non-Encashable)',
        available: (row[EARNED_NON_AVAIL] ?? 0) as number,
        approved: (row[EARNED_NON_APPR] ?? 0) as number,
      });
    }
    if (EARNED_ENC_AVAIL in row || EARNED_ENC_APPR in row) {
      data.push({
        id: idSeq++,
        emp_id: empId,
        leave_type: 'Earned Leave (Encashable)',
        available: (row[EARNED_ENC_AVAIL] ?? 0) as number,
        approved: (row[EARNED_ENC_APPR] ?? 0) as number,
      });
    }

    return res.json({ success: true, data });
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

    // Resolve balance columns safely from known mapping
    const cols = getColsForLeaveType(String(leaveType));
    if (!cols) {
      return res.status(400).json({ message: 'Unknown leaveType for balances' });
    }

    // Coerce optional numeric fields
    const availNum = available === null || available === undefined ? null : Number(available);
    const approvedNum = approved === null || approved === undefined ? null : Number(approved);

    const q = `
      MERGE ${BALANCE_TABLE} AS tgt
      USING (SELECT @emp_id AS emp_id) AS src
        ON (tgt.emp_id = src.emp_id)
      WHEN MATCHED THEN
        UPDATE SET [${cols.avail}] = @available, [${cols.appr}] = @approved
      WHEN NOT MATCHED THEN
        INSERT (emp_id, [${cols.avail}], [${cols.appr}])
        VALUES (@emp_id, @available, @approved);
    `;

    await pool
      .request()
      .input('emp_id', sql.Int, emp_id)
      .input('available', availNum === null || Number.isNaN(availNum) ? null : availNum)
      .input('approved', approvedNum === null || Number.isNaN(approvedNum) ? null : approvedNum)
      .query(q);

    // Respond with a synthesized DTO compatible with the frontend
    const data = {
      id: 0,
      emp_id,
      leave_type: String(leaveType),
      available: availNum === null || Number.isNaN(Number(availNum)) ? 0 : Number(availNum),
      approved: approvedNum === null || Number.isNaN(Number(approvedNum)) ? 0 : Number(approvedNum),
    };
    return res.json({ success: true, data });
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
  // Update Earned Leave (Non-Encashable) bucket by default
  await db
    .request()
    .input('emp_id', sql.Int, empId)
    .input('dAvail', sql.Int, deltaAvailable)
    .input('dAppr', sql.Int, deltaApproved)
    .query(`
      MERGE ${BALANCE_TABLE} AS tgt
      USING (SELECT @emp_id AS emp_id) AS src
        ON (tgt.emp_id = src.emp_id)
      WHEN MATCHED THEN
        UPDATE SET [${EARNED_NON_AVAIL}] = COALESCE(tgt.[${EARNED_NON_AVAIL}], 0) + @dAvail,
                   [${EARNED_NON_APPR}] = COALESCE(tgt.[${EARNED_NON_APPR}], 0) + @dAppr
      WHEN NOT MATCHED THEN
        INSERT (emp_id, [${EARNED_NON_AVAIL}], [${EARNED_NON_APPR}])
        VALUES (@emp_id, @dAvail, @dAppr);
    `);
  return { emp_id: empId };
}

async function getELAvailable(db: sql.ConnectionPool, empId: number): Promise<number> {
  const rs = await db
    .request()
    .input('emp_id', sql.Int, empId)
    .query(`SELECT TOP 1 [${EARNED_NON_AVAIL}] AS available FROM ${BALANCE_TABLE} WHERE emp_id = @emp_id`);
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

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return res.status(400).json({ code: 'INVALID_DATES', message: 'Start date and end date must be valid calendar dates' });
    }
    if (end < start) {
      return res.status(400).json({ code: 'END_BEFORE_START', message: 'End date cannot be earlier than start date' });
    }
    const days = Math.max(0, Math.floor((Date.UTC(end.getFullYear(), end.getMonth(), end.getDate()) - Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())) / (1000 * 60 * 60 * 24)) + 1);
    const availableBalance = await getAvailableForLeave(pool, Number(empId), String(leaveType));
    if (days <= 0 || availableBalance === null) {
      return res.status(400).json({ code: 'UNKNOWN_LEAVE_TYPE', message: 'Cannot validate leave balance for the selected leave type' });
    }
    if (availableBalance < days) {
      return res.status(400).json({ code: 'INSUFFICIENT_BALANCE', message: 'Insufficient leave balance', available: availableBalance, requested: days });
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
               INSERTED.contact_number, INSERTED.alternate_officer, INSERTED.reason, INSERTED.attachment
        VALUES
          (@emp_id, @leave_type, @start_date, @end_date, @leave_status, @contact_number, @alternate_officer, @reason, @attachment)
      `);

    const row = serializeLeaveRow(r.recordset?.[0]);
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
               contact_number, alternate_officer, reason, attachment, hr_remarks
        FROM dbo.employee_leaves_request
        WHERE leave_status = @pending
        ORDER BY id DESC
      `);
    const data = r.recordset.map((row: any) => serializeLeaveRow(row));
    return res.json({ success: true, data });
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
               contact_number, alternate_officer, reason, attachment, hr_remarks
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
    const { status, hrRemarks } = req.body || {};
    if (!id || !status) return res.status(400).json({ message: 'id and status are required' });

    // Fetch existing row to detect transition and compute total days
    const existing = await pool.request().input('id', sql.Int, id).query(`
      SELECT id, emp_id, leave_type, start_date, end_date, total_days, leave_status, hr_remarks
      FROM dbo.employee_leaves_request
      WHERE id = @id
    `);
    const before = existing.recordset?.[0];
    if (!before) return res.status(404).json({ message: 'Request not found' });

    // If approving and it's an EL-deducting type, validate balance first
    const isApproving = String(status).toLowerCase() === 'approved' && String(before.leave_status).toLowerCase() !== 'approved';
    const trimmedRemarks = typeof hrRemarks === 'string' ? hrRemarks.trim() : '';
    if (isApproving && trimmedRemarks.length === 0) {
      return res.status(400).json({ message: 'HR remarks are required for approvals' });
    }
    let daysToDeduct = 0;
    if (isApproving) {
      if (before.total_days != null) daysToDeduct = Number(before.total_days) || 0;
      else {
        const sd = new Date(before.start_date);
        const ed = new Date(before.end_date);
        daysToDeduct = Math.max(0, Math.floor((Date.UTC(ed.getFullYear(), ed.getMonth(), ed.getDate()) - Date.UTC(sd.getFullYear(), sd.getMonth(), sd.getDate())) / (1000 * 60 * 60 * 24)) + 1);
      }
      const avail = await getAvailableForLeave(pool, Number(before.emp_id), String(before.leave_type));
      if (avail === null) {
        return res.status(400).json({ code: 'UNKNOWN_LEAVE_TYPE', message: 'Cannot validate leave balance for the selected leave type' });
      }
      if (daysToDeduct <= 0 || avail < daysToDeduct) {
        return res.status(400).json({ code: 'INSUFFICIENT_BALANCE', message: 'Insufficient leave balance', available: avail, requested: daysToDeduct });
      }
    }

    // Perform the status update
    const r = await pool
      .request()
      .input('id', sql.Int, id)
      .input('status', sql.NVarChar(20), String(status))
      .input('hr_remarks', sql.NVarChar(sql.MAX), trimmedRemarks.length > 0 ? trimmedRemarks : null)
      .query(`
        UPDATE dbo.employee_leaves_request
        SET leave_status = @status,
            hr_remarks = @hr_remarks
        OUTPUT INSERTED.id, INSERTED.emp_id, INSERTED.leave_type, INSERTED.start_date, INSERTED.end_date, INSERTED.total_days, INSERTED.leave_status,
               INSERTED.contact_number, INSERTED.alternate_officer, INSERTED.reason, INSERTED.attachment, INSERTED.hr_remarks
        WHERE id = @id
      `);

    const row = serializeLeaveRow(r.recordset?.[0]);
    if (!row) return res.status(404).json({ message: 'Request not found' });

    // If just approved and EL, deduct from EL balance (available-=:days, approved+=:days)
    if (isApproving && daysToDeduct > 0) {
      const cols = getColsForLeaveType(String(before.leave_type));
      if (cols) {
        await pool
          .request()
          .input('emp_id', sql.Int, Number(before.emp_id))
          .input('days', sql.Int, daysToDeduct)
          .query(`
            UPDATE ${BALANCE_TABLE}
            SET [${cols.avail}] = CASE WHEN [${cols.avail}] IS NULL THEN 0 ELSE [${cols.avail}] END - @days,
                [${cols.appr}] = CASE WHEN [${cols.appr}] IS NULL THEN 0 ELSE [${cols.appr}] END + @days
            WHERE emp_id = @emp_id;
          `);
      }
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

      // All employees that have any balance row
      const empRs = await db.request().query(`SELECT emp_id FROM ${BALANCE_TABLE}`);
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

