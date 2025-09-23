import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiListPendingLeaves, apiUpdateLeaveStatus, type LeaveRequestRowDTO } from '../lib/api';

function StatusAction({ onApprove, onReject, loading }: { onApprove: () => void; onReject: () => void; loading?: boolean }) {
  return (
    <div className="inline-flex items-center gap-2">
      <button className="btn btn-primary px-3 py-1.5" onClick={onApprove} disabled={!!loading}>{loading ? '...' : 'Approve'}</button>
      <button className="btn btn-secondary px-3 py-1.5" onClick={onReject} disabled={!!loading}>Reject</button>
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
    <div className="rounded-xl border border-slate-800 bg-white p-4">
      <div className="mb-3">
        <div className="text-base font-semibold text-slate-900">Pending Leave Requests</div>
        <div className="text-xs text-slate-800">Review and take action on new requests</div>
      </div>
      {items.length === 0 ? (
        <div className="text-sm text-slate-800">No pending requests.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-slate-800">
                <th className="px-3 py-2 border-b border-slate-800 bg-slate-50 font-semibold">Employee ID</th>
                <th className="px-3 py-2 border-b border-slate-800 bg-slate-50 font-semibold">Type</th>
                <th className="px-3 py-2 border-b border-slate-800 bg-slate-50 font-semibold">From</th>
                <th className="px-3 py-2 border-b border-slate-800 bg-slate-50 font-semibold">To</th>
                <th className="px-3 py-2 border-b border-slate-800 bg-slate-50 font-semibold">Days</th>
                <th className="px-3 py-2 border-b border-slate-800 bg-slate-50 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <tr key={r.id} className="border-b border-slate-800/60 last:border-b-0">
                  <td className="px-3 py-2">{r.emp_id}</td>
                  <td className="px-3 py-2">{r.leave_type}</td>
                  <td className="px-3 py-2 tabular-nums">{String(r.start_date).slice(0,10)}</td>
                  <td className="px-3 py-2 tabular-nums">{String(r.end_date).slice(0,10)}</td>
                  <td className="px-3 py-2 tabular-nums">{r.total_days ?? '-'}</td>
                  <td className="px-3 py-2">
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
  );
}
