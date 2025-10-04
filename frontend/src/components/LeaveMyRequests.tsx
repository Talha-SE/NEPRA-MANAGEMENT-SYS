import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiListLeavesByEmployee, type LeaveRequestRowDTO } from '../lib/api';

type StatusKey = 'pending' | 'approved' | 'rejected';

function StatusBadge({ s }: { s: StatusKey }) {
  const palette: Record<StatusKey, { wrap: string; dot: string; label: string }> = {
    pending: {
      wrap: 'border-amber-200 bg-amber-50 text-amber-700',
      dot: 'bg-amber-400',
      label: 'Pending',
    },
    approved: {
      wrap: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      dot: 'bg-emerald-500',
      label: 'Approved',
    },
    rejected: {
      wrap: 'border-rose-200 bg-rose-50 text-rose-700',
      dot: 'bg-rose-400',
      label: 'Rejected',
    },
  };

  const colors = palette[s];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold tracking-wide ${colors.wrap}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${colors.dot}`} aria-hidden />
      {colors.label}
    </span>
  );
}

function SkeletonRow({ idx }: { idx: number }) {
  return (
    <div
      className="relative overflow-hidden rounded-3xl border border-emerald-100/60 bg-white/80 p-4 shadow-[0_18px_45px_-32px_rgba(16,94,49,0.4)]"
      style={{ animationDelay: `${idx * 120}ms` }}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-100/40 to-transparent animate-[pulse_2.2s_ease-in-out_infinite]" aria-hidden />
      <div className="grid gap-3 sm:grid-cols-[1.8fr_repeat(3,1fr)_1fr]">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-2 rounded-full bg-emerald-100/70" />
            <div className="h-3 rounded-full bg-emerald-50" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function LeaveMyRequests() {
  const { user } = useAuth();
  const [items, setItems] = useState<LeaveRequestRowDTO[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function refresh() {
      if (!user) {
        setItems([]);
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const data = await apiListLeavesByEmployee(Number(user.id));
        if (!cancelled) {
          setItems(data);
        }
      } catch (e) {
        if (!cancelled) {
          setItems([]);
          setError('Unable to fetch leave requests right now.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    refresh();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  return (
    <div className="space-y-3">
      {error && !loading && (
        <div className="rounded-2xl border border-rose-200/70 bg-rose-50/80 px-4 py-3 text-sm text-rose-700 shadow-sm">
          {error}
        </div>
      )}

      <div className="hidden sm:grid grid-cols-[1.8fr_repeat(3,minmax(0,1fr))_minmax(0,1fr)] items-center gap-3 px-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-600">
        <span>Type</span>
        <span>From</span>
        <span>To</span>
        <span>Days</span>
        <span>Status</span>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, idx) => (
            <SkeletonRow key={idx} idx={idx} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-3xl border border-emerald-100/70 bg-white/90 px-5 py-6 text-sm text-slate-600 shadow-[0_18px_45px_-30px_rgba(16,94,49,0.3)]">
          You have not submitted any leave requests yet. Once you apply for leave, your submissions will appear here with live status updates.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((r) => (
            <div
              key={r.id}
              className="group relative overflow-hidden rounded-3xl border border-emerald-100/80 bg-white/95 p-4 shadow-[0_18px_45px_-32px_rgba(16,94,49,0.4)] transition-transform duration-300 hover:-translate-y-1 hover:shadow-[0_28px_80px_-40px_rgba(16,94,49,0.45)]"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-emerald-300/15 opacity-0 transition-opacity duration-300 group-hover:opacity-100" aria-hidden />
              <div className="relative z-10 grid gap-4 sm:grid-cols-[1.8fr_repeat(3,minmax(0,1fr))_minmax(0,1fr)]">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-sm font-semibold text-emerald-700 shadow-inner">
                    {(r.leave_type?.[0] || 'L').toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900 truncate">{r.leave_type || '—'}</div>
                    <div className="text-xs text-slate-500 sm:hidden">Type</div>
                  </div>
                </div>

                <div className="text-sm text-slate-700 tabular-nums">
                  {String(r.start_date).slice(0, 10)}
                  <div className="text-[11px] uppercase tracking-wide text-slate-400 sm:hidden mt-1">From</div>
                </div>

                <div className="text-sm text-slate-700 tabular-nums">
                  {String(r.end_date).slice(0, 10)}
                  <div className="text-[11px] uppercase tracking-wide text-slate-400 sm:hidden mt-1">To</div>
                </div>

                <div className="text-sm font-semibold text-slate-900 tabular-nums">
                  {r.total_days ?? '—'}
                  <div className="text-[11px] uppercase tracking-wide text-slate-400 sm:hidden mt-1">Days</div>
                </div>

                <div className="flex items-center sm:justify-end">
                  <StatusBadge s={r.leave_status as StatusKey} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
