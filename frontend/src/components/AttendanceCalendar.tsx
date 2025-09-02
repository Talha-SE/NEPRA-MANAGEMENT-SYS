import { useEffect, useMemo, useState } from 'react';
import { apiGetDailyAttendance, apiGetProfile, DailyAttendanceDTO, DailyAttendanceRowDTO } from '../lib/api';
import { useAuth } from '../context/AuthContext';

// Monthly attendance calendar with Monday-first week
export default function AttendanceCalendar() {
  const { user } = useAuth();
  const [anchorDate, setAnchorDate] = useState(() => stripTime(new Date())); // any day within current month
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [monthData, setMonthData] = useState<Record<string, DailyAttendanceDTO | null>>({}); // yyy-mm-dd -> data
  // animation state
  const [prevWeeks, setPrevWeeks] = useState<GridCell[][] | null>(null);
  const [prevMonthLabel, setPrevMonthLabel] = useState<string>('');
  const [animDir, setAnimDir] = useState<-1 | 1>(1);
  const [isAnimating, setIsAnimating] = useState(false);
  const [entering, setEntering] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  // daily selection & details
  const [selectedDate, setSelectedDate] = useState<Date>(() => stripTime(new Date()));
  const [selectedDetails, setSelectedDetails] = useState<DailyAttendanceDTO | null>(null);
  const [selLoading, setSelLoading] = useState(false);
  const [selError, setSelError] = useState<string | null>(null);
  const [detailsCache, setDetailsCache] = useState<Record<string, DailyAttendanceDTO | null>>({});

  const { startOfMonth, endOfMonth, startOfGrid, daysInMonth } = useMemo(() => calcMonth(anchorDate), [anchorDate]);

  const monthKey = useMemo(() => `${startOfMonth.getFullYear()}-${startOfMonth.getMonth()}`, [startOfMonth]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const empId = await resolveEmpId(user?.id);
        if (!empId) throw new Error('Unable to resolve employee id');

        // Fetch only current-month days; grid extra days are shown muted without data
        const fetchDates: string[] = [];
        for (let d = 1; d <= daysInMonth; d++) {
          const ymd = toYMD(new Date(startOfMonth.getFullYear(), startOfMonth.getMonth(), d));
          fetchDates.push(ymd);
        }
        const results: Record<string, DailyAttendanceDTO | null> = {};
        const batchSize = 6;
        for (let i = 0; i < fetchDates.length; i += batchSize) {
          const chunk = fetchDates.slice(i, i + batchSize);
          const res = await Promise.all(
            chunk.map(async (ymd) => {
              try {
                const r = await apiGetDailyAttendance({ empId, date: ymd });
                return [ymd, r] as const;
              } catch {
                return [ymd, null] as const;
              }
            })
          );
          for (const [ymd, r] of res) results[ymd] = r;
        }
        setMonthData(results);
      } catch (e: any) {
        setError('Failed to load monthly attendance');
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.id, monthKey]);

  // keep selected date within current month when anchor changes
  useEffect(() => {
    if (!selectedDate) return;
    if (
      selectedDate.getFullYear() !== startOfMonth.getFullYear() ||
      selectedDate.getMonth() !== startOfMonth.getMonth()
    ) {
      setSelectedDate(new Date(startOfMonth));
    }
  }, [startOfMonth]);

  // fetch selected day details with basic cache
  useEffect(() => {
    (async () => {
      if (!selectedDate) return;
      const empId = await resolveEmpId(user?.id);
      if (!empId) return;
      const ymd = toYMD(selectedDate);
      if (Object.prototype.hasOwnProperty.call(detailsCache, ymd)) {
        setSelectedDetails(detailsCache[ymd] ?? null);
        return;
      }
      setSelLoading(true);
      setSelError(null);
      try {
        const res = await apiGetDailyAttendance({ empId, date: ymd });
        setSelectedDetails(res);
        setDetailsCache((m) => ({ ...m, [ymd]: res }));
      } catch (e) {
        setSelError('Failed to load daily details');
        setSelectedDetails(null);
      } finally {
        setSelLoading(false);
      }
    })();
  }, [user?.id, selectedDate]);

  const weeks = useMemo(() => buildGrid(startOfGrid), [startOfGrid]);

  function gotoPrevMonth() {
    // capture current grid for animation
    setPrevWeeks(weeks);
    setPrevMonthLabel(monthLabel);
    setAnimDir(-1);
    setIsAnimating(true);
    setEntering(false);
    setAnchorDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
    // trigger entering phase on next frame
    requestAnimationFrame(() => setEntering(true));
    // end animation after a short duration
    window.setTimeout(() => {
      setIsAnimating(false);
      setPrevWeeks(null);
      setPrevMonthLabel('');
      setEntering(false);
    }, 320);
  }
  function gotoNextMonth() {
    setPrevWeeks(weeks);
    setPrevMonthLabel(monthLabel);
    setAnimDir(1);
    setIsAnimating(true);
    setEntering(false);
    setAnchorDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
    requestAnimationFrame(() => setEntering(true));
    window.setTimeout(() => {
      setIsAnimating(false);
      setPrevWeeks(null);
      setEntering(false);
    }, 320);
  }
  function gotoToday() {
    const t = stripTime(new Date());
    setAnchorDate(new Date(t.getFullYear(), t.getMonth(), 1));
  }

  const monthLabel = useMemo(
    () => new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(startOfMonth),
    [startOfMonth]
  );

  const prevMonthName = useMemo(
    () => new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() - 1, 1)),
    [startOfMonth]
  );
  const nextMonthName = useMemo(
    () => new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + 1, 1)),
    [startOfMonth]
  );

  function handleKeyDown(e: any) {
    if (e.key === 'ArrowLeft') { e.preventDefault(); gotoPrevMonth(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); gotoNextMonth(); }
    else if (typeof e.key === 'string' && e.key.toLowerCase() === 't') { e.preventDefault(); gotoToday(); }
    else if (e.key === 'Escape') { setShowHelp(false); }
  }

  const summary = useMemo(() => computeSummary(monthData, startOfMonth, daysInMonth), [monthData, startOfMonth, daysInMonth]);

  return (
    <div className="relative rounded-2xl border border-gray-200 bg-gradient-to-br from-amber-50/30 via-white to-emerald-50/30 p-5 shadow-sm outline-none focus:ring-2 focus:ring-emerald-300" tabIndex={0} onKeyDown={handleKeyDown}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="font-semibold">Attendance Calendar</div>
          <div className="relative h-5 text-xs text-gray-500 overflow-hidden" aria-live="polite">
            <span
              className={`absolute inset-0 transition-all duration-200 ${
                isAnimating && !entering ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1'
              }`}
            >
              {prevMonthLabel || monthLabel}
            </span>
            <span
              className={`absolute inset-0 transition-all duration-200 ${
                isAnimating && !entering ? 'opacity-0 translate-y-1' : 'opacity-100 translate-y-0'
              }`}
            >
              {monthLabel}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className="btn btn-secondary" title={`Go to ${prevMonthName}`} onClick={gotoPrevMonth}>Prev</button>
          <button type="button" className="btn btn-secondary" title="Jump to current month" onClick={gotoToday}>Today</button>
          <button type="button" className="btn btn-secondary" title={`Go to ${nextMonthName}`} onClick={gotoNextMonth}>Next</button>
          <button type="button" className="btn btn-secondary" title="How to use this calendar" onClick={() => setShowHelp(v => !v)}>Help</button>
        </div>
      </div>

      {showHelp && (
        <div className="absolute right-3 top-14 z-30 w-80 rounded-xl border border-gray-200 bg-white p-3 shadow-lg text-xs text-gray-700">
          <div className="font-medium mb-1">How to use</div>
          <ul className="list-disc pl-4 space-y-1">
            <li>Use Prev/Next or ← → keys to change months. Press <b>T</b> to jump to today.</li>
            <li>Green dot = Present. Orange dot = Absent. Hatched cells = outside this month.</li>
            <li>Hover or focus a day to see detailed times.</li>
            <li>The current day shows a green border and a “Today” badge.</li>
          </ul>
        </div>
      )}

      {error && <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 p-3 mb-2">{error}</div>}

      <div className="space-y-3">
          {/* Month summary chips */}
          <div className="flex items-center gap-2 text-xs px-1">
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 px-2 py-0.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> Present: <b>{summary.present}</b>
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 text-amber-700 px-2 py-0.5">
              <span className="h-2 w-2 rounded-full bg-amber-500" /> Absent: <b>{summary.absent}</b>
            </span>
          </div>
          {/* Tips for quick understanding */}
          <div className="flex items-center gap-2 text-[11px] text-gray-500 px-1">
            <span className="h-1.5 w-1.5 rounded-full bg-gray-300" />
            <span>Tip: Use ← → keys or the buttons to switch months. Press T to jump to today.</span>
          </div>
          {/* Weekday header Mon..Sun */}
          <div className="grid grid-cols-7 gap-2 text-sm font-bold uppercase tracking-wide px-1">
            {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((d, i) => (
              <div key={d} className={`text-center ${i>=5 ? 'text-rose-600' : 'text-gray-700'}`}>{d}</div>
            ))}
          </div>
          {/* 6x7 grid with slide animation */}
          <div className="relative overflow-hidden" role="region" aria-label={`Days for ${monthLabel}`}>
            {/* Current month grid */}
            <div
              className={`grid grid-cols-7 gap-2 transition-all duration-300 ease-out transform-gpu will-change-transform ${
                isAnimating
                  ? entering
                    ? 'translate-x-0 opacity-100'
                    : animDir === 1
                    ? 'translate-x-full opacity-0'
                    : '-translate-x-full opacity-0'
                  : 'translate-x-0 opacity-100'
              }`}
              role="grid"
              aria-label={`Calendar grid for ${monthLabel}`}
            >
              {weeks.map((w) =>
                w.map((cell) => {
                  const inMonth = cell.date.getMonth() === startOfMonth.getMonth();
                  return (
                    <DayCell
                      key={cell.ymd}
                      cell={cell}
                      inMonth={inMonth}
                      today={isSameDate(cell.date, new Date())}
                      data={monthData[cell.ymd] || null}
                      weekend={isWeekend(cell.date)}
                      onSelect={(d) => setSelectedDate(stripTime(d))}
                      selected={isSameDate(cell.date, selectedDate)}
                      disabled={!inMonth}
                    />
                  );
                })
              )}
            </div>

            {/* Previous month grid - only visible during animation */}
            {prevWeeks && isAnimating && (
              <div
                className={`pointer-events-none absolute inset-0 grid grid-cols-7 gap-2 transition-all duration-300 ease-out transform-gpu will-change-transform ${
                  entering
                    ? animDir === 1
                      ? '-translate-x-full opacity-0'
                      : 'translate-x-full opacity-0'
                    : 'translate-x-0 opacity-100'
                }`}
                aria-hidden="true"
              >
                {prevWeeks.map((w) =>
                  w.map((cell) => (
                    <DayCell
                      key={`prev-${cell.ymd}`}
                      cell={cell}
                      inMonth={false}
                      today={false}
                      data={null}
                      weekend={isWeekend(cell.date)}
                      disabled
                    />
                  ))
                )}
              </div>
            )}
          </div>

          {/* subtle loader without replacing grid */}
          {loading && (
            <div className="text-xs text-gray-500 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-gray-300 animate-pulse" />
              Updating…
            </div>
          )}

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-gray-600 mt-2">
            <LegendDot className="bg-emerald-500" label="Present" />
            <LegendDot className="bg-amber-500" label="Absent" />
            <LegendHatch label="Outside month" />
            <span className="ml-auto text-gray-500">Present: <b className="text-emerald-700">{summary.present}</b> · Absent: <b className="text-amber-700">{summary.absent}</b></span>
          </div>
          <div className="text-[10px] text-gray-400 px-1">Days without records are counted as Absent in the summary.</div>

          {/* Daily details panel */}
          <div className="mt-4 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b bg-gray-50/60 flex items-center justify-between">
              <div className="text-sm font-medium" aria-live="polite">
                Daily Details — {new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(selectedDate)}
              </div>
              {selectedDetails && selectedDetails.rows && selectedDetails.rows[0] && (
                <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full border ${selectedDetails.rows[0].present ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
                  <span className={`h-2 w-2 rounded-full ${selectedDetails.rows[0].present ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  {selectedDetails.rows[0].present ? 'Present' : 'Absent'}
                </span>
              )}
            </div>
            <div className="px-4 py-4">
              {selError && (
                <div className="rounded-md border border-red-200 bg-red-50 text-red-700 text-sm p-2 mb-2">{selError}</div>
              )}

              {selLoading ? (
                <div className="animate-pulse grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="h-10 rounded-md bg-gray-100" />
                  <div className="h-10 rounded-md bg-gray-100" />
                  <div className="h-10 rounded-md bg-gray-100" />
                  <div className="h-10 rounded-md bg-gray-100" />
                </div>
              ) : selectedDetails && selectedDetails.rows && selectedDetails.rows.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(() => {
                      const r = selectedDetails.rows[0];
                      const totalWorked = formatMinutes(computeTotalWorked(selectedDetails.rows));
                      const items = [
                        { label: 'Total Worked', value: totalWorked || '—' },
                        { label: 'Check In', value: fmtTime(r.checkIn) || '—' },
                        { label: 'Clock In', value: fmtTime(r.clockIn) || '—' },
                        { label: 'Clock Out', value: fmtTime(r.clockOut) || '—' },
                        { label: 'Check Out', value: fmtTime(r.checkOut) || '—' },
                        { label: 'Full Attendance', value: r.fullAttendance ? 'Yes' : 'No' },
                        { label: 'Weekday', value: new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date(selectedDetails.date)) },
                      ];
                      return items.map((it) => (
                        <div key={it.label} className="flex items-center justify-between rounded-md border border-gray-100 bg-gray-50 px-3 py-2">
                          <div className="text-xs text-gray-500">{it.label}</div>
                          <div className="text-sm font-medium text-gray-800">{it.value}</div>
                        </div>
                      ));
                    })()}
                  </div>

                  {/* Detailed records table */}
                  <div className="mt-4">
                    <div className="mb-2 text-xs font-medium text-gray-600">Detailed Records</div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="text-left text-gray-500">
                            <th className="px-3 py-2 border-b bg-gray-50">Check In</th>
                            <th className="px-3 py-2 border-b bg-gray-50">Check Out</th>
                            <th className="px-3 py-2 border-b bg-gray-50">Clock In</th>
                            <th className="px-3 py-2 border-b bg-gray-50">Clock Out</th>
                            <th className="px-3 py-2 border-b bg-gray-50">Break In</th>
                            <th className="px-3 py-2 border-b bg-gray-50">Break Out</th>
                            <th className="px-3 py-2 border-b bg-gray-50">Worked</th>
                            <th className="px-3 py-2 border-b bg-gray-50">Present</th>
                            <th className="px-3 py-2 border-b bg-gray-50">Full</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedDetails.rows.map((r, idx) => {
                            const start = r.clockIn || r.checkIn;
                            const end = r.clockOut || r.checkOut;
                            const base = minutesBetween(start, end) || 0;
                            const br = r.breakIn && r.breakOut ? (minutesBetween(r.breakIn, r.breakOut) || 0) : 0;
                            const workedStr = formatMinutes(Math.max(0, base - br));
                            return (
                              <tr key={r.id || idx} className="border-b last:border-b-0">
                                <td className="px-3 py-2">{fmtTime(r.checkIn) || '—'}</td>
                                <td className="px-3 py-2">{fmtTime(r.checkOut) || '—'}</td>
                                <td className="px-3 py-2">{fmtTime(r.clockIn) || '—'}</td>
                                <td className="px-3 py-2">{fmtTime(r.clockOut) || '—'}</td>
                                <td className="px-3 py-2">{fmtTime(r.breakIn) || '—'}</td>
                                <td className="px-3 py-2">{fmtTime(r.breakOut) || '—'}</td>
                                <td className="px-3 py-2">{workedStr || '—'}</td>
                                <td className="px-3 py-2">
                                  <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full border ${r.present ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
                                    <span className={`h-2 w-2 rounded-full ${r.present ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                    {r.present ? 'Present' : 'Absent'}
                                  </span>
                                </td>
                                <td className="px-3 py-2">{r.fullAttendance ? 'Yes' : 'No'}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-sm text-gray-600">No record found for this date.</div>
              )}
              <div className="mt-2 text-[10px] text-gray-400">Times shown are in your local timezone.</div>
            </div>
          </div>
        </div>
    </div>
  );
}

function DayCell({ cell, inMonth, today, data, weekend, onSelect, selected, disabled }: { cell: GridCell; inMonth: boolean; today: boolean; data: DailyAttendanceDTO | null; weekend: boolean; onSelect?: (d: Date) => void; selected?: boolean; disabled?: boolean }) {
  // Status: only present/absent per requirements
  let status: 'present' | 'absent' | 'outside' = inMonth ? 'absent' : 'outside';
  let times: string | null = null;
  if (data && data.rows && data.rows.length > 0) {
    const r = data.rows[0];
    status = r.present ? 'present' : 'absent';
    const tIn = fmtTime(r.clockIn) || fmtTime(r.checkIn);
    const tOut = fmtTime(r.clockOut) || fmtTime(r.checkOut);
    if (tIn || tOut) times = `${tIn || '--'} — ${tOut || '--'}`;
  }

  const dotClass = status === 'present' ? 'bg-emerald-500' : status === 'absent' ? 'bg-amber-500' : 'bg-gray-300';

  const outsideStyle = !inMonth
    ? { backgroundImage: 'repeating-linear-gradient(135deg, rgba(0,0,0,0.04) 0, rgba(0,0,0,0.04) 6px, transparent 6px, transparent 12px)' }
    : undefined;

  const fullDateLabel = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(cell.date);
  const ariaLabel = `${fullDateLabel}. ${status === 'present' ? 'Present' : status === 'absent' ? 'Absent' : 'Outside month'}${times ? `. Times: ${times}` : ''}`;

  return (
    <div
      className={`group relative rounded-xl border p-2 min-h-[84px] flex flex-col gap-1 transition hover:shadow-sm ${
        inMonth ? (weekend ? 'bg-rose-50/60 border-gray-200' : 'bg-white border-gray-200') : 'border-gray-200'
      } ${today ? 'border-2 border-emerald-500 shadow-[0_0_0_2px_rgba(16,185,129,0.15)]' : ''} ${!disabled && inMonth ? 'cursor-pointer' : ''} ${
        selected && !today ? 'ring-2 ring-emerald-300' : ''
      }`}
      style={outsideStyle}
      tabIndex={0}
      aria-label={ariaLabel}
      role="gridcell"
      aria-current={today ? 'date' : undefined}
      aria-selected={selected ? true : undefined}
      onClick={() => { if (!disabled && onSelect) onSelect(cell.date); }}
      onKeyDown={(e) => {
        if (disabled || !onSelect) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(cell.date);
        }
      }}
    >
      {today && (
        <span className="absolute top-1 right-1 text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Today</span>
      )}

      {/* Tooltip with details */}
      <div className="pointer-events-none absolute z-20 left-1/2 -translate-x-1/2 -top-1 -translate-y-full opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition duration-150">
        <div className="rounded-md border border-gray-200 bg-white px-2.5 py-1.5 shadow-md text-xs text-gray-700 whitespace-nowrap">
          <div className="font-medium">{fullDateLabel}</div>
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${dotClass}`} />
            <span>{status === 'present' ? 'Present' : status === 'absent' ? 'Absent' : 'Outside month'}</span>
            {times ? <span className="text-gray-500">• {times}</span> : <span className="text-gray-400">• No times</span>}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className={`font-medium ${inMonth ? 'text-gray-700' : 'text-gray-500'}`}>{cell.date.getDate()}</span>
        <div className="flex items-center gap-1.5">
          <span className={`h-2.5 w-2.5 rounded-full ${dotClass}`} />
          <span className="hidden sm:inline text-[10px] text-gray-500 group-hover:inline">{status === 'present' ? 'Present' : status === 'absent' ? 'Absent' : ''}</span>
        </div>
      </div>
      {times && <div className="text-[10px] text-gray-500 leading-tight line-clamp-2">{times}</div>}
    </div>
  );
}

function LegendDot({ className, label, hollow }: { className?: string; label: string; hollow?: boolean }) {
  return (
    <div className="inline-flex items-center gap-2">
      <span className={`h-2.5 w-2.5 rounded-full ${hollow ? 'ring-1 ring-gray-300 bg-transparent' : className}`} />
      <span>{label}</span>
    </div>
  );
}

function LegendHatch({ label }: { label: string }) {
  return (
    <div className="inline-flex items-center gap-2">
      <span
        className="h-2.5 w-2.5 rounded-sm"
        style={{ backgroundImage: 'repeating-linear-gradient(135deg, rgba(0,0,0,0.15) 0, rgba(0,0,0,0.15) 3px, transparent 3px, transparent 6px)' }}
      />
      <span>{label}</span>
    </div>
  );
}

// Utilities
function calcMonth(anchor: Date) {
  const y = anchor.getFullYear();
  const m = anchor.getMonth();
  const startOfMonth = new Date(y, m, 1);
  const endOfMonth = new Date(y, m + 1, 0);
  const daysInMonth = endOfMonth.getDate();
  // Monday-first: JS getDay 0..6 (Sun..Sat). Map to Mon=0..Sun=6
  const dowMon0 = (startOfMonth.getDay() + 6) % 7;
  const startOfGrid = addDays(startOfMonth, -dowMon0);
  return { startOfMonth, endOfMonth, startOfGrid, daysInMonth };
}

function buildGrid(startOfGrid: Date) {
  const weeks: GridCell[][] = [];
  for (let w = 0; w < 6; w++) {
    const row: GridCell[] = [];
    for (let d = 0; d < 7; d++) {
      const date = addDays(startOfGrid, w * 7 + d);
      row.push({ date, ymd: toYMD(date) });
    }
    weeks.push(row);
  }
  return weeks;
}

function addDays(d: Date, days: number) {
  const nd = new Date(d);
  nd.setDate(nd.getDate() + days);
  return nd;
}

function stripTime(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function toYMD(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function isSameDate(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isWeekend(d: Date) {
  const day = d.getDay(); // 0 Sun .. 6 Sat
  return day === 0 || day === 6;
}

function fmtTime(iso: string | null | undefined) {
  if (!iso) return '';
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function formatDuration(startIso?: string | null, endIso?: string | null) {
  if (!startIso || !endIso) return '';
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return '';
  const mins = Math.round((end - start) / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function minutesBetween(startIso?: string | null, endIso?: string | null): number | null {
  if (!startIso || !endIso) return null;
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;
  return Math.round((end - start) / 60000);
}

function formatMinutes(mins?: number | null): string {
  if (!mins || mins <= 0) return '';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function computeTotalWorked(rows: DailyAttendanceRowDTO[]): number {
  if (!rows || rows.length === 0) return 0;
  let total = 0;
  for (const r of rows) {
    const base = minutesBetween(r.clockIn || r.checkIn, r.clockOut || r.checkOut) || 0;
    const br = r.breakIn && r.breakOut ? (minutesBetween(r.breakIn, r.breakOut) || 0) : 0;
    total += Math.max(0, base - br);
  }
  return total;
}

async function resolveEmpId(userId?: string | null): Promise<number | null> {
  const n = Number(userId);
  if (Number.isFinite(n) && n > 0) return n;
  try {
    const profile = await apiGetProfile();
    const emp = Number(profile.empCode);
    if (Number.isFinite(emp) && emp > 0) return emp;
  } catch {}
  return null;
}

interface GridCell {
  date: Date;
  ymd: string;
}

function computeSummary(map: Record<string, DailyAttendanceDTO | null>, startOfMonth: Date, daysInMonth: number) {
  let present = 0;
  let absent = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const ymd = toYMD(new Date(startOfMonth.getFullYear(), startOfMonth.getMonth(), d));
    const rec = map[ymd];
    if (rec && rec.rows && rec.rows.length > 0) {
      const r = rec.rows[0];
      if (r.present) present++; else absent++;
    } else {
      absent++;
    }
  }
  return { present, absent };
}
