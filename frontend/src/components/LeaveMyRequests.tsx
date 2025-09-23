import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiListLeavesByEmployee, type LeaveRequestRowDTO } from '../lib/api';

function StatusBadge({ s }: { s: 'pending' | 'approved' | 'rejected' }) {
  const map: Record<'pending' | 'approved' | 'rejected', string> = {
    pending: 'border-amber-200 bg-amber-50 text-amber-700',
    approved: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    rejected: 'border-rose-200 bg-rose-50 text-rose-700',
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${map[s]}`}>{s[0].toUpperCase() + s.slice(1)}</span>
  );
}

export default function LeaveMyRequests() {
  const { user } = useAuth();
  const [items, setItems] = useState<LeaveRequestRowDTO[]>([]);

  function refresh() {
    if (!user) return;
    apiListLeavesByEmployee(Number(user.id)).then(setItems).catch(() => setItems([]));
  }

  useEffect(() => {
    refresh();
  }, [user?.id]);

  return (
    <div className="rounded-xl border border-slate-800 bg-white p-4">
      <div className="mb-3">
        <div className="text-base font-semibold text-slate-900">My Leave Requests</div>
        <div className="text-xs text-slate-800">Statuses update when HR reviews your request</div>
      </div>
      {items.length === 0 ? (
        <div className="text-sm text-slate-800">No requests yet.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-slate-800">
                <th className="px-3 py-2 border-b border-slate-800 bg-slate-50 font-semibold">Type</th>
                <th className="px-3 py-2 border-b border-slate-800 bg-slate-50 font-semibold">From</th>
                <th className="px-3 py-2 border-b border-slate-800 bg-slate-50 font-semibold">To</th>
                <th className="px-3 py-2 border-b border-slate-800 bg-slate-50 font-semibold">Days</th>
                <th className="px-3 py-2 border-b border-slate-800 bg-slate-50 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <tr key={r.id} className="border-b border-slate-800/60 last:border-b-0">
                  <td className="px-3 py-2">{r.leave_type}</td>
                  <td className="px-3 py-2 tabular-nums">{String(r.start_date).slice(0,10)}</td>
                  <td className="px-3 py-2 tabular-nums">{String(r.end_date).slice(0,10)}</td>
                  <td className="px-3 py-2 tabular-nums">{r.total_days ?? '-'}</td>
                  <td className="px-3 py-2"><StatusBadge s={r.leave_status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
