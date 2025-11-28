import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import { useAuth } from '../../context/AuthContext';
import ProfilePanel from '../../components/ProfilePanel';
import AttendanceCalendar from '../../components/AttendanceCalendar';
import LeaveDashboard from '../../components/LeaveDashboard';
import LeaveApplyForm from '../../components/LeaveApplyForm';
import LeaveMyRequests from '../../components/LeaveMyRequests';

type TabKey = 'dashboard' | 'profile' | 'attendance' | 'leaves' | 'apply' | 'requests';

const EMP_TAB_KEYS: TabKey[] = ['dashboard', 'profile', 'attendance', 'leaves', 'apply', 'requests'];

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => {
    const saved = localStorage.getItem('emp-sidebar-open');
    return saved ? saved === '1' : true;
  });
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState<TabKey>(() => {
    const param = searchParams.get('view');
    return EMP_TAB_KEYS.includes(param as TabKey) ? (param as TabKey) : 'dashboard';
  });

  useEffect(() => {
    localStorage.setItem('emp-sidebar-open', sidebarOpen ? '1' : '0');
  }, [sidebarOpen]);

  useEffect(() => {
    const param = searchParams.get('view');
    const resolved = EMP_TAB_KEYS.includes(param as TabKey) ? (param as TabKey) : 'dashboard';
    if (resolved !== tab) {
      setTab(resolved);
    }
  }, [searchParams, tab]);

  const handleTabChange = (next: TabKey) => {
    setTab(next);
    const params = new URLSearchParams(searchParams);
    if (next === 'dashboard') {
      params.delete('view');
    } else {
      params.set('view', next);
    }
    setSearchParams(params, { replace: true });
  };

  const title = useMemo(() => {
    switch (tab) {
      case 'dashboard':
        return 'Overview';
      case 'profile':
        return 'Your Profile';
      case 'attendance':
        return 'Your Attendance';
      case 'leaves':
        return 'Leave Details';
      case 'apply':
        return 'Apply for Leave';
      case 'requests':
        return 'My Leave Requests';
      default:
        return 'Overview';
    }
  }, [tab]);

  const heroRole = user?.role === 'hr' ? 'Human Resources' : 'Employee';
  const displayName = useMemo(() => {
    if (user?.firstName || user?.lastName) {
      return [user?.firstName, user?.lastName].filter(Boolean).join(' ');
    }
    return 'Valued Team Member';
  }, [user?.firstName, user?.lastName]);

  const statCards = useMemo(
    () => [
      {
        id: 'pending',
        label: 'Pending Requests',
        value: '--',
        hint: 'Awaiting approval',
        accent: 'from-brand-500/90 to-brand-600',
      },
      {
        id: 'balance',
        label: 'Leave Balance',
        value: '--',
        hint: 'Updated monthly',
        accent: 'from-emerald-500/90 to-emerald-600',
      },
      {
        id: 'present',
        label: 'Present Today',
        value: '--',
        hint: 'Synced with attendance',
        accent: 'from-sky-500/90 to-blue-600',
      },
      {
        id: 'onleave',
        label: 'On Leave',
        value: '--',
        hint: 'Scheduled time off',
        accent: 'from-violet-500/90 to-indigo-600',
      },
    ],
    []
  );

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-100 via-white to-emerald-50">
      {/* Shift Navbar with sidebar so logo stays visible */}
      <div className={`relative z-50 transition-[margin] duration-300 ease-out ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-16'}`}>
        <Navbar />
      </div>

      <main className="relative flex-1 min-h-0">
        {/* Mobile overlay when sidebar open (start below navbar) */}
        {sidebarOpen && (
          <div className="fixed inset-x-0 top-14 bottom-0 z-30 bg-black/20 lg:hidden" onClick={() => setSidebarOpen(false)} aria-hidden />
        )}

        {/* Sidebar */}
        <aside
          className={`z-40 fixed left-0 top-14 bottom-0 lg:top-0 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-800 border-r border-white/10 shadow-xl transform transition-[transform,width] duration-300 ease-out ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          } ${sidebarOpen ? 'w-64 lg:w-64' : 'w-64 lg:w-16'}`}
          aria-label="Sidebar"
        >
          <div className="h-full flex flex-col">
            {/* Fixed-height header */}
            <div className="px-3 h-12 border-b border-white/10 flex items-center justify-between text-white">
              <div className="text-sm font-medium">{sidebarOpen ? 'Menu' : ''}</div>
              <button
                type="button"
                className={`hidden lg:inline-flex items-center justify-center w-8 h-8 rounded-md border border-white/20 hover:bg-white/10 text-white`}
                onClick={() => setSidebarOpen((s) => !s)}
                aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
                title={sidebarOpen ? 'Hide menu' : 'Show menu'}
              >
                {sidebarOpen ? <IconCollapse /> : <IconExpand />}
              </button>
            </div>

            <nav className={`overflow-y-auto flex-1 text-gray-200 ${sidebarOpen ? 'p-2' : 'p-2 lg:p-1'} space-y-1`}>
              <SidebarButton collapsed={!sidebarOpen} active={tab === 'dashboard'} onClick={() => handleTabChange('dashboard')} icon={<IconHome />}>Dashboard</SidebarButton>
              <SidebarButton collapsed={!sidebarOpen} active={tab === 'profile'} onClick={() => handleTabChange('profile')} icon={<IconUser />}>Profile</SidebarButton>
              <SidebarButton collapsed={!sidebarOpen} active={tab === 'attendance'} onClick={() => handleTabChange('attendance')} icon={<IconCalendar />}>Attendance</SidebarButton>
              <SidebarButton collapsed={!sidebarOpen} active={tab === 'leaves'} onClick={() => handleTabChange('leaves')} icon={<IconLeaf />}>Leave Details</SidebarButton>
              <SidebarButton collapsed={!sidebarOpen} active={tab === 'apply'} onClick={() => handleTabChange('apply')} icon={<IconPaper />}>Apply for Leave</SidebarButton>
              <SidebarButton collapsed={!sidebarOpen} active={tab === 'requests'} onClick={() => handleTabChange('requests')} icon={<IconClipboard />}>My Requests</SidebarButton>
            </nav>

            <div className="px-3 pb-3 pt-3 border-t border-white/10 hidden lg:block" />
          </div>
        </aside>

        {/* Content area shifts with sidebar width */}
        <div className={`transition-[margin] duration-300 ease-out ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-16'}`}>
          <div className="container mx-auto px-4 py-8 lg:py-10">
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.3em] text-emerald-600">Dashboard</p>
                  <h2 className="text-2xl lg:text-3xl font-semibold text-slate-900">Welcome back, {displayName}</h2>
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

              {tab === 'dashboard' && (
                <div className="space-y-8">
                  <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-emerald-800 to-emerald-600 text-white shadow-[0_30px_80px_-40px_rgba(15,64,45,0.6)]">
                    <div className="absolute inset-0 opacity-40" style={{ backgroundImage: 'radial-gradient(circle at top right, rgba(255,255,255,0.35), transparent 45%), radial-gradient(circle at bottom left, rgba(255,255,255,0.2), transparent 55%)' }} aria-hidden />
                    <div className="relative grid gap-6 p-6 sm:grid-cols-3 sm:items-center sm:p-8">
                      <div className="sm:col-span-2 space-y-3">
                        <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs uppercase tracking-wide">
                          <span className="inline-flex h-2 w-2 rounded-full bg-emerald-300" /> {heroRole}
                        </div>
                        <h3 className="text-2xl sm:text-3xl font-semibold leading-tight">Employee Control Center</h3>
                        <p className="text-sm text-emerald-100/90 sm:text-base">
                          Monitor attendance, track your leave balances, and keep your profile up-to-date from a single, modern workspace.
                        </p>
                        <div className="flex flex-wrap gap-2 text-xs text-emerald-100/80">
                          <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" /> Real-time attendance sync
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" /> Smart leave overview
                          </span>
                        </div>
                      </div>
                      <div className="sm:col-span-1 flex sm:flex-col sm:items-end gap-3">
                        <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur">
                          <div className="text-3xl font-semibold">{new Intl.DateTimeFormat('en-US', { day: '2-digit' }).format(new Date())}</div>
                          <div className="text-xs uppercase tracking-wide text-emerald-100/70">{new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(new Date())}</div>
                        </div>
                        <div className="hidden sm:block text-xs text-emerald-100/80">
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {statCards.map((card) => (
                      <div
                        key={card.id}
                        className="relative overflow-hidden rounded-2xl border border-white/40 bg-white/80 p-5 shadow-sm backdrop-blur transition hover:-translate-y-1 hover:shadow-md"
                      >
                        <div className={`absolute inset-0 bg-gradient-to-br ${card.accent} opacity-[0.12]`} aria-hidden />
                        <div className="relative space-y-2">
                          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{card.label}</div>
                          <div className="text-2xl font-semibold text-slate-900">{card.value}</div>
                          <div className="text-xs text-slate-500">{card.hint}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="grid gap-4 lg:grid-cols-3">
                    <div className="rounded-3xl border border-emerald-100 bg-white/90 p-6 shadow-sm backdrop-blur lg:col-span-2">
                      <h4 className="text-base font-semibold text-slate-900">Quick Actions</h4>
                      <p className="mt-1 text-sm text-slate-600">Jump straight into the tools you use every day.</p>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <button
                          type="button"
                          className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
                          onClick={() => handleTabChange('apply')}
                        >
                          Apply for Leave
                        </button>
                        <button
                          type="button"
                          className="inline-flex items-center justify-center rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300"
                          onClick={() => handleTabChange('requests')}
                        >
                          View My Requests
                        </button>
                      </div>
                    </div>
                    <div className="rounded-3xl border border-amber-100 bg-amber-50/80 p-6 shadow-sm">
                      <h4 className="text-base font-semibold text-amber-900">At a Glance</h4>
                      <ul className="mt-3 space-y-2 text-sm text-amber-900/90">
                        <li className="flex items-start gap-2">
                          <span className="mt-1 h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden />
                          Attendance cycle is active
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="mt-1 h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden />
                          Leave balances refresh monthly
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="mt-1 h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden />
                          Use the left menu to explore modules
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              <section className="space-y-6">
                {tab === 'attendance' && (
                  <div className="rounded-3xl border border-white/50 bg-white/90 p-3 shadow-[0_25px_50px_-30px_rgba(15,64,45,0.2)] backdrop-blur">
                    <AttendanceCalendar />
                  </div>
                )}

                {tab === 'leaves' && (
                  <div className="rounded-3xl border border-white/60 bg-white/95 p-6 shadow-sm">
                    <LeaveDashboard />
                  </div>
                )}

                {tab === 'apply' && (
                  <div className="space-y-6">
                    <div className="relative overflow-hidden rounded-4xl border border-emerald-500/20 bg-gradient-to-r from-emerald-700 via-emerald-600 to-emerald-500 p-6 text-white shadow-[0_36px_120px_-60px_rgba(4,72,40,0.85)]">
                      <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at top right, rgba(255,255,255,0.35), transparent 45%), radial-gradient(circle at bottom left, rgba(45,212,191,0.25), transparent 55%)' }} aria-hidden />
                      <div className="relative z-10 space-y-3">
                        <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-100">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" /> Leave Application Hub
                        </div>
                        <div className="space-y-1">
                          <h3 className="text-2xl font-semibold leading-tight">Craft a polished leave request</h3>
                          <p className="text-sm text-emerald-100/85">Submit supporting documents, add alternates, and track approvals in one streamlined workflow.</p>
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs text-emerald-100/80">
                          <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" /> Attachment uploads up to 2 MB
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" /> Automatic balance checks for EL
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-4xl border border-white/70 bg-white/95 p-6 shadow-[0_30px_90px_-55px_rgba(15,64,45,0.35)]">
                      <LeaveApplyForm />
                    </div>
                  </div>
                )}

                {tab === 'profile' && (
                  <div className="space-y-6">
                    <div className="relative overflow-hidden rounded-4xl border border-emerald-500/20 bg-gradient-to-r from-emerald-700 via-emerald-600 to-emerald-500 p-6 text-white shadow-[0_36px_120px_-60px_rgba(4,72,40,0.85)]">
                      <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at top right, rgba(255,255,255,0.35), transparent 45%), radial-gradient(circle at bottom left, rgba(45,212,191,0.25), transparent 55%)' }} aria-hidden />
                      <div className="relative z-10 space-y-3">
                        <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-100">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" /> Your profile
                        </div>
                        <div className="space-y-1">
                          <h3 className="text-2xl font-semibold leading-tight">Keep personal information current</h3>
                          <p className="text-sm text-emerald-100/85">Update contacts, confirm demographics, and ensure HR can reach you without delay.</p>
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs text-emerald-100/80">
                          <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-300" /> Photo + identity details</span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-300" /> Secure profile editing</span>
                        </div>
                      </div>
                    </div>
                    <div className="relative overflow-hidden rounded-4xl border border-white/70 bg-white/98 p-6 shadow-[0_30px_90px_-55px_rgba(15,64,45,0.35)]">
                      <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at top left, rgba(16,185,129,0.12), transparent 55%), radial-gradient(circle at bottom right, rgba(56,189,248,0.12), transparent 55%)' }} aria-hidden />
                      <div className="relative z-10">
                        <ProfilePanel />
                      </div>
                    </div>
                  </div>
                )}
                {tab === 'requests' && (
                  <div className="space-y-6">
                    <div className="relative overflow-hidden rounded-4xl border border-emerald-500/25 bg-gradient-to-r from-emerald-800 via-emerald-600 to-emerald-500 p-6 text-white shadow-[0_36px_120px_-60px_rgba(4,72,40,0.85)]">
                      <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at top left, rgba(255,255,255,0.35), transparent 45%), radial-gradient(circle at bottom right, rgba(5,150,105,0.35), transparent 55%)' }} aria-hidden />
                      <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                        <div className="space-y-3">
                          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-100">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" /> Request history
                          </div>
                          <div className="space-y-1">
                            <h3 className="text-2xl font-semibold leading-tight">Monitor every submission at a glance</h3>
                            <p className="text-sm text-emerald-100/85 max-w-xl">Statuses refresh as HR takes action. Revisit attachments, compare durations, and stay informed.</p>
                          </div>
                          <div className="flex flex-wrap gap-2 text-xs text-emerald-100/85">
                            <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-300" /> Real-time status sync</span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-300" /> Tabular tracking view</span>
                          </div>
                        </div>
                        <div className="grid gap-2 text-xs text-emerald-100/85">
                          <span className="inline-flex items-center gap-2 self-end rounded-full bg-white/10 px-3 py-1 font-semibold">Latest update <span className="rounded-full bg-emerald-300/90 px-2 py-0.5 text-[11px] uppercase text-emerald-900">Live</span></span>
                          <span className="inline-flex items-center gap-2 self-end rounded-full bg-white/10 px-3 py-1 font-semibold">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-3.5 w-3.5">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 5v14m7-7H5" />
                            </svg>
                            Export timeline
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="relative overflow-hidden rounded-4xl border border-white/80 bg-white/98 shadow-[0_30px_90px_-55px_rgba(15,64,45,0.38)]">
                      <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at top left, rgba(16,185,129,0.12), transparent 55%), radial-gradient(circle at bottom right, rgba(56,189,248,0.12), transparent 55%)' }} aria-hidden />
                      <div className="relative z-10">
                        <div className="flex flex-col gap-2 border-b border-emerald-100/70 bg-gradient-to-r from-emerald-50 via-white to-emerald-50 px-6 py-4">
                          <h4 className="text-base font-semibold text-slate-900">My Leave Requests</h4>
                          <p className="text-xs text-slate-500">Statuses update when HR reviews your request.</p>
                        </div>
                        <div className="px-6 py-5">
                          <LeaveMyRequests />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </section>
            </div>
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
      className={`relative w-full rounded-md transition-colors flex items-center gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/40 ${
        collapsed ? 'lg:justify-center lg:px-2 lg:py-3 px-4 py-3' : 'px-4 py-3'
      } ${!collapsed && active ? 'bg-white/10 text-white border border-white/10' : 'text-gray-300 hover:bg-white/5 hover:text-gray-100'}`}
    >
      {active && <span aria-hidden className="absolute inset-y-0 left-0 w-0.5 bg-brand-500 rounded-r" />}
      {icon && (
        <span className={`${collapsed ? `shrink-0 rounded-md border ${active ? 'border-brand-300 bg-brand-500/20 text-brand-200' : 'border-white/10 text-gray-300'} p-2 hover:bg-white/10` : `${active ? 'text-white' : 'text-gray-300'} shrink-0`}`}>
          {icon}
        </span>
      )}
      <span className={collapsed ? 'lg:hidden truncate' : 'truncate'}>{children}</span>
    </button>
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

function IconHome() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 10.5l9-7 9 7" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M5 10v9a1 1 0 001 1h12a1 1 0 001-1v-9" />
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

function IconCollapse() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function IconExpand() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5l7 7-7 7" />
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

function IconPaper() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 3h7l5 5v13a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M14 3v4h4" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 13h6M9 17h6M9 9h1" />
    </svg>
  );
}

function IconClipboard() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-5 w-5">
      <rect x="7" y="3" width="10" height="18" rx="2" ry="2" strokeWidth="1.5" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 3v2h6V3" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6M9 16h4" />
    </svg>
  );
}
