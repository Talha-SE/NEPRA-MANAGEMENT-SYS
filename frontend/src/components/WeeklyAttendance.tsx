import { useEffect, useState } from 'react';
import { apiGetWeeklyAttendance, WeeklyDayDTO } from '../lib/api';

export default function WeeklyAttendance() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState<WeeklyDayDTO[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await apiGetWeeklyAttendance();
        setDays(data.days || []);
      } catch (e: any) {
        setError('Failed to load weekly attendance');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return <div className="rounded-lg border border-gray-200 bg-white p-4">Loading weekly attendance...</div>;
  }

  if (error) {
    return <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 p-4">{error}</div>;
  }

  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        {days.map((d) => (
          <DayCard key={d.dayIndex} day={d} />
        ))}
      </div>
      <Legend />
    </div>
  );
}

function DayCard({ day }: { day: WeeklyDayDTO }) {
  const badge = day.present ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-700 border-gray-200';
  return (
    <div className={`rounded-xl border ${day.present ? 'border-green-200' : 'border-gray-200'} bg-white p-4 shadow-sm`}> 
      <div className="flex items-center justify-between mb-2">
        <div className="font-semibold">{day.label}</div>
        <span className={`text-xs px-2.5 py-1 rounded-full border ${badge}`}>{day.present ? 'Present' : 'Off'}</span>
      </div>
      <div className="text-sm grid gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Chip label="In" value={fmt(day.inTime)} />
          <Chip label="Out" value={fmt(day.outTime)} />
        </div>
        {day.inTime && day.outTime && (
          <div className="text-xs text-gray-600">{duration(day.inTime, day.outTime)}</div>
        )}
      </div>
    </div>
  );
}

function fmt(t: string | null) {
  if (!t) return '-';
  // Expecting HH:mm:ss[.fffffff]; keep HH:mm
  return t.slice(0, 5);
}

function duration(inTime: string, outTime: string) {
  const [ih, im] = inTime.split(':').map((n) => parseInt(n, 10));
  const [oh, om] = outTime.split(':').map((n) => parseInt(n, 10));
  const mins = (oh * 60 + om) - (ih * 60 + im);
  if (!Number.isFinite(mins)) return '';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
}

function Legend() {
  return (
    <div className="flex items-center gap-4 text-sm text-gray-600">
      <span className="inline-flex items-center gap-2"><i className="h-3 w-3 rounded bg-green-500 inline-block" /> Present</span>
      <span className="inline-flex items-center gap-2"><i className="h-3 w-3 rounded bg-gray-400 inline-block" /> Off</span>
    </div>
  );
}

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1.5">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900">{value}</span>
    </div>
  );
}
