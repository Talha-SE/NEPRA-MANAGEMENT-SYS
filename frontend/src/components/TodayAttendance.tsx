import { useEffect, useState } from 'react';
import { apiGetTodayAttendance, TodayAttendanceDTO } from '../lib/api';

export default function TodayAttendance() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<TodayAttendanceDTO | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiGetTodayAttendance();
        setData(res);
      } catch (e) {
        setError('Failed to load today\'s attendance');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="rounded-lg border border-gray-200 bg-white p-4">Loading today...</div>;
  if (error) return <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 p-4">{error}</div>;
  if (!data) return null;

  const badge = statusBadge(data.status);
  const dateStr = fmtDate(data.date);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-brand-50 text-brand-700 border border-brand-100 flex items-center justify-center">
            <IconClock />
          </div>
          <div>
            <div className="font-semibold leading-tight">Today{'\u00A0'}({data.weekday})</div>
            <div className="text-xs text-gray-500">{dateStr}</div>
          </div>
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full border ${badge.cls}`}>{badge.label}</span>
      </div>

      <div className="grid gap-3 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <Chip icon={<IconIn />} label="Scheduled In" value={fmt(data.scheduledIn)} />
          <Chip icon={<IconOut />} label="Scheduled Out" value={fmt(data.scheduledOut)} />
        </div>

        <div className="flex items-center gap-3 mt-1">
          <span className="text-gray-500">Progress</span>
          <Progress value={data.progressPercent} />
          <span className="text-xs text-gray-600 w-10 text-right">{data.progressPercent}%</span>
        </div>

        <div className="text-xs text-gray-600">
          Elapsed: <b>{minsToHhMm(data.elapsedMinutes)}</b> · Remaining: <b>{minsToHhMm(data.remainingMinutes)}</b>
        </div>
      </div>
    </div>
  );
}

function fmt(t: string | null) {
  if (!t) return '-';
  return t.slice(0, 5);
}

function fmtDate(iso: string) {
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: '2-digit' }).format(d);
  } catch {
    return '';
  }
}

function minsToHhMm(m: number) {
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${h}h ${mm}m`;
}

function Progress({ value }: { value: number }) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
      <div
        className="h-full bg-gradient-to-r from-brand-500 to-brand-700"
        style={{ width: `${v}%` }}
        aria-valuenow={v}
        aria-valuemin={0}
        aria-valuemax={100}
      />
    </div>
  );
}

function statusBadge(status: TodayAttendanceDTO['status']): { label: string; cls: string } {
  switch (status) {
    case 'off':
      return { label: 'Off', cls: 'bg-gray-50 text-gray-700 border-gray-200' };
    case 'before_shift':
      return { label: 'Starts Soon', cls: 'bg-amber-50 text-amber-700 border-amber-200' };
    case 'on_shift':
      return { label: 'On Shift', cls: 'bg-green-50 text-green-700 border-green-200' };
    case 'after_shift':
      return { label: 'Completed', cls: 'bg-blue-50 text-blue-700 border-blue-200' };
    default:
      return { label: 'N/A', cls: 'bg-gray-100 text-gray-600 border-gray-200' };
  }
}

function Chip({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1.5">
      <span className="text-gray-500">{icon}</span>
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900">{value}</span>
    </div>
  );
}

function IconClock() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-5 w-5">
      <circle cx="12" cy="12" r="9" strokeWidth="1.5" />
      <path d="M12 7v5l3 2" strokeWidth="1.5" />
    </svg>
  );
}

function IconIn() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-4 w-4">
      <path strokeWidth="1.5" d="M4 12h13" />
      <path strokeWidth="1.5" d="M11 7l5 5-5 5" />
    </svg>
  );
}

function IconOut() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-4 w-4">
      <path strokeWidth="1.5" d="M20 12H7" />
      <path strokeWidth="1.5" d="M13 7l-5 5 5 5" />
    </svg>
  );
}
