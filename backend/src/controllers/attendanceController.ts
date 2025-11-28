import { Request, Response } from 'express';
import sql from 'mssql';
import { getPool } from '../config/db';

// Helpers (module scope)
function extractTimeOnly(val: any): string | null {
  if (!val) return null;
  
  // If it's a Date object, use UTC methods to get the raw time stored in DB
  // SQL Server datetime comes as UTC, we want to preserve the exact hours/minutes stored
  if (val instanceof Date) {
    const h = String(val.getUTCHours()).padStart(2, '0');
    const m = String(val.getUTCMinutes()).padStart(2, '0');
    const s = String(val.getUTCSeconds()).padStart(2, '0');
    return `${h}:${m}:${s}`;
  }
  
  // If it's a string that looks like a time or datetime, extract time portion
  if (typeof val === 'string') {
    // Check if it contains time part (HH:mm or HH:mm:ss)
    const timeMatch = val.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (timeMatch) {
      const h = String(parseInt(timeMatch[1], 10)).padStart(2, '0');
      const m = String(parseInt(timeMatch[2], 10)).padStart(2, '0');
      const s = timeMatch[3] ? String(parseInt(timeMatch[3], 10)).padStart(2, '0') : '00';
      return `${h}:${m}:${s}`;
    }
  }
  
  return null;
}

function addMinutesToTime(inTime: string, minutes: number): string {
  const parts = inTime.split(':');
  const h = parseInt(parts[0] || '0', 10);
  const m = parseInt(parts[1] || '0', 10);
  const base = h * 60 + m;
  const total = base + (Number.isFinite(minutes) ? minutes : 0);
  const t = ((total % (24 * 60)) + (24 * 60)) % (24 * 60); // wrap 24h
  const oh = Math.floor(t / 60);
  const om = t % 60;
  const hh = String(oh).padStart(2, '0');
  const mm = String(om).padStart(2, '0');
  return `${hh}:${mm}:00`;
}

// GET /api/attendance/daily?empId=123&date=YYYY-MM-DD
// Reads from dbo.att_payloadtimecard and returns daily attendance rows for an employee
export async function getDailyAttendance(req: Request, res: Response) {
  try {
    const empIdParam = req.query.empId as string | undefined;
    const dateParam = req.query.date as string | undefined; // YYYY-MM-DD

    if (!empIdParam) return res.status(400).json({ message: 'empId is required' });
    const empId = Number(empIdParam);
    if (!Number.isFinite(empId)) return res.status(400).json({ message: 'empId must be a number' });

    // Authorization: only HR can query others; employees can only query their own empId
    const requester = req.user;
    if (!requester) return res.status(401).json({ message: 'Unauthorized' });
    const requesterId = Number(requester.id);
    if (requester.role !== 'hr' && requesterId !== empId) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const date = dateParam ? new Date(dateParam) : new Date();
    if (Number.isNaN(date.getTime())) return res.status(400).json({ message: 'Invalid date' });

    const db = getPool();
    const request = db.request();

    // Resolve canonical employee ID (personnel_employee.id). In some contexts, callers may send emp_code instead of id.
    // We try id first; if not found, we look up by emp_code.
    const resolver = await db
      .request()
      .input('Given', sql.Int, empId)
      .query(`
        SELECT TOP 1 id FROM dbo.personnel_employee WHERE id = @Given
        UNION ALL
        SELECT TOP 1 id FROM dbo.personnel_employee WHERE TRY_CAST(emp_code AS INT) = @Given
      `);
    const canonicalEmpId: number = resolver.recordset?.[0]?.id ?? empId;

    // Pass date as plain YYYY-MM-DD string to avoid timezone drift
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const attDateStr = `${y}-${m}-${d}`;

    request.input('empId', sql.Int, canonicalEmpId);
    request.input('attDate', sql.Date, attDateStr);

    const q = `
      SELECT 
        id,
        att_date,
        weekday,
        check_in,
        check_out,
        clock_in,
        clock_out,
        break_in,
        break_out,
        present,
        full_attendance
      FROM dbo.att_payloadtimecard
      WHERE emp_id = @empId AND CAST(att_date AS date) = @attDate
      ORDER BY check_in ASC
    `;

    const rs = await request.query(q);

    const rows = (rs.recordset || []).map((r: any) => ({
      id: r.id,
      attDate: r.att_date instanceof Date ? r.att_date.toISOString() : r.att_date,
      weekday: r.weekday,
      checkIn: r.check_in ? extractTimeOnly(r.check_in) : null,
      checkOut: r.check_out ? extractTimeOnly(r.check_out) : null,
      clockIn: r.clock_in ? extractTimeOnly(r.clock_in) : null,
      clockOut: r.clock_out ? extractTimeOnly(r.clock_out) : null,
      breakIn: r.break_in ? extractTimeOnly(r.break_in) : null,
      breakOut: r.break_out ? extractTimeOnly(r.break_out) : null,
      // Present is determined by clock_in: if clock_in has a time, employee is present
      present: !!r.clock_in,
      fullAttendance: !!r.full_attendance,
    }));
    

    return res.json({ empId: canonicalEmpId, date: new Date(date).toISOString(), rows });
  } catch (err) {
    console.error('[attendance:daily] error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

function toHHMMSS(val: any): string | null {
  if (val == null) return null;
  if (typeof val === 'string') {
    const parts = val.split(':');
    if (parts.length >= 2) {
      const h = String(parseInt(parts[0] || '0', 10)).padStart(2, '0');
      const m = String(parseInt(parts[1] || '0', 10)).padStart(2, '0');
      const s = parts.length >= 3 ? String(parseInt(parts[2], 10) || 0).padStart(2, '0') : '00';
      return `${h}:${m}:${s}`;
    }
    return null;
  }
  if (val instanceof Date) {
    const h = String(val.getHours()).padStart(2, '0');
    const m = String(val.getMinutes()).padStart(2, '0');
    return `${h}:${m}:00`;
  }
  if (typeof val === 'object') {
    const h = 'hours' in val ? parseInt(val.hours, 10) : NaN;
    const m = 'minutes' in val ? parseInt(val.minutes, 10) : NaN;
    if (!Number.isNaN(h) && !Number.isNaN(m)) {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
    }
  }
  return null;
}

function toMinutes(val: any): number | null {
  if (val == null) return null;
  if (typeof val === 'number' && Number.isFinite(val)) return val;
  if (typeof val === 'string') {
    const n = parseInt(val, 10);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

// GET /api/attendance/week?shiftId=ID
// Returns 7-day schedule from att_shiftdetail with in/out_time grouped by day_index (1-7 or 0-6 depending on data)
export async function getWeeklySchedule(req: Request, res: Response) {
  try {
    const shiftIdParam = req.query.shiftId as string | undefined;
    const db = getPool();

    let shiftId: number | null = null;
    if (shiftIdParam) {
      shiftId = Number(shiftIdParam);
      if (Number.isNaN(shiftId)) return res.status(400).json({ message: 'Invalid shiftId' });
    } else {
      // Fallback: pick any available shift_id to demo the view
      const guess = await db.request().query('SELECT TOP 1 shift_id FROM dbo.att_shiftdetail ORDER BY shift_id');
      shiftId = guess.recordset[0]?.shift_id ?? null;
    }
    // Source of truth: dbo.att_timeinterval (use first available interval)
    const intervalRes = await db.request().query(`
      SELECT TOP 1 id, alias, in_time, duration
      FROM dbo.att_timeinterval
      ORDER BY id
    `);

    if (!intervalRes.recordset || intervalRes.recordset.length === 0) {
      return res.json({ shiftId: null, days: [] });
    }

    const interval = intervalRes.recordset[0] as { id: number; alias: string; in_time: any; duration: any };

    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const days = labels.map((label, i) => {
      const isWeekend = i >= 5; // Sat(5), Sun(6)
      if (isWeekend) {
        return { label, dayIndex: i + 1, inTime: null, outTime: null, present: false };
      }
      const inTime = toHHMMSS(interval.in_time);
      const durMin = toMinutes(interval.duration);
      const outTime = inTime != null && durMin != null ? addMinutesToTime(inTime, durMin) : null;
      return {
        label,
        dayIndex: i + 1,
        inTime,
        outTime,
        present: !!(inTime && outTime),
      };
    });

    return res.json({ shiftId: null, days });
  } catch (err) {
    console.error('[attendance:week] error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// GET /api/attendance/today
export async function getTodayAttendance(req: Request, res: Response) {
  try {
    const db = getPool();
    const intervalRes = await db.request().query(`
      SELECT TOP 1 id, alias, in_time, duration
      FROM dbo.att_timeinterval
      ORDER BY id
    `);

    const now = new Date();
    const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(now);

    if (!intervalRes.recordset || intervalRes.recordset.length === 0) {
      return res.json({
        date: now.toISOString(),
        weekday,
        scheduledIn: null,
        scheduledOut: null,
        status: 'off',
        elapsedMinutes: 0,
        remainingMinutes: 0,
        progressPercent: 0,
      });
    }

    const row = intervalRes.recordset[0] as { in_time: any; duration: any };
    const scheduledIn = toHHMMSS(row.in_time);
    const durMin = toMinutes(row.duration) ?? 0;
    const scheduledOut = scheduledIn ? addMinutesToTime(scheduledIn, durMin) : null;

    // Determine status vs current time
    const isWeekend = [6, 0].includes(now.getDay()); // Sat=6, Sun=0
    const nowMin = now.getHours() * 60 + now.getMinutes();

    const toMin = (t: string | null) => (t ? (parseInt(t.slice(0, 2)) * 60 + parseInt(t.slice(3, 5))) : null);
    const inMin = toMin(scheduledIn);
    const outMin = toMin(scheduledOut);

    let status: 'off' | 'before_shift' | 'on_shift' | 'after_shift' = 'off';
    let elapsedMinutes = 0;
    let remainingMinutes = 0;
    let progressPercent = 0;

    if (isWeekend || !inMin || !outMin) {
      status = 'off';
    } else if (nowMin < inMin) {
      status = 'before_shift';
      remainingMinutes = inMin - nowMin;
    } else if (nowMin >= inMin && nowMin <= outMin) {
      status = 'on_shift';
      elapsedMinutes = nowMin - inMin;
      remainingMinutes = outMin - nowMin;
      progressPercent = durMin > 0 ? Math.max(0, Math.min(100, Math.round((elapsedMinutes / durMin) * 100))) : 0;
    } else {
      status = 'after_shift';
      elapsedMinutes = durMin;
      remainingMinutes = 0;
      progressPercent = 100;
    }

    return res.json({
      date: now.toISOString(),
      weekday,
      scheduledIn,
      scheduledOut,
      status,
      elapsedMinutes,
      remainingMinutes,
      progressPercent,
    });
  } catch (err) {
    console.error('[attendance:today] error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
