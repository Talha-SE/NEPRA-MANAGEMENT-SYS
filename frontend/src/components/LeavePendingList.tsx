import { useEffect, useState } from 'react';
import { listPending, type LeaveRequest, updateStatus } from '../lib/leaveStore';
import { useAuth } from '../context/AuthContext';

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
  const [items, setItems] = useState<LeaveRequest[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  function refresh() {
    setItems(listPending());
  }

  useEffect(() => {
    refresh();
  }, []);

  async function decide(id: string, status: 'approved' | 'rejected') {
    if (!user) return;
    setLoadingId(id);
    try {
      updateStatus(id, status, { reviewerId: Number(user.id), reviewerName: `${user.firstName} ${user.lastName}`.trim() || user.email });
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
                <th className="px-3 py-2 border-b bg-slate-50 font-medium">Employee</th>
                <th className="px-3 py-2 border-b bg-slate-50 font-medium">Type</th>
                <th className="px-3 py-2 border-b bg-slate-50 font-medium">From</th>
                <th className="px-3 py-2 border-b bg-slate-50 font-medium">To</th>
                <th className="px-3 py-2 border-b bg-slate-50 font-medium">Days</th>
                <th className="px-3 py-2 border-b bg-slate-50 font-medium">Submitted</th>
                <th className="px-3 py-2 border-b bg-slate-50 font-medium">Attachment</th>
                <th className="px-3 py-2 border-b bg-slate-50 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <tr key={r.id} className="border-b last:border-b-0">
                  <td className="px-3 py-2">{r.empName}</td>
                  <td className="px-3 py-2">{r.typeLabel}</td>
                  <td className="px-3 py-2 tabular-nums">{r.fromDate}</td>
                  <td className="px-3 py-2 tabular-nums">{r.toDate}</td>
                  <td className="px-3 py-2 tabular-nums">{r.days}</td>
                  <td className="px-3 py-2 text-xs text-gray-500">{new Date(r.createdAt).toLocaleString()}</td>
                  <td className="px-3 py-2">
                    {r.attachment ? (
                      r.attachment.dataUrl ? (
                        <a
                          href={r.attachment.dataUrl}
                          download={r.attachment.name}
                          className="text-xs text-brand-700 hover:underline"
                        >
                          {r.attachment.name}
                        </a>
                      ) : (
                        <span className="text-xs text-gray-600">{r.attachment.name} ({Math.round(r.attachment.size/1024)} KB)</span>
                      )
                    ) : (
                      <span className="text-xs text-gray-400">None</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <StatusAction
                      loading={loadingId === r.id}
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
