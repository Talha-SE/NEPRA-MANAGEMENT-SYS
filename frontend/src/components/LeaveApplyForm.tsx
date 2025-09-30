import { useMemo, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiCreateLeaveRequest, apiGetLeaveSummary, type LeaveRequestRowDTO } from '../lib/api';
import { SAMPLE_GROUPS, type LeaveTypeItem } from './LeaveDashboard';
import DatePicker from './DatePicker';

export default function LeaveApplyForm({ onSubmitted }: { onSubmitted?: (r: LeaveRequestRowDTO) => void }) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [typeKey, setTypeKey] = useState('cl');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [reason, setReason] = useState('');
  const [contact, setContact] = useState('');
  const [alternate, setAlternate] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [insufficientOpen, setInsufficientOpen] = useState(false);
  const [insufficientInfo, setInsufficientInfo] = useState<{ available: number; requested: number } | null>(null);

  const options: { key: string; label: string }[] = useMemo(() => {
    const arr: { key: string; label: string }[] = [];
    for (const g of SAMPLE_GROUPS) {
      for (const it of g.items) arr.push({ key: it.key, label: it.label });
    }
    return arr;
  }, []);

  const typeLabel = useMemo(() => options.find(o => o.key === typeKey)?.label || 'Leave', [options, typeKey]);

  const isELType = (label: string): boolean => {
    return [
      'Leave Not Due (LND)',
      'Study Leave',
      'Ex-Pakistan Leave',
      'Leave Preparatory to Retirement (LPR)',
      'Medical Leave',
      'Earned Leave',
    ].includes(label);
  };

  function countDays(a: string, b: string) {
    if (!a || !b) return 0;
    const d1 = new Date(a);
    const d2 = new Date(b);
    if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return 0;
    const ms = d2.getTime() - d1.getTime();
    const days = Math.floor(ms / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(0, days);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!user) { setError('You must be logged in'); return; }
    if (!typeKey || !from || !to) { setError('Please fill all required fields'); return; }
    if (!reason.trim()) { setError('Reason is required'); return; }
    if (!contact.trim()) { setError('Contact number during leave is required'); return; }
    if (!alternate.trim()) { setError('Name of Alternate Officer/Official is required'); return; }
    if (!file) { setError('Attachment is required'); return; }
    if (new Date(to) < new Date(from)) { setError('End date must be after start date'); return; }
    const days = countDays(from, to);

    // Client-side check for Earned Leave balance where applicable
    if (isELType(typeLabel)) {
      try {
        const rows = await apiGetLeaveSummary(Number(user.id));
        const el = rows.find(r => r.leave_type === 'Earned Leave');
        const available = Math.max(0, Number(el?.available ?? 0));
        if (days > available) {
          setInsufficientInfo({ available, requested: days });
          setInsufficientOpen(true);
          return; // stop submission
        }
      } catch {}
    }
    setSubmitting(true);
    try {
      // Read attachment as base64 (data URL). Limit to ~2 MB for request size.
      let attachmentBase64: string | null = null;
      const maxSize = 2 * 1024 * 1024; // 2MB
      if (file && file.size <= maxSize) {
        attachmentBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error('Failed to read file'));
          reader.readAsDataURL(file);
        });
      }

      const req = await apiCreateLeaveRequest({
        empId: Number(user.id),
        leaveType: typeLabel,
        startDate: from,
        endDate: to,
        contactNumber: contact.trim(),
        alternateOfficerName: alternate.trim(),
        reason: reason.trim(),
        attachmentBase64,
      });
      setSuccess('Request submitted');
      setReason('');
      setFrom('');
      setTo('');
      setTypeKey('cl');
      setFile(null);
      setContact('');
      setAlternate('');
      if (onSubmitted) onSubmitted(req);
    } catch (e: any) {
      const data = e?.response?.data;
      if (data && data.code === 'INSUFFICIENT_EL') {
        const available = Number(data.available ?? 0);
        const requested = Number(data.requested ?? 0);
        setInsufficientInfo({ available, requested });
        setInsufficientOpen(true);
        return;
      }
      setError('Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative overflow-hidden rounded-4xl border border-emerald-200/60 bg-gradient-to-br from-white via-emerald-50/70 to-white p-6 shadow-[0_32px_90px_-55px_rgba(15,64,45,0.35)]">
      <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at top right, rgba(16,185,129,0.12), transparent 55%), radial-gradient(circle at bottom left, rgba(45,212,191,0.18), transparent 60%)' }} aria-hidden />
      <div className="relative z-10 space-y-5">
      {/* Insufficient EL Popup */}
      {insufficientOpen && insufficientInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="relative w-full max-w-md rounded-xl border border-rose-300 bg-white p-4 shadow-xl">
            <button
              type="button"
              className="absolute right-2 top-2 text-slate-600 hover:text-black"
              aria-label="Close"
              onClick={() => setInsufficientOpen(false)}
            >
              ✕
            </button>
            <div className="text-base font-semibold text-rose-700">Insufficient Earned Leave</div>
            <div className="mt-2 text-sm text-slate-800">
              You do not have enough available Earned Leave balance for this request.
            </div>
            <div className="mt-2 text-sm text-slate-900">
              Available: <b className="tabular-nums">{insufficientInfo.available}</b> · Requested: <b className="tabular-nums">{insufficientInfo.requested}</b>
            </div>
            <div className="mt-3 text-right">
              <button className="btn btn-secondary" onClick={() => setInsufficientOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-800">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Apply for Leave
          </div>
          <div>
            <h3 className="text-xl font-semibold text-slate-900">Submit a request for approval</h3>
            <p className="text-sm text-slate-600">Provide scheduling details, a clear rationale, and supporting documentation.</p>
          </div>
        </div>
        {error && <div className="rounded-3xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 shadow-sm">{error}</div>}
        {success && <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 shadow-sm">{success}</div>}
        <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Leave Type <span className="text-rose-600">*</span></span>
            <select
            className="w-full rounded-2xl border border-emerald-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
            value={typeKey}
            onChange={(e) => setTypeKey(e.target.value)}
          >
            {options.map(o => (
              <option key={o.key} value={o.key}>{o.label}</option>
            ))}
          </select>
          </label>
          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">From <span className="text-rose-600">*</span></span>
          <DatePicker
            value={from}
            onChange={setFrom}
            ariaLabel="From date"
            placeholder="Select start date"
            className="w-full rounded-2xl border border-emerald-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
          />
          </label>
          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">To <span className="text-rose-600">*</span></span>
          <DatePicker
            value={to}
            onChange={setTo}
            ariaLabel="To date"
            placeholder="Select end date"
            className="w-full rounded-2xl border border-emerald-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
          />
          </label>
          <label className="sm:col-span-2 grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Reason <span className="text-rose-600">*</span></span>
          <textarea
            className="min-h-[120px] w-full rounded-2xl border border-emerald-200 bg-white px-3 py-3 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Provide reason for leave"
            aria-required="true"
          />
          </label>
          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Contact No. during Leave <span className="text-rose-600">*</span></span>
          <input
            type="tel"
            className="w-full rounded-2xl border border-emerald-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder="e.g. +92 300 1234567"
            aria-required="true"
          />
          </label>
          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Name of Alternate Officer/Official <span className="text-rose-600">*</span></span>
          <input
            type="text"
            className="w-full rounded-2xl border border-emerald-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
            value={alternate}
            onChange={(e) => setAlternate(e.target.value)}
            placeholder="Enter alternate officer/official name"
            aria-required="true"
          />
          </label>
          <div className="sm:col-span-2 grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Attachment <span className="text-rose-600">*</span></span>
            <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
              onClick={() => fileInputRef.current?.click()}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 15V8a4 4 0 00-8 0v9a3 3 0 01-6 0V7" />
              </svg>
              {file ? 'Change Attachment' : 'Upload Attachment'}
            </button>
            {file && (
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs text-emerald-700 shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-3.5 w-3.5">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 15V8a4 4 0 00-8 0v9a3 3 0 0-6 0V7" />
                </svg>
                <span className="truncate max-w-[200px]" title={file.name}>{file.name}</span>
                <span className="text-emerald-700">{Math.round(file.size/1024)} KB</span>
                <button type="button" className="ml-1 text-emerald-700 hover:text-rose-600" onClick={() => setFile(null)} aria-label="Remove attachment">✕</button>
              </span>
            )}
            </div>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => setFile(e.target.files && e.target.files[0] ? e.target.files[0] : null)}
            accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.xls,.xlsx,.txt"
            aria-required="true"
          />
        </div>
        <div className="sm:col-span-2">
          <button className="inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 disabled:opacity-60" disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit Request'}
          </button>
        </div>
        </form>
      </div>
    </div>
  );
}
