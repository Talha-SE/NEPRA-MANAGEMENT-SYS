import { useEffect, useMemo, useRef, useState } from 'react';
import { apiGetDailyAttendance, apiGetProfile, DailyAttendanceDTO, EmployeeSearchItemDTO, ProfileDTO } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import EmployeeSearch from './EmployeeSearch';

export default function DailyAttendance() {
  const { user } = useAuth();
  const isHR = user?.role === 'hr';
  const [date, setDate] = useState(() => new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DailyAttendanceDTO | null>(null);
  const [selectedEmp, setSelectedEmp] = useState<EmployeeSearchItemDTO | null>(null);
  const [profile, setProfile] = useState<ProfileDTO | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [didSearch, setDidSearch] = useState(false);

  const ymd = useMemo(() => toYMD(date), [date]);

  // Swipe-to-navigate (mobile)
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const touchActive = useRef(false);
  function onTouchStart(e: React.TouchEvent) {
    const t = e.changedTouches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
    touchActive.current = true;
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (!touchActive.current || !touchStart.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.current.x;
    const dy = t.clientY - touchStart.current.y;
    // Horizontal, minimal vertical movement
    if (Math.abs(dx) > 40 && Math.abs(dy) < 30) {
      if (dx < 0) setDate((d) => addDays(d, 1)); // swipe left -> next day
      else setDate((d) => addDays(d, -1)); // swipe right -> prev day
    }
    touchActive.current = false;
    touchStart.current = null;
  }

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const empId = selectedEmp?.id ?? (await resolveEmpId(user?.id));
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
  }, [user?.id, ymd, selectedEmp?.id]);

  // HR: explicit search to fetch profile card
  async function onSearch() {
    if (!isHR) return;
    setDidSearch(true);
    setSearchError(null);
    try {
      setSearching(true);
      const empId = selectedEmp?.id ?? (await resolveEmpId(user?.id));
      if (!empId) { setSearchError('Please select an employee'); return; }
      const p = await apiGetProfile(empId);
      setProfile(p);
    } catch (e) {
      setProfile(null);
      setSearchError('Failed to load employee profile');
    } finally {
      setSearching(false);
    }
  }

  return (
    <>
      {isHR && (
        <div className="mb-4">
          <div className="flex flex-col gap-2">
            <div className="text-sm text-gray-700">Search employee to view attendance</div>
            <div className="flex items-center gap-2">
              <div className="w-full sm:max-w-xl">
                <EmployeeSearch value={selectedEmp} onChange={setSelectedEmp} placeholder="Search by name, email or ID" />
              </div>
              <button className="btn btn-primary px-4 py-2" onClick={onSearch} disabled={searching}>{searching ? 'Searching…' : 'Search'}</button>
            </div>
          </div>
          {searchError && didSearch && (
            <div className="mt-2 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 p-2 text-xs">{searchError}</div>
          )}
        </div>
      )}
      <div
        className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5 shadow-sm"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
      {/* HR Only: Employee profile card */}
      {isHR && didSearch && profile && (
        <div className="mb-3 rounded-lg border border-slate-200 bg-white p-3">
          <div className="text-sm font-medium text-black">Employee Profile</div>
          <div className="mt-1 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-slate-800">
            <div><span className="text-slate-500">Name:</span> <b>{profile.firstName} {profile.lastName}</b></div>
            <div><span className="text-slate-500">Email:</span> <b>{profile.email}</b></div>
            {profile.empCode && <div><span className="text-slate-500">Emp Code:</span> <b>{profile.empCode}</b></div>}
            {profile.companyName && <div className="sm:col-span-3"><span className="text-slate-500">Company:</span> <b>{profile.companyName}</b></div>}
          </div>
        </div>
      )}
      {/* Header & Date Controls */}
      <div className="mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="font-semibold text-base sm:text-lg">Daily Details</div>
            <div className="text-xs text-gray-500 hidden sm:flex items-center gap-2">
              <span>{formatReadable(date)}</span>
              <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-700">
                {new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(date)}
              </span>
            </div>
          </div>
          <div className="flex w-full sm:w-auto items-center gap-2">
            {/* Native date picker for mobile */}
            <input
              type="date"
              className="input w-full sm:w-auto text-sm"
              aria-label="Select date"
              value={ymd}
              onChange={(e) => {
                const v = e.target.value;
                if (v) {
                  const [yy, mm, dd] = v.split('-').map((s) => parseInt(s, 10));
                  if (yy && mm && dd) setDate(new Date(yy, mm - 1, dd));
                }
              }}
            />
            {/* Segmented prev/today/next controls */}
            <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden">
              <button className="px-3 py-2 text-base sm:text-sm hover:bg-gray-50 active:bg-gray-100" onClick={() => setDate(addDays(date, -1))} aria-label="Previous day">◀</button>
              <button className="px-3 py-2 text-base sm:text-sm hover:bg-gray-50 active:bg-gray-100 border-l border-r border-gray-200" onClick={() => setDate(new Date())}>Today</button>
              <button className="px-3 py-2 text-base sm:text-sm hover:bg-gray-50 active:bg-gray-100" onClick={() => setDate(addDays(date, 1))} aria-label="Next day">▶</button>
            </div>
          </div>
        </div>
        <div className="text-[11px] text-gray-500 sm:hidden mt-1 flex items-center gap-2">
          <span>{formatReadable(date)}</span>
          <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-700">
            {new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(date)}
          </span>
        </div>
      </div>
      

      {loading && <div className="rounded-lg border border-gray-200 bg-white p-4">Loading...</div>}
      {error && !loading && <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 p-4">{error}</div>}

      {!loading && !error && (
        <>
          <DailyRows data={data} />
          <div className="mt-3 text-[11px] text-gray-500">Times shown are in your local timezone.</div>
        </>
      )}
      </div>
    </>
  );
}

function DailyRows({ data }: { data: DailyAttendanceDTO | null }) {
  if (!data || !data.rows || data.rows.length === 0) {
    return <div className="text-sm text-gray-600">No records found for this day.</div>;
  }
  return (
    <div className="grid gap-3 sm:gap-4 text-sm">
      {data.rows.map((r, idx) => (
        <div key={r.id} className="rounded-lg border border-gray-200 p-3 sm:p-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-xs text-gray-500">Record {idx + 1}</div>
            <div className="text-[11px] text-gray-400">ID: {r.id}</div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <Chip label="Clock In" value={fmtTime(r.clockIn)} />
            <Chip label="Clock Out" value={fmtTime(r.clockOut)} />
            <Chip label="Check In" value={fmtTime(r.checkIn)} />
            <Chip label="Check Out" value={fmtTime(r.checkOut)} />
            <Chip label="Break In" value={fmtTime(r.breakIn || null)} />
            <Chip label="Break Out" value={fmtTime(r.breakOut || null)} />
          </div>
          <div className="mt-2 text-xs text-gray-600">
            Status: {r.present ? <b className="text-green-700">Present</b> : <b className="text-gray-700">Absent/Off</b>} {r.fullAttendance ? '· Full day' : ''}
          </div>
        </div>
      ))}
    </div>
  );
}

async function resolveEmpId(userId?: string | null): Promise<number | null> {
  // Try user.id numeric from JWT (sub)
  const n = Number(userId);
  if (Number.isFinite(n) && n > 0) return n;
  // Fallback to server profile.id (authoritative employee id)
  try {
    const profile = await apiGetProfile();
    const emp = Number(profile.id);
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
    <div className="inline-flex items-center gap-1.5 sm:gap-2 rounded-md border border-gray-200 bg-gray-50 px-2 py-1.5 sm:px-2.5">
      <span className="text-[11px] sm:text-xs text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900 tabular-nums">{value}</span>
    </div>
  );
}
