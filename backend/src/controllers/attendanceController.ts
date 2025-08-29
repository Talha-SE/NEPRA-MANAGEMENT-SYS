import { Request, Response } from 'express';
import sql from 'mssql';
import { getPool } from '../config/db';

// Helpers (module scope)
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
