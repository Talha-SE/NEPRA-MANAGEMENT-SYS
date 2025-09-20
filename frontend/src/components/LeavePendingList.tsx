import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiListPendingLeaves, apiUpdateLeaveStatus, type LeaveRequestDTO } from '../lib/api';

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
  const [items, setItems] = useState<LeaveRequestDTO[]>([]);
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
      await apiUpdateLeaveStatus(id, status, { reviewer_id: Number(user.id), reviewer_name: `${user.firstName} ${user.lastName}`.trim() || user.email });
      refresh();
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="mb-3">
        <div className="text-base font-semibold">Pending Leave Requests</div>
        <div className="text-xs text-gray-600">Review and take action on new requests</div>
      </div>
      {items.length === 0 ? (
        <div className="text-sm text-gray-600">No pending requests.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-700">
                <th className="px-3 py-2 border-b bg-slate-50 font-medium">Emp ID</th>
                <th className="px-3 py-2 border-b bg-slate-50 font-medium">Type</th>
                <th className="px-3 py-2 border-b bg-slate-50 font-medium">From</th>
                <th className="px-3 py-2 border-b bg-slate-50 font-medium">To</th>
                <th className="px-3 py-2 border-b bg-slate-50 font-medium">Days</th>
                <th className="px-3 py-2 border-b bg-slate-50 font-medium">Status</th>
                <th className="px-3 py-2 border-b bg-slate-50 font-medium">Attachment</th>
                <th className="px-3 py-2 border-b bg-slate-50 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <tr key={r.id} className="border-b last:border-b-0">
                  <td className="px-3 py-2 tabular-nums">{r.emp_id}</td>
                  <td className="px-3 py-2">{r.leave_type}</td>
                  <td className="px-3 py-2 tabular-nums">{r.start_date}</td>
                  <td className="px-3 py-2 tabular-nums">{r.end_date}</td>
                  <td className="px-3 py-2 tabular-nums">{r.total_days}</td>
                  <td className="px-3 py-2 text-xs">{r.leave_status}</td>
                  <td className="px-3 py-2">
                    {r.attachment_name ? (
                      <span className="text-xs text-slate-800">{r.attachment_name}{r.attachment_size ? ` (${Math.round(r.attachment_size/1024)} KB)` : ''}</span>
                    ) : (
                      <span className="text-xs text-slate-700">None</span>
                    )}
                  </td>
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
