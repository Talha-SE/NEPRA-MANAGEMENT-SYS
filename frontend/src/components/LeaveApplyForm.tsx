import { useMemo, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { createRequest } from '../lib/leaveStore';
import type { LeaveRequest } from '../lib/leaveStore';
import { SAMPLE_GROUPS, type LeaveTypeItem } from './LeaveDashboard';
import DatePicker from './DatePicker';

export default function LeaveApplyForm({ onSubmitted }: { onSubmitted?: (r: LeaveRequest) => void }) {
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

  const options: { key: string; label: string }[] = useMemo(() => {
    const arr: { key: string; label: string }[] = [];
    for (const g of SAMPLE_GROUPS) {
      for (const it of g.items) arr.push({ key: it.key, label: it.label });
    }
    return arr;
  }, []);

  const typeLabel = useMemo(() => options.find(o => o.key === typeKey)?.label || 'Leave', [options, typeKey]);

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
    setSubmitting(true);
    try {
      let attachment: LeaveRequest['attachment'] | undefined = undefined;
      if (file) {
        // Try to generate a small dataURL preview for inline download (limit 500KB)
        const maxPreview = 500 * 1024;
        if (file.size <= maxPreview) {
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsDataURL(file);
          });
          attachment = { name: file.name, type: file.type, size: file.size, dataUrl };
        } else {
          attachment = { name: file.name, type: file.type, size: file.size };
        }
      }
      const req = createRequest({
        empId: Number(user.id),
        empName: `${user.firstName} ${user.lastName}`.trim() || user.email,
        typeKey,
        typeLabel,
        fromDate: from,
        toDate: to,
        days,
        reason: reason.trim(),
        contactDuringLeave: contact.trim(),
        alternateOfficerName: alternate.trim(),
        attachment,
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
    } catch (e) {
      setError('Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="mb-3">
        <div className="text-base font-semibold">Apply for Leave</div>
        <div className="text-xs text-gray-600">Submit a request for approval</div>
      </div>
      {error && <div className="mb-2 rounded border border-red-200 bg-red-50 text-red-700 p-2 text-sm">{error}</div>}
      {success && <div className="mb-2 rounded border border-emerald-200 bg-emerald-50 text-emerald-700 p-2 text-sm">{success}</div>}
      <form onSubmit={onSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="grid gap-1">
          <span className="text-sm font-medium text-gray-900">Leave Type <span className="text-rose-600">*</span></span>
          <select className="input" value={typeKey} onChange={(e) => setTypeKey(e.target.value)}>
            {options.map(o => (
              <option key={o.key} value={o.key}>{o.label}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-1">
          <span className="text-sm font-medium text-gray-900">From <span className="text-rose-600">*</span></span>
          <DatePicker value={from} onChange={setFrom} ariaLabel="From date" placeholder="Select start date" />
        </label>
        <label className="grid gap-1">
          <span className="text-sm font-medium text-gray-900">To <span className="text-rose-600">*</span></span>
          <DatePicker value={to} onChange={setTo} ariaLabel="To date" placeholder="Select end date" />
        </label>
        <label className="sm:col-span-2 grid gap-1">
          <span className="text-sm font-medium text-gray-900">Reason <span className="text-rose-600">*</span></span>
          <textarea className="input min-h-[80px]" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Provide reason for leave" aria-required="true" />
        </label>
        <label className="grid gap-1">
          <span className="text-sm font-medium text-gray-900">Contact No. during Leave <span className="text-rose-600">*</span></span>
          <input
            type="tel"
            className="input"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder="e.g. +92 300 1234567"
            aria-required="true"
          />
        </label>
        <label className="grid gap-1">
          <span className="text-sm font-medium text-gray-900">Name of Alternate Officer/Official <span className="text-rose-600">*</span></span>
          <input
            type="text"
            className="input"
            value={alternate}
            onChange={(e) => setAlternate(e.target.value)}
            placeholder="Enter alternate officer/official name"
            aria-required="true"
          />
        </label>
        <div className="sm:col-span-2 grid gap-1">
          <span className="text-sm font-medium text-gray-900">Attachment <span className="text-rose-600">*</span></span>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-400/40"
              onClick={() => fileInputRef.current?.click()}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 15V8a4 4 0 00-8 0v9a3 3 0 01-6 0V7" />
              </svg>
              {file ? 'Change Attachment' : 'Upload Attachment'}
            </button>
            {file && (
              <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs text-gray-700">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-3.5 w-3.5">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 15V8a4 4 0 00-8 0v9a3 3 0 01-6 0V7" />
                </svg>
                <span className="truncate max-w-[200px]" title={file.name}>{file.name}</span>
                <span className="text-gray-500">{Math.round(file.size/1024)} KB</span>
                <button type="button" className="ml-1 text-gray-500 hover:text-rose-600" onClick={() => setFile(null)} aria-label="Remove attachment">✕</button>
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
          <button className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit Request'}
          </button>
        </div>
      </form>
    </div>
  );
}
