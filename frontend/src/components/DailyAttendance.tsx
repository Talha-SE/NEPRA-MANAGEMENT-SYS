import { useEffect, useMemo, useState } from 'react';
import { apiGetDailyAttendance, apiGetProfile, DailyAttendanceDTO } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export default function DailyAttendance() {
  const { user } = useAuth();
  const [date, setDate] = useState(() => new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DailyAttendanceDTO | null>(null);

  const ymd = useMemo(() => toYMD(date), [date]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const empId = await resolveEmpId(user?.id);
        if (!empId) {
          setError('Unable to resolve employee id');
          setLoading(false);
          return;
        }
        const res = await apiGetDailyAttendance({ empId, date: ymd });
        setData(res);
      } catch (e) {
        setError('Failed to load daily attendance');
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.id, ymd]);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="font-semibold">Daily Attendance</div>
          <div className="text-xs text-gray-500">{formatReadable(date)}</div>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn btn-secondary" onClick={() => setDate(addDays(date, -1))}>Prev</button>
          <button className="btn btn-secondary" onClick={() => setDate(new Date())}>Today</button>
          <button className="btn btn-secondary" onClick={() => setDate(addDays(date, 1))}>Next</button>
        </div>
      </div>

      {loading && <div className="rounded-lg border border-gray-200 bg-white p-4">Loading...</div>}
      {error && !loading && <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 p-4">{error}</div>}

      {!loading && !error && (
        <DailyRows data={data} />
      )}
    </div>
  );
}

function DailyRows({ data }: { data: DailyAttendanceDTO | null }) {
  if (!data || !data.rows || data.rows.length === 0) {
    return <div className="text-sm text-gray-600">No records found for this day.</div>;
  }
  const r = data.rows[0];
  return (
    <div className="grid gap-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <Chip label="Clock In" value={fmtTime(r.clockIn)} />
        <Chip label="Clock Out" value={fmtTime(r.clockOut)} />
        <Chip label="Check In" value={fmtTime(r.checkIn)} />
        <Chip label="Check Out" value={fmtTime(r.checkOut)} />
      </div>
      <div className="text-xs text-gray-600">
        Status: {r.present ? <b className="text-green-700">Present</b> : <b className="text-gray-700">Absent/Off</b>} {r.fullAttendance ? '· Full day' : ''}
      </div>
    </div>
  );
}

async function resolveEmpId(userId?: string | null): Promise<number | null> {
  // Try user.id numeric
  const n = Number(userId);
  if (Number.isFinite(n) && n > 0) return n;
  // Fallback to profile.empCode numeric
  try {
    const profile = await apiGetProfile();
    const emp = Number(profile.empCode);
    if (Number.isFinite(emp) && emp > 0) return emp;
  } catch {}
  return null;
}

function addDays(d: Date, days: number) {
  const nd = new Date(d);
  nd.setDate(nd.getDate() + days);
  return nd;
}

function toYMD(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function formatReadable(d: Date) {
  return new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: '2-digit', year: 'numeric' }).format(d);
}

function fmtTime(iso: string | null) {
  if (!iso) return '-';
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1.5">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900">{value}</span>
    </div>
  );
}
