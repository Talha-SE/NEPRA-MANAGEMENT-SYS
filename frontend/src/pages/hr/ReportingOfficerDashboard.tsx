import { useEffect, useMemo, useState } from 'react';
import Navbar from '../../components/Navbar';
import LeaveDashboard from '../../components/LeaveDashboard';
import LeavePendingList from '../../components/LeavePendingList';
import ProfilePanel from '../../components/ProfilePanel';
import { useAuth } from '../../context/AuthContext';
import AttendanceCalendar from '../../components/AttendanceCalendar';
import EmployeeSearch from '../../components/EmployeeSearch';
import { apiGetProfile, type ProfileDTO, type EmployeeSearchItemDTO } from '../../lib/api';

// Tabs aligned with HR dashboard
 type TabKey = 'dashboard' | 'search' | 'attendance' | 'summary' | 'leaves' | 'approvals';

export default function ReportingOfficerDashboard() {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => {
    const saved = localStorage.getItem('ro-sidebar-open');
    return saved ? saved === '1' : true;
  });
  const [tab, setTab] = useState<TabKey>('dashboard');
  const [selectedEmp, setSelectedEmp] = useState<EmployeeSearchItemDTO | null>(null);
  const [profile, setProfile] = useState<ProfileDTO | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  useEffect(() => {
    localStorage.setItem('ro-sidebar-open', sidebarOpen ? '1' : '0');
  }, [sidebarOpen]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!selectedEmp) { setProfile(null); return; }
      try {
        setLoadingProfile(true);
        const p = await apiGetProfile(selectedEmp.id);
        if (!cancelled) setProfile(p);
      } catch {
        if (!cancelled) setProfile(null);
      } finally {
        if (!cancelled) setLoadingProfile(false);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedEmp?.id]);

  const title = useMemo(() => {
    switch (tab) {
      case 'dashboard':
        return 'Dashboard';
      case 'search':
        return 'Search Profiles';
      case 'attendance':
        return 'View Attendance';
      case 'leaves':
        return 'Leave Details';
      case 'summary':
        return 'Attendance Summary';
      case 'approvals':
        return 'Leave Approvals';
      default:
        return 'Reporting Officer Dashboard';
    }
  }, [tab]);

  const displayName = useMemo(() => {
    if (user?.firstName || user?.lastName) {
      return [user?.firstName, user?.lastName].filter(Boolean).join(' ');
    }
    return 'Reporting Officer';
  }, [user?.firstName, user?.lastName]);

  const kpiCards = useMemo(
    () => [
      { id: 'pending', label: 'Pending (RO)', value: '--', trend: 'Requires your action', tone: 'emerald' as const },
      { id: 'employees', label: 'Active Employees', value: '--', trend: 'Company wide', tone: 'sky' as const },
      { id: 'present', label: 'Present Today', value: '--', trend: 'Attendance sync', tone: 'violet' as const },
      { id: 'leave', label: 'On Leave', value: '--', trend: 'Time off', tone: 'amber' as const },
    ],
    []
  );

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-100 via-white to-emerald-50">
      <div className={`relative z-50 transition-[margin] duration-300 ease-out ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-16'}`}>
        <Navbar />
      </div>
      <main className="relative flex-1 min-h-0">
        {sidebarOpen && (
          <div
            className="fixed inset-x-0 top-14 bottom-0 z-30 bg-black/20 lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-hidden
          />
        )}

        <aside
          className={`z-40 fixed left-0 top-14 bottom-0 lg:top-0 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-800 border-r border-white/10 shadow-xl transform transition-[transform,width] duration-300 ease-out ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          } ${sidebarOpen ? 'w-64 lg:w-64' : 'w-64 lg:w-16'}`}
          aria-label="Sidebar"
        >
          <div className="h-full flex flex-col">
            <div className="px-3 h-12 border-b border-white/10/60 flex items-center justify-between text-white">
              <div className={`transition-all ${sidebarOpen ? 'text-base font-semibold tracking-wide' : 'text-sm font-medium'}`}>
                {sidebarOpen ? 'Menu' : ''}
              </div>
              <button
                type="button"
                className={`inline-flex items-center justify-center rounded-md border transition-all text-white/90 backdrop-blur-sm ${
                  sidebarOpen ? 'w-8 h-8 border-white/20 hover:bg-white/10 hover:text-white' : 'w-8 h-8 border-white/20 hover:bg-white/10 hover:text-white'
                } shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/40 hidden lg:inline-flex`}
                onClick={() => setSidebarOpen((s) => !s)}
                aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
                title={sidebarOpen ? 'Hide menu' : 'Show menu'}
              >
                {sidebarOpen ? (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-4 w-4">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 19l-7-7 7-7" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-4 w-4">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </button>
            </div>
            <nav className={`overflow-y-auto flex-1 text-gray-100 ${sidebarOpen ? 'p-2' : 'p-2 lg:p-1'} space-y-1`}>
              <SidebarButton collapsed={!sidebarOpen} active={tab === 'dashboard'} onClick={() => setTab('dashboard')} icon={<IconHome />}>
                Dashboard
              </SidebarButton>
              <SidebarButton collapsed={!sidebarOpen} active={tab === 'search'} onClick={() => setTab('search')} icon={<IconUser />}>
                Search Profiles
              </SidebarButton>
              <div className={`mt-2 ${sidebarOpen ? 'px-2' : 'px-0'}`}>
                <div className={`${sidebarOpen ? 'text-[10px] uppercase tracking-wide text-gray-400 px-2 mb-1' : 'sr-only'}`}>Attendance</div>
                <SidebarButton collapsed={!sidebarOpen} active={tab === 'attendance'} onClick={() => setTab('attendance')} icon={<IconCalendar />}>
                  View Attendance
                </SidebarButton>
                <SidebarButton collapsed={!sidebarOpen} active={tab === 'summary'} onClick={() => setTab('summary')} icon={<IconChart />}>
                  Attendance Summary
                </SidebarButton>
              </div>
              <div className={`mt-2 ${sidebarOpen ? 'px-2' : 'px-0'}`}>
                <div className={`${sidebarOpen ? 'text-[10px] uppercase tracking-wide text-gray-400 px-2 mb-1' : 'sr-only'}`}>Leaves</div>
                <SidebarButton collapsed={!sidebarOpen} active={tab === 'leaves'} onClick={() => setTab('leaves')} icon={<IconLeaf />}>
                  Leave Details
                </SidebarButton>
                <SidebarButton collapsed={!sidebarOpen} active={tab === 'approvals'} onClick={() => setTab('approvals')} icon={<IconCheck />}>
                  Leave Approvals
                </SidebarButton>
              </div>
            </nav>
            <div className="px-3 pb-3 pt-3 border-t border-white/10 hidden lg:block" />
          </div>
        </aside>
        <div className={`transition-[margin] duration-300 ease-out ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-16'}`}>
          <div className="w-full max-w-none px-4 py-8 lg:py-10">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-[0.3em] text-emerald-600">Reporting Officer</p>
                <h2 className="text-2xl lg:text-3xl font-semibold text-slate-900">Welcome, {displayName}</h2>
                <p className="text-sm text-slate-600">{title}</p>
              </div>
              <button
                type="button"
                className="lg:hidden inline-flex h-10 w-10 items-center justify-center rounded-full border border-emerald-200 bg-white text-emerald-600 shadow-sm transition hover:bg-emerald-50"
                onClick={() => setSidebarOpen((s) => !s)}
                aria-label={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
                title={sidebarOpen ? 'Hide menu' : 'Show menu'}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-5 w-5">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 7h16M4 12h16M4 17h16" />
                </svg>
              </button>
            </div>

            <section className="mt-8">
              <div className="space-y-8">
                {tab === 'dashboard' && (
                  <div className="space-y-8">
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                      {kpiCards.map((card) => (
                        <KpiCard key={card.id} label={card.label} value={card.value} tone={card.tone} trend={card.trend} />
                      ))}
                    </div>
                  </div>
                )}

                {tab === 'search' && (
                  <div className="grid gap-5">
                    <div className="relative rounded-3xl border border-white/60 bg-white/90 p-6 shadow-sm backdrop-blur">
                      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-white to-emerald-50/20 opacity-70" aria-hidden />
                      <div className="relative z-10 space-y-4">
                        <div>
                          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100/70 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-800">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Search Profiles
                          </div>
                          <h3 className="mt-3 text-xl font-semibold text-slate-900">Find team members instantly</h3>
                        </div>
                        <div className="rounded-2xl border border-emerald-200/70 bg-white px-4 py-3 shadow-sm focus-within:ring focus-within:ring-emerald-400/50">
                          <EmployeeSearch onChange={(emp) => setSelectedEmp(emp)} autoFocus placeholder="Search employee by name, email, code or ID" />
                        </div>
                      </div>
                    </div>

                    {selectedEmp && (
                      <div className="relative">
                        {loadingProfile && (
                          <div className="absolute inset-0 z-10 overflow-hidden rounded-4xl border border-emerald-200/40 bg-white/70 backdrop-blur-sm">
                            <div className="flex h-full w-full items-center justify-center">
                              <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" aria-label="Loading profile" />
                            </div>
                          </div>
                        )}
                        {profile ? (
                          <ProfilePanel
                            hideSearch
                            externalEmployee={{
                              id: profile.id,
                              firstName: profile.firstName,
                              lastName: profile.lastName,
                              email: profile.email,
                              empCode: profile.empCode ?? undefined,
                              companyId: profile.companyId ?? undefined,
                              companyName: profile.companyName ?? undefined,
                            }}
                          />
                        ) : (
                          !loadingProfile && (
                            <div className="rounded-4xl border border-rose-200/60 bg-rose-50 p-6 text-sm text-rose-600 shadow-sm">
                              Unable to load profile details. Please try another search.
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </div>
                )}

                {tab === 'attendance' && (
                  <div className="grid gap-4">
                    <h3 className="text-lg font-semibold">Attendance</h3>
                    <AttendanceCalendar />
                  </div>
                )}

                {tab === 'leaves' && (
                  <div className="grid gap-4">
                    <LeaveDashboard />
                  </div>
                )}

                {tab === 'summary' && (
                  <div className="grid gap-4">
                    <h3 className="text-lg font-semibold">Attendance Summary</h3>
                    <div className="border border-dashed rounded-md p-8 text-center text-sm text-slate-600">No summary available</div>
                  </div>
                )}

                {tab === 'approvals' && (
                  <div className="space-y-5">
                    <div className="rounded-3xl border border-white/60 bg-white/90 px-6 py-5 shadow-sm backdrop-blur">
                      <div className="flex flex-col gap-2">
                        <h3 className="text-xl font-semibold text-slate-900">Leave Approvals (Reporting Officer)</h3>
                        <p className="text-sm text-slate-600">Review items approved by HR and finalize approvals.</p>
                      </div>
                    </div>
                    <div className="rounded-3xl border border-white/60 bg-white/95 p-6 shadow-sm backdrop-blur">
                      <LeavePendingList mode="ro" />
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

function SidebarButton({ collapsed, active, onClick, children, icon }: { collapsed?: boolean; active?: boolean; onClick: () => void; children: React.ReactNode; icon?: React.ReactNode }) {
  const label = typeof children === 'string' ? children : undefined;
  return (
    <button
      onClick={onClick}
      title={collapsed ? label : undefined}
      aria-current={active ? 'page' : undefined}
      className={`relative w-full rounded-lg transition-all duration-200 flex items-center gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/40 ${
        collapsed ? 'lg:justify-center lg:px-2 lg:py-3 px-4 py-3' : 'px-4 py-3'
      } ${
        active
          ? 'bg-white/10 text-white border border-white/20 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]'
          : 'text-gray-200 hover:bg-white/5 hover:text-white/95 border border-transparent hover:border-white/10'
      }`}
    >
      {active && (
        <span aria-hidden className="absolute inset-y-0 left-0 w-0.5 bg-brand-400/90 rounded-r" />
      )}
      {icon && (
        <span
          className={`${
            collapsed
              ? `shrink-0 rounded-md border ${active ? 'border-brand-300 bg-brand-500/20 text-brand-100' : 'border-white/10 text-gray-200'} p-2 hover:bg-white/10`
              : `${active ? 'text-white' : 'text-gray-200'} shrink-0`
          }`}
        >
          {icon}
        </span>
      )}
      <span className={`${collapsed ? 'lg:hidden truncate' : 'truncate'} text-[0.925rem] font-medium tracking-wide`}>
        {children}
      </span>
    </button>
  );
}

function KpiCard({ label, value, tone, trend }: { label: string; value: string | number; tone: 'emerald' | 'sky' | 'violet' | 'amber'; trend: string }) {
  const palette: Record<typeof tone, { gradient: string; ring: string; dot: string }> = {
    emerald: { gradient: 'from-emerald-500/20 to-emerald-600/30', ring: 'ring-emerald-400/40', dot: 'bg-emerald-500' },
    sky: { gradient: 'from-sky-500/20 to-blue-500/25', ring: 'ring-sky-400/40', dot: 'bg-sky-500' },
    violet: { gradient: 'from-violet-500/20 to-indigo-500/25', ring: 'ring-violet-400/40', dot: 'bg-violet-500' },
    amber: { gradient: 'from-amber-500/25 to-orange-500/30', ring: 'ring-amber-400/40', dot: 'bg-amber-500' },
  };
  const colors = palette[tone];
  return (
    <div className={`relative overflow-hidden rounded-2xl border border-white/60 bg-white/80 p-5 shadow-sm backdrop-blur ring-1 ${colors.ring}`}>
      <div className={`absolute inset-0 bg-gradient-to-br ${colors.gradient} opacity-60`} aria-hidden />
      <div className="relative space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
          <span className={`h-1.5 w-1.5 rounded-full ${colors.dot}`} />
          {label}
        </div>
        <div className="text-3xl font-semibold text-slate-900">{value}</div>
        <div className="text-xs text-slate-500">{trend}</div>
      </div>
    </div>
  );
}

function IconUser() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 14c-4.418 0-8 2.239-8 5v1h16v-1c0-2.761-3.582-5-8-5z" />
    </svg>
  );
}
function IconCalendar() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-5 w-5">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" strokeWidth="1.5" />
      <path d="M16 2v4M8 2v4M3 10h18" strokeWidth="1.5" />
    </svg>
  );
}
function IconChart() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-5 w-5">
      <path strokeWidth="1.5" d="M3 3v18h18" />
      <rect x="6" y="12" width="3" height="6" strokeWidth="1.5" />
      <rect x="11" y="9" width="3" height="9" strokeWidth="1.5" />
      <rect x="16" y="6" width="3" height="12" strokeWidth="1.5" />
    </svg>
  );
}
function IconHome() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 10.5l9-7 9 7" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M5 10v9a1 1 0 001 1h12a1 1 0 001-1v-9" />
    </svg>
  );
}
function IconLeaf() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-5 w-5">
      <path strokeWidth="1.5" d="M3 12c7-9 18-9 18-9s0 11-9 18c-2.5 2.5-6.5 2.5-9 0-2.5-2.5-2.5-6.5 0-9z" />
      <path strokeWidth="1.5" d="M9 15l6-6" />
    </svg>
  );
}
function IconCheck() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M5 13l4 4L19 7" />
    </svg>
  );
}
