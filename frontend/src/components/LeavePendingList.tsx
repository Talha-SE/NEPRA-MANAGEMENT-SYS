import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiListPendingLeaves, apiUpdateLeaveStatus, assetUrl, type LeaveRequestRowDTO } from '../lib/api';

export default function LeavePendingList() {
  const { user } = useAuth();
  const [items, setItems] = useState<LeaveRequestRowDTO[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [remarks, setRemarks] = useState<Record<number, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [viewId, setViewId] = useState<number | null>(null);

  function refresh() {
    setError(null);
    apiListPendingLeaves()
      .then((data) => {
        setItems(data);
        const mapped: Record<number, string> = {};
        for (const row of data) {
          if (row.hr_remarks) mapped[row.id] = row.hr_remarks;
        }
        setRemarks(mapped);
      })
      .catch(() => {
        setItems([]);
        setRemarks({});
        setError('Unable to load pending leave requests right now.');
      });
  }

  useEffect(() => {
    refresh();
  }, []);

  async function decide(id: number, status: 'approved' | 'rejected') {
    if (!user) return;
    setLoadingId(String(id));
    setError(null);
    const input = (remarks[id] ?? '').trim();
    if (input.length === 0) {
      setLoadingId(null);
      setError('Please enter HR remarks before updating a leave request.');
      return;
    }
    try {
      const remarkToSend = input;
      await apiUpdateLeaveStatus(id, status, remarkToSend);
      setRemarks((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      refresh();
      setViewId(null);
    } catch (e: any) {
      const message = e?.response?.data?.message || 'Failed to update status';
      setError(message);
    } finally {
      setLoadingId(null);
    }
  }

  const selected = useMemo(() => items.find(i => i.id === viewId) || null, [items, viewId]);

  function openAttachment(id: number) {
    const url = assetUrl(`/api/leaves/${id}/attachment`);
    if (!url) return;
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.download = '';
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  return (
    <div className="relative overflow-hidden rounded-4xl border border-emerald-400/30 bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-700 p-10 shadow-[0_35px_120px_-55px_rgba(6,78,59,0.75)]">
      <div className="absolute inset-0 opacity-70" style={{ backgroundImage: 'radial-gradient(circle at top right, rgba(255,255,255,0.28), transparent 48%), radial-gradient(circle at center left, rgba(16,185,129,0.25), transparent 55%), linear-gradient(135deg, rgba(59,130,246,0.22) 0%, transparent 55%)' }} aria-hidden />
      <div className="relative z-10 space-y-7">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/25 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" /> Pending approvals
            </div>
            <div className="space-y-1.5">
              <h3 className="text-3xl font-semibold text-white drop-shadow-sm">Pending Leave Requests</h3>
              <p className="text-sm text-emerald-100/80 max-w-2xl">Review submissions, monitor durations, and respond swiftly with consistent HR governance.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200/60 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-emerald-100 shadow-sm backdrop-blur">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-4 w-4"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 5h6l2 3h10m-3 9a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              {items.length} pending
            </div>
            <button
              className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow-[0_10px_30px_-18px_rgba(15,118,110,0.9)] transition hover:bg-white/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-100"
              onClick={refresh}
              type="button"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-4 w-4"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 4v6h6M20 20v-6h-6M5 19a9 9 0 0114-10" /></svg>
              Refresh list
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 shadow-sm">
            {error}
          </div>
        )}

        {items.length === 0 ? (
          <div className="rounded-3xl border border-emerald-200/40 bg-white/15 px-6 py-10 text-sm text-emerald-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur">
            All caught up—no pending requests right now.
          </div>
        ) : (
          <div className="overflow-hidden rounded-3xl border border-white/30 bg-white/95 shadow-[0_28px_90px_-58px_rgba(12,74,58,0.7)]">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-emerald-800">
                  <th className="px-5 py-3 bg-emerald-50 font-semibold">Employee</th>
                  <th className="px-5 py-3 bg-emerald-50 font-semibold">Type</th>
                  <th className="px-5 py-3 bg-emerald-50 font-semibold">From</th>
                  <th className="px-5 py-3 bg-emerald-50 font-semibold">To</th>
                  <th className="px-5 py-3 bg-emerald-50 font-semibold">Days</th>
                  <th className="px-5 py-3 bg-emerald-50 font-semibold text-right">Review</th>
                </tr>
              </thead>
              <tbody>
                {items.map((r, idx) => (
                  <tr
                    key={r.id}
                    className={`text-slate-700 transition-colors hover:bg-emerald-50/50 ${idx % 2 === 0 ? 'bg-white' : 'bg-emerald-50/25'} border-t border-emerald-100 first:border-t-0`}
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
                      <button
                        className="inline-flex items-center gap-2 rounded-full border border-emerald-200/70 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-800 shadow-sm hover:bg-emerald-50"
                        onClick={() => setViewId(r.id)}
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <LeaveDetailsModal
        item={selected}
        isOpen={!!selected}
        onClose={() => setViewId(null)}
        remarks={remarks}
        setRemarks={setRemarks}
        loadingId={loadingId}
        onApprove={(id) => decide(id, 'approved')}
        onReject={(id) => decide(id, 'rejected')}
        onOpenAttachment={openAttachment}
      />
    </div>
  );
}

// Modal dialog for reviewing full leave details
function LeaveDetailsModal({
  item,
  isOpen,
  onClose,
  remarks,
  setRemarks,
  loadingId,
  onApprove,
  onReject,
  onOpenAttachment,
}: {
  item: LeaveRequestRowDTO | null;
  isOpen: boolean;
  onClose: () => void;
  remarks: Record<number, string>;
  setRemarks: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  loadingId: string | null;
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
  onOpenAttachment: (id: number) => void;
}) {
  if (!item || !isOpen) return null;
  const rid = item.id;
  const isBusy = loadingId === String(rid);
  const remarkValue = remarks[rid] ?? '';
  const disableActions = remarkValue.trim().length === 0 || isBusy;

  const closeOnBackdrop = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 py-6" onClick={closeOnBackdrop}>
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-[70] w-full max-w-3xl overflow-hidden rounded-3xl border border-emerald-100 bg-white shadow-[0_40px_120px_-60px_rgba(15,118,110,0.65)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-emerald-100/60 px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-emerald-500">Leave request</p>
            <h4 className="text-xl font-semibold text-slate-900">Request #{rid}</h4>
          </div>
          <button
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600 shadow-sm transition hover:bg-slate-50"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-6 py-6 space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Info label="Employee" value={String(item.emp_id)} />
            <Info label="Leave type" value={item.leave_type || '—'} />
            <Info label="From" value={String(item.start_date).slice(0, 10)} />
            <Info label="To" value={String(item.end_date).slice(0, 10)} />
            <Info label="Days" value={String(item.total_days ?? '—')} />
            <Info label="Contact #" value={item.contact_number || '—'} />
            <Info label="Alternate officer" value={item.alternate_officer || '—'} />
          </div>

          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-700 mb-1">Reason</div>
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-3 text-sm text-slate-800 whitespace-pre-wrap">
              {item.reason?.trim() || '—'}
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold ${
                item.attachment_present ? 'border border-emerald-300 bg-emerald-50 text-emerald-700' : 'border border-slate-200 bg-slate-50 text-slate-600'
              }`}
            >
              {item.attachment_present ? 'Attachment present' : 'No file attached'}
            </div>
            <button
              className="inline-flex items-center justify-center rounded-full border border-emerald-300 bg-emerald-600/90 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-white shadow transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-emerald-300"
              disabled={!item.attachment_present}
              onClick={() => onOpenAttachment(rid)}
            >
              Open Attachment
            </button>
          </div>

          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-700 mb-1">HR remarks</div>
            <textarea
              className="w-full rounded-2xl border border-emerald-300/80 bg-white px-3 py-3 text-sm text-slate-900 shadow-[0_18px_45px_-28px_rgba(16,185,129,0.6)] transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-300/70"
              rows={3}
              placeholder="Add remarks (required)"
              value={remarkValue}
              onChange={(e) => setRemarks((prev) => ({ ...prev, [rid]: e.target.value }))}
            />
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-emerald-100/60 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-xs text-slate-500">Approve or reject after reviewing the details.</span>
          <div className="inline-flex items-center gap-2">
            <button
              className="inline-flex items-center justify-center rounded-full border border-emerald-200/70 bg-white/90 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700 shadow-sm transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-100 disabled:cursor-not-allowed disabled:border-emerald-100 disabled:text-emerald-300"
              onClick={() => onReject(rid)}
              disabled={disableActions}
              title={remarkValue.trim().length === 0 ? 'Enter HR remarks before updating status' : undefined}
            >
              {isBusy ? '...' : 'Reject'}
            </button>
            <button
              className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-white shadow-[0_14px_30px_-18px_rgba(16,185,129,0.8)] transition hover:bg-emerald-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-200 disabled:cursor-not-allowed disabled:bg-emerald-500/40"
              onClick={() => onApprove(rid)}
              disabled={disableActions}
              title={remarkValue.trim().length === 0 ? 'Enter HR remarks before updating status' : undefined}
            >
              {isBusy ? '...' : 'Approve'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-700 mb-1">{label}</div>
      <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm">{value}</div>
    </div>
  );
}
