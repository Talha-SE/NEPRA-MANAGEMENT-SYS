import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import EmployeeSearch from './EmployeeSearch';
import type { EmployeeSearchItemDTO, LeaveSummaryRowDTO, ProfileDTO } from '../lib/api';
import { apiGetLeaveSummary, apiGetProfile } from '../lib/api';

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
      // Primary CL card (DB-driven via label match)
      { key: 'cl', label: 'Casual Leave', total: 20, taken: 0, note: 'General casual leave balance' },
      { key: 'rr', label: 'Rest & Recreation (R&R) Leave', total: 10, taken: 0, subtypes: ['R&R'], note: 'Available only if minimum Casual Leave balance is 10. Current CL balance: 20' },
    ],
  },
  {
    key: 'earned',
    title: 'Earned Leave (Encashable)',
    items: [
      { key: 'el-enc', label: 'Earned Leave (Encashable)', total: 365, taken: 0, note: 'Encashable quota reserved for payout events and special approvals.' },
      { key: 'lnd', label: 'Leave Not Due (LND)', total: 365, taken: 0, note: 'Based on EL balance; deducts from Earned Leave' },
      { key: 'study', label: 'Study Leave', total: 730, taken: 0, note: 'Up to 2 years; deducts from Earned Leave' },
      { key: 'exp', label: 'Ex-Pakistan Leave', total: 730, taken: 0, note: 'Up to 2 years; debited from Earned Leave' },
      { key: 'lpr', label: 'Leave Preparatory to Retirement (LPR)', total: 365, taken: 0, note: 'Up to 365 days; subject to EL balance' },
      { key: 'ml', label: 'Medical Leave', total: 120, taken: 12, note: 'Up to 120 days; deducts from Earned Leave' },
    ],
  },
  // New Non-Encashable Earned Leave group
  {
    key: 'earned_non',
    title: 'Earned Leave (Non-Encashable)',
    items: [
      { key: 'el-non', label: 'Earned Leave (Non-Encashable)', total: 365, taken: 0, note: 'Standard non-encashable EL accrual for routine leave.' },
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

const OUTSIDE_LEAVE_KEYS = new Set<string>([
  'disability',
  'eol',
  'maternity',
  'paternity',
  'iddat',
  'fatal-med',
  'hajj_non_muslim',
]);

export default function LeaveDashboard() {
  const { user } = useAuth();
  const isHR = user?.role === 'hr';
  const [selectedEmp, setSelectedEmp] = useState<EmployeeSearchItemDTO | null>(null);
  const [searching, setSearching] = useState(false);
  const [loadingSelf, setLoadingSelf] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileDTO | null>(null);
  const [summary, setSummary] = useState<LeaveSummaryRowDTO[] | null>(null);
  const [didSearch, setDidSearch] = useState(false);

  // Collapsible state
  const [open, setOpen] = useState<Set<string>>(() => new Set());
  const [outsideOpen, setOutsideOpen] = useState(false);
  function toggle(key: string) {
    setOpen((s) => {
      const n = new Set(s);
      if (n.has(key)) n.delete(key); else n.add(key);
      return n;
    });
  }
  function setAll(v: boolean) {
    const regularKeys = v
      ? Array.from(dynamicGroups.keys()).filter((key) => !OUTSIDE_LEAVE_KEYS.has(key))
      : [];
    setOpen(new Set(regularKeys));
    setOutsideOpen(v);
  }

  // Employee view: auto-load own profile + leave summary
  useEffect(() => {
    if (isHR) return;
    let cancelled = false;
    (async () => {
      try {
        setLoadingSelf(true);
        setError(null);
        const p = await apiGetProfile();
        const s = await apiGetLeaveSummary(p.id);
        if (!cancelled) {
          setProfile(p);
          setSummary(s);
        }
      } catch (e) {
        if (!cancelled) {
          setError('Failed to load your leave details. Please try again later.');
          setProfile(null);
          setSummary(null);
        }
      } finally {
        if (!cancelled) {
          setLoadingSelf(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isHR]);

  // Build groups dynamically from DB summary
  type DynItem = { key: string; label: string };
  type DynGroup = { key: string; title: string; items: DynItem[] };

  function toKey(s: string) {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }

  function classify(label: string): { key: string; title: string } {
    // Minimal classifier; extend as needed
    if (label === 'Casual Leave' || label.includes('R&R')) return { key: 'casual', title: 'Casual Leave' };
    if (label === 'Earned Leave (Non-Encashable)') return { key: 'earned_non', title: 'Earned Leave (Non-Encashable)' };
    if (label.includes('Earned Leave') || ['Leave Not Due (LND)', 'Study Leave', 'Ex-Pakistan Leave', 'Leave Preparatory to Retirement (LPR)', 'Medical Leave'].includes(label)) {
      return { key: 'earned', title: 'Earned Leave (Encashable)' };
    }
    if (label === 'Disability Leave') return { key: 'disability', title: 'Disability Leave' };
    if (label.includes('Extra-Ordinary')) return { key: 'eol', title: 'Extra-Ordinary Leave (Leave Without Pay)' };
    if (label.includes('Maternity')) return { key: 'maternity', title: 'Maternity Leave' };
    if (label.includes('Paternity')) return { key: 'paternity', title: 'Paternity Leave' };
    if (label.includes('Iddat')) return { key: 'iddat', title: 'Iddat Leave' };
    if (label.includes('Fatal Medical')) return { key: 'fatal-med', title: 'Fatal Medical Emergency Leave' };
    if (label.toLowerCase().includes('hajj') || label.toLowerCase().includes('non-muslim')) return { key: 'hajj_non_muslim', title: 'Hajj Leave & Leave to Non-Muslims' };
    return { key: 'other', title: 'Other Leaves' };
  }

  const dynamicGroups = useMemo(() => {
    const map = new Map<string, DynGroup>();
    if (summary) {
      for (const row of summary) {
        const label = row.leave_type;
        if (!label) continue;
        const g = classify(label);
        if (!map.has(g.key)) map.set(g.key, { key: g.key, title: g.title, items: [] });
        const grp = map.get(g.key)!;
        // ensure unique items by label
        if (!grp.items.some((it) => it.label === label)) {
          grp.items.push({ key: toKey(label), label });
        }
      }
    }
    return map;
  }, [summary]);

  const dynGroupsArr = useMemo(() => Array.from(dynamicGroups.values()), [dynamicGroups]);
  // When a profile is loaded (self or searched), filter gender-specific leaves
  const filteredDynGroupsArr = useMemo(() => {
    const gender = (profile?.gender || '').toLowerCase();
    if (!gender) return dynGroupsArr;
    const hideMaternity = gender === 'male';
    const hidePaternity = gender === 'female';
    return dynGroupsArr.map((g) => {
      if (g.key !== 'maternity' && g.key !== 'paternity') {
        // also remove items within any group that might contain the words
        const filteredItems = g.items.filter((it) => {
          const isMat = /maternity/i.test(it.label);
          const isPat = /paternity/i.test(it.label);
          if (hideMaternity && isMat) return false;
          if (hidePaternity && isPat) return false;
          return true;
        });
        return { ...g, items: filteredItems };
      }
      if (hideMaternity && g.key === 'maternity') return { ...g, items: [] };
      if (hidePaternity && g.key === 'paternity') return { ...g, items: [] };
      return g;
    }).filter((g) => g.items.length > 0);
  }, [dynGroupsArr, profile?.gender]);

  const { regularGroups, outsideGroups } = useMemo(() => {
    const regular: DynGroup[] = [];
    const outside: DynGroup[] = [];
    for (const group of filteredDynGroupsArr) {
      (OUTSIDE_LEAVE_KEYS.has(group.key) ? outside : regular).push(group);
    }
    return { regularGroups: regular, outsideGroups: outside };
  }, [filteredDynGroupsArr]);
  const outsideItems = useMemo(() => {
    const items = outsideGroups.flatMap((group) =>
      group.items.map((item) => ({ groupKey: group.key, item }))
    );
    const gender = (profile?.gender || '').toLowerCase();
    if (!gender) return items;
    const hideMaternity = gender === 'male';
    const hidePaternity = gender === 'female';
    return items.filter(({ item }) => {
      const isMat = /maternity/i.test(item.label);
      const isPat = /paternity/i.test(item.label);
      if (hideMaternity && isMat) return false;
      if (hidePaternity && isPat) return false;
      return true;
    });
  }, [outsideGroups, profile?.gender]);
  const allOpen = regularGroups.length > 0 && open.size === regularGroups.length;

  // HR: Search handler to fetch profile and leave summary
  async function onSearch() {
    if (!isHR) return;
    setError(null);
    setDidSearch(true);
    try {
      setSearching(true);
      const empId = selectedEmp?.id;
      if (!empId) { setError('Please select an employee'); return; }
      const [p, s] = await Promise.all([
        apiGetProfile(empId),
        apiGetLeaveSummary(empId),
      ]);
      setProfile(p);
      setSummary(s);
    } catch (e) {
      setError('Failed to load employee leave details');
      setProfile(null);
      setSummary(null);
    } finally {
      setSearching(false);
    }
  }

  // Helper to map summary by leave_type for quick lookup
  const summaryByType = useMemo(() => {
    const map = new Map<string, LeaveSummaryRowDTO>();
    if (summary) {
      for (const row of summary) map.set(row.leave_type, row);
    }
    return map;
  }, [summary]);

  function safeNumber(value: number | null | undefined): number {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }

  const outsideAggregates = useMemo(() => {
    return outsideGroups.reduce(
      (acc, group) => {
        for (const item of group.items) {
          const row = summaryByType.get(item.label);
          acc.available += safeNumber(row?.available);
          acc.approved += safeNumber(row?.approved);
        }
        return acc;
      },
      { available: 0, approved: 0 }
    );
  }, [outsideGroups, summaryByType]);
  const outsideRemaining = Math.max(0, outsideAggregates.available);
  const outsideApproved = outsideAggregates.approved;

  const renderLeaveCard = (uniqueKey: string, label: string, idx: number) => {
    const row = summaryByType.get(label);
    const available = row?.available ?? 0;
    const approved = row?.approved ?? 0;
    const remaining = available;
    return (
      <div
        key={uniqueKey}
        className="group relative overflow-hidden rounded-3xl border border-emerald-100/70 bg-gradient-to-br from-white via-emerald-50/60 to-white/85 p-6 shadow-[0_40px_120px_-70px_rgba(16,94,49,0.6)] ring-1 ring-white/65 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_55px_150px_-80px_rgba(16,94,49,0.65)]"
        style={{ animationDelay: `${idx * 65}ms` }}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.18),transparent_55%),radial-gradient(circle_at_bottom_right,rgba(236,253,245,0.9),transparent_60%)] opacity-80 transition group-hover:opacity-100" aria-hidden />
        <div className="pointer-events-none absolute inset-x-6 top-0 h-0.5 bg-gradient-to-r from-emerald-400 via-emerald-300 to-emerald-200" />

        <div className="relative z-10 flex flex-col gap-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 shadow-inner shadow-emerald-500/20">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-5 w-5">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" d="M4 7h16M4 12h12M4 17h8" />
                </svg>
              </div>
              <div className="space-y-1">
                <div className="text-base font-semibold text-slate-900 tracking-tight">
                  {label}
                </div>
                {!row && (
                  <div className="text-xs font-medium text-emerald-600/70">
                    Awaiting balance data
                  </div>
                )}
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-sm">
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200/60 bg-gradient-to-r from-emerald-500/15 via-emerald-500/5 to-emerald-500/10 px-3 py-1 font-semibold text-emerald-700 shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-4 w-4">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M5 13l4 4L19 7" />
                </svg>
                Remaining <span className="tabular-nums">{remaining}</span>
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-amber-500/15 px-3 py-1 font-semibold text-amber-700 shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-4 w-4">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7h8M8 12h5M5 17h14" />
                </svg>
                Approved <span className="tabular-nums">{approved}</span>
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm sm:hidden">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200/60 bg-gradient-to-r from-emerald-500/15 via-emerald-500/5 to-emerald-500/10 px-3 py-1 font-semibold text-emerald-700 shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M5 13l4 4L19 7" />
              </svg>
              Remaining <span className="tabular-nums">{remaining}</span>
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-amber-500/15 px-3 py-1 font-semibold text-amber-700 shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7h8M8 12h5M5 17h14" />
              </svg>
              Approved <span className="tabular-nums">{approved}</span>
            </span>
          </div>
        </div>
      </div>
    );
  };

  const renderGroup = (group: DynGroup) => {
    const gTotals = group.items.reduce(
      (acc, it) => {
        const row = summaryByType.get(it.label);
        const available = row?.available ?? 0;
        const approved = row?.approved ?? 0;
        acc.total += available + approved;
        acc.taken += approved;
        return acc;
      },
      { total: 0, taken: 0 }
    );
    const gRemaining = Math.max(0, gTotals.total - gTotals.taken);
    const isOpen = open.has(group.key);
    let cards = [...group.items];
    if (group.key === 'casual' && !cards.some((item) => item.label === 'Casual Leave')) {
      cards.unshift({ key: 'casual-leave', label: 'Casual Leave' });
    }
    if (group.key === 'earned') {
      const index = cards.findIndex((item) => item.label === 'Earned Leave (Encashable)');
      if (index > 0) {
        const [encCard] = cards.splice(index, 1);
        cards = [encCard, ...cards];
      }
    }
    return (
      <div key={group.key} className="relative">
        <button
          type="button"
          className="w-full flex items-center justify-between px-5 py-4 bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-400 text-sm font-semibold text-white transition hover:via-emerald-500 focus:outline-none"
          aria-expanded={isOpen}
          onClick={() => toggle(group.key)}
        >
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/40 bg-white/20 text-white transition-transform duration-300 ${
                isOpen ? 'rotate-0' : '-rotate-90'
              }`}
              aria-hidden
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                <path d="M12 15.5l-6-6h12l-6 6z" />
              </svg>
            </span>
            <span className="flex items-center gap-2 font-semibold text-white">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-2xl bg-white/25 text-white">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-4 w-4"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 8h10M7 12h5m-5 4h8M5 4h14a2 2 0 012 2v14l-4-2-4 2-4-2-4 2V6a2 2 0 012-2z"/></svg>
              </span>
              {group.title}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs" aria-hidden />
        </button>

        {isOpen && (
          <div
            className={`px-6 pb-6 pt-6 overflow-hidden transition-all duration-600 ease-out origin-top ${
              isOpen ? 'opacity-100 max-h-[2000px]' : 'opacity-0 max-h-0 pointer-events-none'
            }`}
            aria-hidden={!isOpen}
          >
            <div className="rounded-3xl border border-white/55 bg-gradient-to-br from-white/92 via-emerald-50/35 to-white/75 p-5 shadow-[0_45px_120px_-80px_rgba(16,94,49,0.65)] backdrop-blur-sm transition-all duration-500">
              <div
                className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 transition-opacity duration-500 ${
                  isOpen ? 'opacity-100' : 'opacity-0'
                }`}
              >
                {cards.map((it, idx) => renderLeaveCard(it.key, it.label, idx))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const encashableRow = summaryByType.get('Earned Leave (Encashable)');

  const encashableStats = {
    available: safeNumber(encashableRow?.available),
    approved: safeNumber(encashableRow?.approved),
  };

  const profileInitials = useMemo(() => {
    const first = (profile?.firstName?.[0] || '').toUpperCase();
    const last = (profile?.lastName?.[0] || '').toUpperCase();
    const combined = `${first}${last}`.trim();
    if (combined) return combined;
    const emailChars = (profile?.email || '').slice(0, 2).toUpperCase();
    return emailChars || 'EMP';
  }, [profile?.firstName, profile?.lastName, profile?.email]);

  const busy = (!isHR && loadingSelf) || (isHR && searching);

  return (
    <>
      {/* Employee-only: Apply + My Requests will be rendered by parent dashboards where needed */}
      {isHR && (
        <section className="mb-8 space-y-6">
          <div className="relative rounded-4xl border border-emerald-500/30 bg-gradient-to-r from-emerald-700 via-emerald-600 to-emerald-500 p-8 text-white shadow-[0_36px_120px_-60px_rgba(4,72,40,0.85)]">
            <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at top left, rgba(255,255,255,0.35), transparent 40%), radial-gradient(circle at bottom right, rgba(5,150,105,0.45), transparent 55%)' }} aria-hidden />
            <div className="relative z-10 space-y-6">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-100">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" /> HR Leave Control Center
                </div>
                <div className="space-y-1">
                  <h1 className="text-3xl font-semibold leading-tight">Stay ahead of every leave decision</h1>
                  <p className="text-sm text-emerald-100/85 max-w-2xl">
                    Track quotas, validate balances, and action requests with confidence. Empower HR to keep teams balanced and compliant.
                  </p>
                </div>
              </div>
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                <div className="rounded-3xl border border-white/25 bg-white px-4 py-3 shadow-[0_14px_40px_-30px_rgba(0,0,0,0.55)] focus-within:ring focus-within:ring-emerald-200/60">
                  <EmployeeSearch value={selectedEmp} onChange={setSelectedEmp} placeholder="Search by name, email or ID" className="text-slate-900 placeholder:text-slate-500" />
                </div>
                <button
                  className="inline-flex items-center justify-center rounded-2xl bg-white/90 px-5 py-3 text-sm font-semibold text-emerald-800 shadow-[0_12px_30px_-18px_rgba(255,255,255,0.9)] transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-200 disabled:opacity-70"
                  onClick={onSearch}
                  disabled={searching}
                >
                  {searching ? 'Searching…' : 'Search'}
                </button>
              </div>
              {error && didSearch && (
                <div className="rounded-3xl border border-rose-200/70 bg-white/15 px-4 py-3 text-sm text-rose-100">
                  {error}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      <div className="relative overflow-hidden rounded-4xl border border-emerald-500/25 bg-gradient-to-br from-emerald-100 via-white/95 to-emerald-50 p-8 shadow-[0_36px_110px_-60px_rgba(16,94,49,0.75)]">
        {busy && (
          <div className="absolute inset-0 z-20 flex items-center justify-center rounded-4xl border border-emerald-200/50 bg-white/70 backdrop-blur">
            <div className="h-9 w-9 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" aria-label="Loading leave details" />
          </div>
        )}
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at top right, rgba(255,255,255,0.65), transparent 50%), radial-gradient(circle at bottom left, rgba(16,185,129,0.28), transparent 58%)' }} aria-hidden />
        <div className="relative z-10 space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-800">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Leave insights
              </div>
              <h2 className="text-2xl font-semibold text-slate-900">Leave Details</h2>
              <p className="text-sm text-slate-600">Stay ahead of allocation, consumption, and remaining balances across every leave programme.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="inline-flex items-center gap-2 rounded-2xl border border-emerald-400/50 bg-white/90 px-3 py-1.5 text-sm font-medium text-emerald-700 shadow-sm transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
                onClick={() => setAll(!allOpen)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-4 w-4"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 5v14m7-7H5" /></svg>
                {allOpen ? 'Collapse All' : 'Expand All'}
              </button>
            </div>
          </div>

          {!isHR && error && !busy && (
            <div className="rounded-3xl border border-rose-200/70 bg-rose-50/80 px-4 py-3 text-sm text-rose-700 shadow-sm">
              {error}
            </div>
          )}

          {/* HR Only: Employee profile card after search */}
          {profile && (isHR ? didSearch : true) && (
            <div className="relative overflow-hidden rounded-3xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950 via-emerald-800 to-emerald-600 p-6 text-white shadow-[0_30px_80px_-40px_rgba(15,64,45,0.6)]">
              <div className="absolute inset-0 opacity-60" style={{ backgroundImage: 'radial-gradient(circle at top right, rgba(255,255,255,0.35), transparent 45%), radial-gradient(circle at bottom left, rgba(255,255,255,0.25), transparent 55%)' }} aria-hidden />
              <div className="relative z-10 grid gap-6 lg:grid-cols-5 lg:items-center">
                <div className="lg:col-span-2 flex items-start gap-4">
                  <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-emerald-500 text-lg font-semibold text-white shadow-[0_10px_30px_-12px_rgba(0,0,0,0.6)]">
                    {profileInitials}
                  </div>
                  <div className="space-y-1">
                    <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-100">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" /> Employee Profile
                    </div>
                    <h3 className="text-xl font-semibold leading-tight text-white">{[profile.firstName, profile.lastName].filter(Boolean).join(' ') || 'Employee'}</h3>
                    <p className="text-sm text-emerald-100/80">{profile.email || '—'}</p>
                  </div>
                </div>
                <div className="lg:col-span-3 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3">
                    <div className="text-[11px] uppercase tracking-wide text-emerald-100/70">Company</div>
                    <div className="text-sm font-semibold text-white">{profile.companyName || '—'}</div>
                  </div>
                  <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3">
                    <div className="text-[11px] uppercase tracking-wide text-emerald-100/70">Employee Code</div>
                    <div className="text-sm font-semibold text-white">{profile.empCode || '—'}</div>
                  </div>
                  <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3">
                    <div className="text-[11px] uppercase tracking-wide text-emerald-100/70">Contact</div>
                    <div className="text-sm font-semibold text-white">{profile.mobile || profile.contactTel || profile.officeTel || '—'}</div>
                  </div>
                  <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3">
                    <div className="text-[11px] uppercase tracking-wide text-emerald-100/70">City</div>
                    <div className="text-sm font-semibold text-white">{profile.city || '—'}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Groups from DB */}
          <div className="divide-y divide-emerald-50/60 overflow-hidden rounded-3xl border border-white/70 bg-white/90">
            {regularGroups.map(renderGroup)}
            {outsideGroups.length > 0 && (
              <div className="relative">
                <button
                  type="button"
                  className="w-full flex items-center justify-between px-5 py-4 bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-400 text-sm font-semibold text-white transition hover:via-emerald-500 focus:outline-none"
                  aria-expanded={outsideOpen}
                  onClick={() => setOutsideOpen((v) => !v)}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/40 bg-white/20 text-white transition-transform duration-300 ${
                        outsideOpen ? 'rotate-0' : '-rotate-90'
                      }`}
                      aria-hidden
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                        <path d="M12 15.5l-6-6h12l-6 6z" />
                      </svg>
                    </span>
                    <span className="flex items-center gap-2 text-base">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-2xl bg-white/25 text-white">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-4 w-4"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 7h16M4 12h10M4 17h6"/></svg>
                      </span>
                      Outside Leave Account
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs" aria-hidden />
                </button>
                {outsideOpen && (
                  <div className="border-t border-emerald-100/80 bg-emerald-50/70">
                    <div className="px-6 pb-6 pt-6">
                      <div className="rounded-3xl border border-white/55 bg-gradient-to-br from-white/92 via-emerald-50/35 to-white/75 p-5 shadow-[0_45px_120px_-80px_rgba(16,94,49,0.65)] backdrop-blur-sm">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                          {outsideItems.map(({ groupKey, item }, idx) => renderLeaveCard(`${groupKey}-${item.key}`, item.label, idx))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Removed prototype placeholder note: real data only */}
        </div>
      </div>
    </>
  );
}
