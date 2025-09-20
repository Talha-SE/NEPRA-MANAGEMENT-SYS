import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiListMyLeaves, type LeaveRequestDTO } from '../lib/api';

function StatusBadge({ s }: { s: LeaveRequestDTO['leave_status'] }) {
  const map: Record<LeaveRequestDTO['leave_status'], string> = {
    pending: 'border-amber-700 text-amber-800',
    approved: 'border-emerald-700 text-emerald-800',
    rejected: 'border-rose-700 text-rose-800',
  };
  const label = s[0].toUpperCase() + s.slice(1);
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border-2 px-2.5 py-0.5 text-xs ${map[s]}`}>{label}</span>
  );
}

export default function LeaveMyRequests() {
  const { user } = useAuth();
  const [items, setItems] = useState<LeaveRequestDTO[]>([]);

  function refresh() {
    if (!user) return;
    apiListMyLeaves(Number(user.id)).then(setItems).catch(() => setItems([]));
  }

  useEffect(() => {
    refresh();
  }, [user?.id]);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="mb-3">
        <div className="text-base font-semibold">My Leave Requests</div>
        <div className="text-xs text-gray-600">Statuses update when HR reviews your request</div>
      </div>
      {items.length === 0 ? (
        <div className="text-sm text-gray-600">No requests yet.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-700">
                <th className="px-3 py-2 border-b bg-slate-50 font-medium">Type</th>
                <th className="px-3 py-2 border-b bg-slate-50 font-medium">From</th>
                <th className="px-3 py-2 border-b bg-slate-50 font-medium">To</th>
                <th className="px-3 py-2 border-b bg-slate-50 font-medium">Days</th>
                <th className="px-3 py-2 border-b bg-slate-50 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <tr key={r.id} className="border-b last:border-b-0">
                  <td className="px-3 py-2">{r.leave_type}</td>
                  <td className="px-3 py-2 tabular-nums">{r.start_date}</td>
                  <td className="px-3 py-2 tabular-nums">{r.end_date}</td>
                  <td className="px-3 py-2 tabular-nums">{r.total_days}</td>
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
