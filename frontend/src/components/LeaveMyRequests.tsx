import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { listByEmployee, type LeaveRequest } from '../lib/leaveStore';

function StatusBadge({ s }: { s: LeaveRequest['status'] }) {
  const map: Record<LeaveRequest['status'], string> = {
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
  const [items, setItems] = useState<LeaveRequest[]>([]);

  function refresh() {
    if (!user) return;
    setItems(listByEmployee(Number(user.id)));
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
                <th className="px-3 py-2 border-b bg-slate-50 font-medium">Reviewed</th>
              </tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <tr key={r.id} className="border-b last:border-b-0">
                  <td className="px-3 py-2">{r.typeLabel}</td>
                  <td className="px-3 py-2 tabular-nums">{r.fromDate}</td>
                  <td className="px-3 py-2 tabular-nums">{r.toDate}</td>
                  <td className="px-3 py-2 tabular-nums">{r.days}</td>
                  <td className="px-3 py-2"><StatusBadge s={r.status} /></td>
                  <td className="px-3 py-2 text-xs text-gray-500">{r.reviewedAt ? new Date(r.reviewedAt).toLocaleString() : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
