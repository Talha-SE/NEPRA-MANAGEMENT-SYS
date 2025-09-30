import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiListPendingLeaves, apiUpdateLeaveStatus, type LeaveRequestRowDTO } from '../lib/api';

function StatusAction({ onApprove, onReject, loading }: { onApprove: () => void; onReject: () => void; loading?: boolean }) {
  return (
    <div className="inline-flex items-center gap-2">
      <button
        className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-3.5 py-1.75 text-xs font-semibold uppercase tracking-wide text-white shadow-sm transition hover:bg-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
        onClick={onApprove}
        disabled={!!loading}
      >
        {loading ? '...' : 'Approve'}
      </button>
      <button
        className="inline-flex items-center justify-center rounded-xl border border-emerald-200 bg-white px-3.5 py-1.75 text-xs font-semibold uppercase tracking-wide text-emerald-700 shadow-sm transition hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
        onClick={onReject}
        disabled={!!loading}
      >
        Reject
      </button>
    </div>
  );
}

export default function LeavePendingList() {
  const { user } = useAuth();
  const [items, setItems] = useState<LeaveRequestRowDTO[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  function refresh() {
    apiListPendingLeaves().then(setItems).catch(() => setItems([]));
  }

  useEffect(() => {
    refresh();
  }, []);

  async function decide(id: number, status: 'approved' | 'rejected') {
    if (!user) return;
    setLoadingId(String(id));
    try {
      await apiUpdateLeaveStatus(id, status);
      refresh();
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div className="relative overflow-hidden rounded-4xl border border-emerald-500/20 bg-gradient-to-br from-white via-emerald-50/80 to-white p-8 shadow-[0_40px_100px_-60px_rgba(14,85,55,0.55)]">
      <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at top left, rgba(16,185,129,0.15), transparent 45%), radial-gradient(circle at bottom right, rgba(45,212,191,0.18), transparent 55%)' }} aria-hidden />
      <div className="relative z-10 space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-800">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Pending approvals
            </div>
            <div>
              <h3 className="text-2xl font-semibold text-slate-900">Pending Leave Requests</h3>
              <p className="text-sm text-slate-600 max-w-2xl">Review submissions, monitor durations, and respond swiftly with consistent HR governance.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-white/90 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-emerald-700 shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-4 w-4"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 5h6l2 3h10m-3 9a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              {items.length} pending
            </div>
            <button
              className="inline-flex items-center gap-2 rounded-2xl border border-emerald-400/60 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-emerald-700 shadow-sm transition hover:bg-emerald-50"
              onClick={refresh}
              type="button"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-4 w-4"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 4v6h6M20 20v-6h-6M5 19a9 9 0 0114-10" /></svg>
              Refresh list
            </button>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="rounded-3xl border border-emerald-100 bg-white/85 px-6 py-8 text-sm text-emerald-700 shadow-inner">
            All caught up—no pending requests right now.
          </div>
        ) : (
          <div className="overflow-hidden rounded-3xl border border-white/60 bg-white/95 shadow-[0_24px_70px_-55px_rgba(14,85,55,0.45)]">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-emerald-700">
                  <th className="px-5 py-3 bg-emerald-50/70 font-semibold">Employee</th>
                  <th className="px-5 py-3 bg-emerald-50/70 font-semibold">Type</th>
                  <th className="px-5 py-3 bg-emerald-50/70 font-semibold">From</th>
                  <th className="px-5 py-3 bg-emerald-50/70 font-semibold">To</th>
                  <th className="px-5 py-3 bg-emerald-50/70 font-semibold">Days</th>
                  <th className="px-5 py-3 bg-emerald-50/70 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((r, idx) => (
                  <tr
                    key={r.id}
                    className={`text-slate-700 transition hover:bg-emerald-50/40 ${idx % 2 === 0 ? 'bg-white' : 'bg-emerald-50/20'} border-t border-emerald-100 first:border-t-0`}
                  >
                    <td className="px-5 py-3 font-medium">{r.emp_id}</td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100/80 px-3 py-1 text-xs font-semibold text-emerald-700">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-3.5 w-3.5"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7h8M6 12h12M9 17h6" /></svg>
                        {r.leave_type}
                      </span>
                    </td>
                    <td className="px-5 py-3 tabular-nums">{String(r.start_date).slice(0, 10)}</td>
                    <td className="px-5 py-3 tabular-nums">{String(r.end_date).slice(0, 10)}</td>
                    <td className="px-5 py-3 tabular-nums">{r.total_days ?? '-'}</td>
                    <td className="px-5 py-3 text-right">
                      <StatusAction
                        loading={loadingId === String(r.id)}
                        onApprove={() => decide(r.id, 'approved')}
                        onReject={() => decide(r.id, 'rejected')}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
