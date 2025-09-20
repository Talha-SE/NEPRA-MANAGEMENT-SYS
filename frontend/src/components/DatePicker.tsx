import { useEffect, useMemo, useRef, useState } from 'react';

export default function DatePicker({ value, onChange, placeholder, ariaLabel, className }: { value: string; onChange: (v: string) => void; placeholder?: string; ariaLabel?: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const [anchorMonth, setAnchorMonth] = useState<Date>(() => parseYMD(value) ?? stripTime(new Date()));
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const popRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!value) return;
    const d = parseYMD(value);
    if (d) setAnchorMonth(new Date(d.getFullYear(), d.getMonth(), 1));
  }, [value]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!open) return;
      const t = e.target as Node;
      if (popRef.current && !popRef.current.contains(t) && btnRef.current && !btnRef.current.contains(t)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const monthLabel = useMemo(() => new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(anchorMonth), [anchorMonth]);

  const grid = useMemo(() => buildGrid(anchorMonth), [anchorMonth]);

  function pick(d: Date) {
    onChange(toYMD(d));
    setOpen(false);
  }

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        className={`${className || 'input'} flex items-center justify-between`}
        aria-label={ariaLabel || 'Choose date'}
        onClick={() => setOpen((o) => !o)}
      >
        <span className={`tabular-nums ${value ? 'text-slate-900' : 'text-slate-700'}`}>{value || (placeholder || 'Select date')}</span>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-4 w-4 text-slate-800">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" strokeWidth="1.5" />
          <path d="M16 2v4M8 2v4M3 10h18" strokeWidth="1.5" />
        </svg>
      </button>

      {/* Popover */}
      <div
        ref={popRef}
        className={`absolute z-50 mt-2 w-72 origin-top right-0 rounded-xl border border-slate-800 bg-white p-3 shadow-xl transition-transform transition-opacity duration-200 ease-out ${
          open ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
        }`}
        role="dialog"
        aria-hidden={!open}
      >
        <div className="flex items-center justify-between mb-2">
          <button
            className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-slate-800 hover:bg-white text-slate-800"
            onClick={() => setAnchorMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
            aria-label="Previous month"
            title="Previous month"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="text-sm font-medium">{monthLabel}</div>
          <button
            className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-slate-800 hover:bg-white text-slate-800"
            onClick={() => setAnchorMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
            aria-label="Next month"
            title="Next month"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-[10px] text-slate-800 mb-1">
          {['Su','Mo','Tu','We','Th','Fr','Sa'].map((d) => (
            <div key={d} className="text-center">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {grid.map((day) => {
            const isCurrentMonth = day.getMonth() === anchorMonth.getMonth();
            const isSelected = value ? isSameDate(day, parseYMD(value)!) : false;
            const isToday = isSameDate(day, stripTime(new Date()));
            return (
              <button
                key={day.toISOString()}
                type="button"
                className={`h-9 rounded-md text-sm tabular-nums transition-colors ${
                  isSelected
                    ? 'bg-brand-600 text-white'
                    : isToday
                    ? 'border border-brand-800 text-brand-800 bg-brand-50'
                    : isCurrentMonth
                    ? 'hover:bg-white text-slate-900'
                    : 'text-slate-700 hover:bg-white'
                }`}
                onClick={() => pick(day)}
              >
                {day.getDate()}
              </button>
            );
          })}
        </div>
        <div className="mt-2 flex items-center justify-between">
          <button type="button" className="text-xs text-slate-800 hover:text-slate-900" onClick={() => setAnchorMonth(stripTime(new Date()))}>Today</button>
          <button type="button" className="text-xs text-brand-700 hover:underline" onClick={() => setOpen(false)}>Close</button>
        </div>
      </div>
    </div>
  );
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

function parseYMD(s?: string | null): Date | null {
  if (!s) return null;
  const m = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(s);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const dt = new Date(y, mo, d);
  if (dt.getFullYear() === y && dt.getMonth() === mo && dt.getDate() === d) return dt;
  return null;
}

function isSameDate(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function buildGrid(anchor: Date): Date[] {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const start = new Date(first);
  start.setDate(1 - first.getDay()); // start from Sunday on the previous/this week
  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(d);
  }
  return days;
}
