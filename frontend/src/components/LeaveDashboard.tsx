import { useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import EmployeeSearch from './EmployeeSearch';
import type { EmployeeSearchItemDTO } from '../lib/api';

// Temporary placeholder types and data until backend API is available
export type LeaveTypeItem = {
  key: string;
  label: string;
  total: number; // entitlement
  taken: number; // consumed
  subtypes?: string[]; // optional list of sub-types, informational only for now
  note?: string; // optional short note
};

export type LeaveGroup = {
  key: string;
  title: string;
  items: LeaveTypeItem[];
};

// Sample seed data (to be replaced by API data later). Matches main headings from the shared spec image.
export const SAMPLE_GROUPS: LeaveGroup[] = [
  {
    key: 'casual',
    title: 'Casual Leave',
    items: [
      { key: 'cl', label: 'Casual Leave', total: 10, taken: 2 },
      { key: 'rr', label: 'Rest & Recreation (R&R) Leave', total: 10, taken: 1, subtypes: ['R&R'] },
    ],
  },
  {
    key: 'earned',
    title: 'Earned Leave',
    items: [
      { key: 'el', label: 'Earned Leave', total: 30, taken: 7 },
      { key: 'lnd', label: 'Leave Not Due (LND)', total: 365, taken: 0 },
      { key: 'study', label: 'Study Leave', total: 730, taken: 0 },
      { key: 'eol', label: 'Extra-Ordinary Leave (Leave Without Pay)', total: 365, taken: 0 },
      { key: 'exp', label: 'Ex-Pakistan Leave', total: 30, taken: 0 },
      { key: 'dl', label: 'Disability Leave', total: 730, taken: 0 },
      { key: 'lpr', label: 'Leave Preparatory to Retirement (LPR)', total: 365, taken: 0 },
      { key: 'ml', label: 'Medical Leave', total: 120, taken: 12 },
    ],
  },
  {
    key: 'maternity',
    title: 'Maternity Leave',
    items: [{ key: 'mat', label: 'Maternity Leave', total: 365, taken: 0 }],
  },
  {
    key: 'paternity',
    title: 'Paternity Leave',
    items: [{ key: 'pat', label: 'Paternity Leave', total: 15, taken: 0 }],
  },
  {
    key: 'iddat',
    title: 'Iddat Leave',
    items: [{ key: 'iddat', label: 'Iddat Leave', total: 130, taken: 0 }],
  },
  {
    key: 'fatal-med',
    title: 'Fatal Medical Emergency Leave',
    items: [{ key: 'fme', label: 'Fatal Medical Emergency Leave', total: 180, taken: 0 }],
  },
  {
    key: 'hajj_non_muslim',
    title: 'Hajj Leave & Leave to Non-Muslims',
    items: [
      { key: 'hajj', label: 'Hajj Leave', total: 40, taken: 0 },
      { key: 'nm', label: 'Leave to Non-Muslims', total: 30, taken: 0 },
    ],
  },
];

export default function LeaveDashboard() {
  const { user } = useAuth();
  const isHR = user?.role === 'hr';
  const [selectedEmp, setSelectedEmp] = useState<EmployeeSearchItemDTO | null>(null);

  // Collapsible state
  const [open, setOpen] = useState<Set<string>>(() => new Set());
  const allOpen = open.size === SAMPLE_GROUPS.length;
  function toggle(key: string) {
    setOpen((s) => {
      const n = new Set(s);
      if (n.has(key)) n.delete(key); else n.add(key);
      return n;
    });
  }
  function setAll(v: boolean) {
    setOpen(new Set(v ? SAMPLE_GROUPS.map((g) => g.key) : []));
  }

  // Totals
  const totals = useMemo(() => {
    let total = 0, taken = 0;
    for (const g of SAMPLE_GROUPS) for (const it of g.items) { total += it.total; taken += it.taken; }
    const remaining = Math.max(0, total - taken);
    return { total, taken, remaining };
  }, []);

  return (
    <>
      {/* Employee-only: Apply + My Requests will be rendered by parent dashboards where needed */}
      {isHR && (
        <div className="mb-3">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm text-gray-600">View leave details for</div>
            <div className="w-full max-w-md">
              <EmployeeSearch value={selectedEmp} onChange={setSelectedEmp} placeholder="Search employees by name, email or ID" />
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-body">
          {/* Header */}
          <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="text-lg font-semibold">Leave Details</div>
              <div className="text-xs text-slate-800">Overview of leave entitlements and usage</div>
            </div>
            <div className="flex items-center gap-2">
              <button className="btn btn-secondary px-3 py-1.5" onClick={() => setAll(!allOpen)}>
                {allOpen ? 'Collapse All' : 'Expand All'}
              </button>
            </div>
          </div>

          {/* Totals summary intentionally hidden per request */}

          {/* Groups */}
          <div className="divide-y border rounded-xl overflow-hidden">
            {SAMPLE_GROUPS.map((group) => {
              const gTotals = group.items.reduce(
                (acc, it) => { acc.total += it.total; acc.taken += it.taken; return acc; },
                { total: 0, taken: 0 }
              );
              const gRemaining = Math.max(0, gTotals.total - gTotals.taken);
              const isOpen = open.has(group.key);
              return (
                <div key={group.key} className="bg-white">
                  <button
                    type="button"
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-white focus:outline-none"
                    aria-expanded={isOpen}
                    onClick={() => toggle(group.key)}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full border text-xs ${isOpen ? 'bg-brand-50 border-brand-200 text-brand-700' : 'bg-white border-slate-800 text-slate-800'}`}>{isOpen ? '▾' : '▸'}</span>
                      <span className="font-medium">{group.title}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-600 text-emerald-700 px-2 py-0.5 bg-transparent">
                        Available: <b className="tabular-nums">{gRemaining}</b>
                      </span>
                      <span className="hidden sm:inline-flex items-center gap-1 rounded-full border border-sky-600 text-sky-700 px-2 py-0.5 bg-transparent">
                        Accrued: <b className="tabular-nums">{gTotals.total}</b>
                      </span>
                      <span className="hidden sm:inline-flex items-center gap-1 rounded-full border border-amber-600 text-amber-700 px-2 py-0.5 bg-transparent">
                        Approved: <b className="tabular-nums">{gTotals.taken}</b>
                      </span>
                    </div>
                  </button>

                  {isOpen && (
                    <div className="px-4 pb-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {group.items.map((it) => {
                          const remaining = Math.max(0, it.total - it.taken);
                          const usedPct = Math.min(100, (it.taken / Math.max(1, it.total)) * 100);
                          return (
                            <div
                              key={it.key}
                              className="group relative overflow-hidden rounded-2xl border border-slate-800 bg-white p-5 shadow-lg transition transform hover:-translate-y-0.5 hover:shadow-2xl"
                            >
                              {/* Accent border strip */}
                              <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-600 via-brand-500 to-brand-400" />

                              <div className="mb-4 flex items-start justify-between gap-3">
                                <div>
                                  <div className="text-sm font-semibold text-slate-900">{it.label}</div>
                                  {it.subtypes && it.subtypes.length > 0 && (
                                    <div className="mt-0.5 text-[11px] text-slate-700">Sub-types: {it.subtypes.join(', ')}</div>
                                  )}
                                  {it.note && (
                                    <div className="mt-0.5 text-[11px] text-slate-700">{it.note}</div>
                                  )}
                                </div>
                                <div className="text-right">
                                  <div className="text-[10px] uppercase tracking-wide text-slate-700">Available</div>
                                  <div className="text-2xl font-extrabold text-slate-900 tabular-nums">{remaining}</div>
                                </div>
                              </div>

                              {/* Progress bar */}
                              <div className="mb-4 h-2.5 w-full rounded-full bg-white overflow-hidden ring-1 ring-slate-800/30">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-brand-600 to-brand-400 transition-all duration-700 ease-out"
                                  style={{ width: `${usedPct}%` }}
                                  aria-label="Used percentage"
                                />
                              </div>

                              {/* Metrics badges */}
                              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-700 text-emerald-800 px-2 py-1 bg-transparent">
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-3 w-3"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M5 13l4 4L19 7"/></svg>
                                  Available: <b className="tabular-nums">{remaining}</b>
                                </span>
                                <span className="inline-flex items-center gap-1 rounded-full border border-sky-700 text-sky-800 px-2 py-1 bg-transparent">
                                  Accrued: <b className="tabular-nums">{it.total}</b>
                                </span>
                                <span className="inline-flex items-center gap-1 rounded-full border border-amber-700 text-amber-800 px-2 py-1 bg-transparent">
                                  Approved: <b className="tabular-nums">{it.taken}</b>
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-3 text-[11px] text-slate-800">
            Prototype with placeholder data. We will integrate the real leave types, sub-types and business rules later.
          </div>
        </div>
      </div>
    </>
  );
}
