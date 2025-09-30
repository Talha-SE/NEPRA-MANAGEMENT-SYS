import { useEffect, useMemo, useState } from 'react';
import Navbar from '../../components/Navbar';
import { useAuth } from '../../context/AuthContext';
import ProfilePanel from '../../components/ProfilePanel';
import AttendanceCalendar from '../../components/AttendanceCalendar';
import LeaveDashboard from '../../components/LeaveDashboard';
import LeaveApplyForm from '../../components/LeaveApplyForm';
import LeaveMyRequests from '../../components/LeaveMyRequests';

type TabKey = 'dashboard' | 'attendance' | 'leaves' | 'profile';

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => {
    const saved = localStorage.getItem('emp-sidebar-open');
    return saved ? saved === '1' : true;
  });
  const [tab, setTab] = useState<TabKey>('dashboard');

  useEffect(() => {
    localStorage.setItem('emp-sidebar-open', sidebarOpen ? '1' : '0');
  }, [sidebarOpen]);

  const title = useMemo(() => {
    switch (tab) {
      case 'dashboard':
        return 'Overview';
      case 'attendance':
        return 'Your Attendance';
      case 'leaves':
        return 'Leave Details';
      case 'profile':
      default:
        return 'Your Profile';
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
              <SidebarButton collapsed={!sidebarOpen} active={tab === 'dashboard'} onClick={() => setTab('dashboard')} icon={<IconHome />}>Dashboard</SidebarButton>
              <SidebarButton collapsed={!sidebarOpen} active={tab === 'attendance'} onClick={() => setTab('attendance')} icon={<IconCalendar />}>Attendance</SidebarButton>
              <SidebarButton collapsed={!sidebarOpen} active={tab === 'leaves'} onClick={() => setTab('leaves')} icon={<IconLeaf />}>Leave Details</SidebarButton>
              <SidebarButton collapsed={!sidebarOpen} active={tab === 'profile'} onClick={() => setTab('profile')} icon={<IconUser />}>Profile</SidebarButton>
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
                          Stay consistent and keep your records healthy every day.
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
                          onClick={() => setTab('leaves')}
                        >
                          Apply for Leave
                        </button>
                        <button
                          type="button"
                          className="inline-flex items-center justify-center rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300"
                          onClick={() => setTab('attendance')}
                        >
                          View Attendance
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
                  <div className="grid gap-5">
                    <div className="rounded-3xl border border-white/60 bg-white/95 p-6 shadow-sm">
                      <LeaveApplyForm />
                    </div>
                    <div className="rounded-3xl border border-white/60 bg-white/95 p-6 shadow-sm">
                      <LeaveMyRequests />
                    </div>
                    <div className="rounded-3xl border border-white/60 bg-white/95 p-6 shadow-sm">
                      <LeaveDashboard />
                    </div>
                  </div>
                )}

                {tab === 'profile' && (
                  <div className="rounded-3xl border border-white/60 bg-white/95 p-6 shadow-sm">
                    <ProfilePanel />
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
