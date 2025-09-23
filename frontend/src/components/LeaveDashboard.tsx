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
      { key: 'rr', label: 'Rest & Recreation (R&R) Leave', total: 10, taken: 0, subtypes: ['R&R'], note: 'Available only if minimum Casual Leave balance is 10. Current CL balance: 20' },
    ],
  },
  {
    key: 'earned',
    title: 'Earned Leave',
    items: [
      { key: 'lnd', label: 'Leave Not Due (LND)', total: 365, taken: 0, note: 'Based on EL balance; deducts from Earned Leave' },
      { key: 'study', label: 'Study Leave', total: 730, taken: 0, note: 'Up to 2 years; deducts from Earned Leave' },
      { key: 'exp', label: 'Ex-Pakistan Leave', total: 730, taken: 0, note: 'Up to 2 years; debited from Earned Leave' },
      { key: 'lpr', label: 'Leave Preparatory to Retirement (LPR)', total: 365, taken: 0, note: 'Up to 365 days; subject to EL balance' },
      { key: 'ml', label: 'Medical Leave', total: 120, taken: 12, note: 'Up to 120 days; deducts from Earned Leave' },
    ],
  },
  {
    key: 'disability',
    title: 'Disability Leave',
    items: [{ key: 'dl', label: 'Disability Leave', total: 730, taken: 0, note: 'Up to 2 years; outside leave account (no EL deduction)' }],
  },
  {
    key: 'eol',
    title: 'Extra-Ordinary Leave (Leave Without Pay)',
    items: [
      { key: 'eol', label: 'Extra-Ordinary Leave (Leave Without Pay)', total: 365, taken: 0, note: 'Leave without pay; outside leave account (no EL deduction)' },
    ],
  },
  {
    key: 'maternity',
    title: 'Maternity Leave',
    items: [{ key: 'mat', label: 'Maternity Leave', total: 180, taken: 0, note: '180/120/90 days depending on birth order; outside leave account' }],
  },
  {
    key: 'paternity',
    title: 'Paternity Leave',
    items: [{ key: 'pat', label: 'Paternity Leave', total: 15, taken: 0, note: 'Outside leave account (no EL deduction)' }],
  },
  {
    key: 'iddat',
    title: 'Iddat Leave',
    items: [{ key: 'iddat', label: 'Iddat Leave', total: 130, taken: 0, note: 'Outside leave account (no EL deduction)' }],
  },
  {
    key: 'fatal-med',
    title: 'Fatal Medical Emergency Leave',
    items: [{ key: 'fme', label: 'Fatal Medical Emergency Leave', total: 180, taken: 0, note: 'Up to 6 months; outside leave account' }],
  },
  {
    key: 'hajj_non_muslim',
    title: 'Hajj Leave & Leave to Non-Muslims',
    items: [
      { key: 'hajj_combined', label: 'Hajj & Leave to Non-Muslims', total: 40, taken: 0, note: 'Hajj up to 40 days; Non-Muslim religious leave up to 30 days; outside leave account (no EL deduction)' },
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
              <div className="text-xs text-black">Overview of leave entitlements and usage</div>
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
                    <div className="flex items-center gap-3">
                      <span
                        className={`inline-flex h-7 w-7 items-center justify-center rounded-full border transition-transform duration-300 ${
                          isOpen ? 'bg-brand-50 border-brand-200 text-brand-700 rotate-0' : 'bg-white border-black text-black -rotate-90'
                        }`}
                        aria-hidden
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                          <path d="M12 15.5l-6-6h12l-6 6z" />
                        </svg>
                      </span>
                      <span className="font-medium">{group.title}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-600 text-emerald-700 px-2 py-0.5 bg-transparent">
                        Available: <b className="tabular-nums">{gRemaining}</b>
                      </span>
                      <span className="hidden sm:inline-flex items-center gap-1 rounded-full border border-amber-600 text-amber-700 px-2 py-0.5 bg-transparent">
                        Approved: <b className="tabular-nums">{gTotals.taken}</b>
                      </span>
                    </div>
                  </button>

                  {isOpen && (
                    <div
                      className={`px-4 pb-3 overflow-hidden transition-all duration-600 ease-out origin-top ${
                        isOpen ? 'opacity-100 max-h-[2000px]' : 'opacity-0 max-h-0 pointer-events-none'
                      }`}
                      aria-hidden={!isOpen}
                    >
                      <div
                        className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 transition-opacity duration-500 ${
                          isOpen ? 'opacity-100' : 'opacity-0'
                        }`}
                      >
                        {group.items.map((it, idx) => {
                          const remaining = Math.max(0, it.total - it.taken);
                          return (
                            <div
                              key={it.key}
                              className="group relative overflow-hidden rounded-2xl border border-black bg-white p-5 shadow-lg transition transform hover:-translate-y-0.5 hover:shadow-2xl anim-fade-up"
                              style={{ animationDelay: `${idx * 60}ms` }}
                            >
                              {/* Accent border strip */}
                              <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-600 via-brand-500 to-brand-400" />

                              <div className="mb-4 flex items-start gap-3">
                                <div>
                                  <div className="text-base font-bold text-black flex items-center gap-2">
                                    {it.label}
                                    <button
                                      type="button"
                                      className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-black/60 text-[10px] font-semibold text-black/80 hover:text-black hover:border-black focus:outline-none"
                                      onClick={(e) => e.preventDefault()}
                                      title={[
                                        it.subtypes && it.subtypes.length ? `Sub-types: ${it.subtypes.join(', ')}` : undefined,
                                        it.note ? `${it.note}` : undefined,
                                      ].filter(Boolean).join('\n') || 'No additional details'}
                                      aria-label={`About ${it.label}`}
                                    >
                                      i
                                    </button>
                                  </div>
                                  {/* Inline details removed; available via info tooltip */}
                                </div>
                              </div>

                              {/* Progress/loading bar removed per request */}

                              {/* Metrics badges */}
                              <div className="flex flex-wrap items-center gap-2 text-sm">
                                <span className="inline-flex items-center gap-1 rounded-full border-2 border-emerald-700 text-emerald-800 px-3 py-1 bg-transparent">
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-3 w-3">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M5 13l4 4L19 7" />
                                  </svg>
                                  Available: <b className="tabular-nums">{remaining}</b>
                                </span>
                                <span className="inline-flex items-center gap-1 rounded-full border-2 border-amber-700 text-amber-800 px-3 py-1 bg-transparent">
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
