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
    <div className="relative overflow-hidden rounded-3xl border border-white/70 bg-white/95 p-6 shadow-[0_25px_70px_-45px_rgba(15,64,45,0.4)] backdrop-blur">
      <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white via-emerald-50/70 to-white opacity-75" aria-hidden />
      <div className="relative z-10 space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-800">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Pending approvals
            </div>
            <h3 className="text-xl font-semibold text-slate-900">Pending Leave Requests</h3>
            <p className="text-sm text-slate-600">Review submissions, monitor durations, and respond in a single streamlined view.</p>
          </div>
          <button
            className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-wide text-emerald-700 shadow-sm transition hover:bg-emerald-50"
            onClick={refresh}
            type="button"
          >
            Refresh list
          </button>
        </div>

        {items.length === 0 ? (
          <div className="rounded-2xl border border-emerald-100 bg-white/80 px-4 py-6 text-sm text-emerald-700">
            All caught up—no pending requests right now.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-white/60 bg-white/95 shadow-sm">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-slate-600 uppercase tracking-wide text-xs">
                  <th className="px-4 py-3 bg-emerald-50/80 font-semibold text-emerald-800">Employee ID</th>
                  <th className="px-4 py-3 bg-emerald-50/80 font-semibold text-emerald-800">Type</th>
                  <th className="px-4 py-3 bg-emerald-50/80 font-semibold text-emerald-800">From</th>
                  <th className="px-4 py-3 bg-emerald-50/80 font-semibold text-emerald-800">To</th>
                  <th className="px-4 py-3 bg-emerald-50/80 font-semibold text-emerald-800">Days</th>
                  <th className="px-4 py-3 bg-emerald-50/80 font-semibold text-emerald-800">Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((r, idx) => (
                  <tr
                    key={r.id}
                    className={`transition hover:bg-emerald-50/40 ${idx % 2 === 0 ? 'bg-white' : 'bg-emerald-50/20'} border-b border-emerald-100 last:border-b-0`}
                  >
                    <td className="px-4 py-3 text-slate-700">{r.emp_id}</td>
                    <td className="px-4 py-3 text-slate-700">{r.leave_type}</td>
                    <td className="px-4 py-3 tabular-nums text-slate-700">{String(r.start_date).slice(0, 10)}</td>
                    <td className="px-4 py-3 tabular-nums text-slate-700">{String(r.end_date).slice(0, 10)}</td>
                    <td className="px-4 py-3 tabular-nums text-slate-700">{r.total_days ?? '-'}</td>
                    <td className="px-4 py-3">
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
