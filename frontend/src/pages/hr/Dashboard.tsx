import { useEffect, useMemo, useState } from 'react';
import Navbar from '../../components/Navbar';
import ProfilePanel from '../../components/ProfilePanel';
import { useAuth } from '../../context/AuthContext';
import WeeklyAttendance from '../../components/WeeklyAttendance';
import TodayAttendance from '../../components/TodayAttendance';

type TabKey = 'profile' | 'attendance' | 'summary' | 'approvals';

export default function HRDashboard() {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => {
    // persist between reloads
    const saved = localStorage.getItem('hr-sidebar-open');
    return saved ? saved === '1' : true;
  });
  const [tab, setTab] = useState<TabKey>('profile');

  useEffect(() => {
    localStorage.setItem('hr-sidebar-open', sidebarOpen ? '1' : '0');
  }, [sidebarOpen]);

  const title = useMemo(() => {
    switch (tab) {
      case 'profile':
        return 'Profile';
      case 'attendance':
        return 'View Attendance';
      case 'summary':
        return 'Attendance Summary';
      case 'approvals':
        return 'Leave Approvals';
      default:
        return 'HR Dashboard';
    }
  }, [tab]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Shift Navbar with sidebar so logo never sits under the rail */}
      <div className={`relative z-50 transition-[margin] duration-300 ease-out ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-16'}`}>
        <Navbar />
      </div>
      <main className="relative flex-1 min-h-0">
        {/* Mobile overlay when sidebar open */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/20 lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-hidden
          />
        )}

        {/* Fixed left sidebar with smooth slide (mobile) and collapsible rail (desktop) */}
        <aside
          className={`z-40 fixed inset-y-0 left-0 bg-white border-r shadow-sm transform transition-[transform,width] duration-300 ease-out ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          } ${sidebarOpen ? 'w-64 lg:w-64' : 'w-64 lg:w-16'}`}
          aria-label="Sidebar"
        >
          <div className="h-full flex flex-col">
            {/* Fixed-height header so layout doesn't jump when collapsing */}
            <div className="px-3 h-12 border-b flex items-center justify-between">
              <div className="text-sm font-medium text-gray-700">
                {sidebarOpen ? 'Menu' : ''}
              </div>
              {/* Desktop toggle pinned top-right for consistent position */}
              <button
                type="button"
                className={`inline-flex items-center justify-center rounded-md border transition-colors ${
                  sidebarOpen ? 'w-8 h-8 border-gray-200 hover:bg-gray-50' : 'w-8 h-8 border-gray-200 hover:bg-gray-50'
                } hidden lg:inline-flex`}
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
            <nav className={`overflow-y-auto flex-1 ${sidebarOpen ? 'p-2' : 'p-2 lg:p-1'} space-y-1`}>
              <SidebarButton collapsed={!sidebarOpen} active={tab === 'profile'} onClick={() => setTab('profile')} icon={<IconUser />}>
                Profile
              </SidebarButton>
              <SidebarButton collapsed={!sidebarOpen} active={tab === 'attendance'} onClick={() => setTab('attendance')} icon={<IconCalendar />}>
                View Attendance
              </SidebarButton>
              <SidebarButton collapsed={!sidebarOpen} active={tab === 'summary'} onClick={() => setTab('summary')} icon={<IconChart />}>
                Attendance Summary
              </SidebarButton>
              <SidebarButton collapsed={!sidebarOpen} active={tab === 'approvals'} onClick={() => setTab('approvals')} icon={<IconCheck />}>
                Leave Approvals
              </SidebarButton>
            </nav>
            {/* Bottom spacer keeps consistent padding but no toggle here to avoid vertical drift */}
            <div className="px-3 pb-3 pt-3 border-t hidden lg:block" />
          </div>
        </aside>
        {/* Content area shifts with sidebar width */}
        <div className={`transition-[margin] duration-300 ease-out ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-16'}`}>
          <div className="container mx-auto px-4 py-6 lg:py-8">
            <div className="flex items-center justify-between mb-4 lg:mb-6">
              <div>
                <h2 className="text-xl lg:text-2xl font-semibold">HR Dashboard</h2>
                <p className="text-sm text-gray-600">{title}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="btn btn-secondary lg:hidden"
                  onClick={() => setSidebarOpen((s) => !s)}
                  aria-label={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
                  title={sidebarOpen ? 'Hide menu' : 'Show menu'}
                >
                  {/* menu icon */}
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-5 w-5">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 7h16M4 12h16M4 17h16" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <section>
              <div className="card">
                <div className="card-body">
                  <div className="h-1 bg-gradient-to-r from-brand-500 to-brand-700 rounded-t-xl -mx-6 -mt-6 mb-6" />
                  {tab === 'profile' && (
                    <div className="grid gap-4">
                      <ProfilePanel />
                    </div>
                  )}

                  {tab === 'attendance' && (
                    <div className="grid gap-4">
                      <h3 className="text-lg font-semibold">Attendance</h3>
                      <TodayAttendance />
                      <WeeklyAttendance />
                    </div>
                  )}

                  {tab === 'summary' && (
                    <div className="grid gap-4">
                      <h3 className="text-lg font-semibold">Attendance Summary</h3>
                      <EmptyState title="No summary available" subtitle="Summary metrics will appear once data is available." />
                    </div>
                  )}

                  {tab === 'approvals' && (
                    <div className="grid gap-4">
                      <h3 className="text-lg font-semibold">Leave Approvals</h3>
                      <EmptyState title="No pending requests" subtitle="New leave requests will appear here for action." />
                    </div>
                  )}
                </div>
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
      className={`relative w-full rounded-md transition-colors flex items-center gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60 ${
        collapsed ? 'lg:justify-center lg:px-2 lg:py-3 px-4 py-3' : 'px-4 py-3'
      } ${!collapsed && active ? 'bg-brand-50 text-brand-700 border border-brand-200' : ''} ${!collapsed && !active ? 'hover:bg-gray-50' : ''}`}
    >
      {active && (
        <span aria-hidden className="absolute inset-y-0 left-0 w-0.5 bg-brand-500 rounded-r" />
      )}
      {icon && (
        <span
          className={`${
            collapsed
              ? `shrink-0 text-gray-600 rounded-md border ${
                  active ? 'border-brand-300 bg-brand-50 text-brand-700' : 'border-transparent'
                } p-2 hover:bg-gray-50`
              : 'shrink-0 text-gray-500'
          }`}
        >
          {icon}
        </span>
      )}
      <span className={collapsed ? 'lg:hidden truncate' : 'truncate'}>{children}</span>
    </button>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function EmptyState({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="border border-dashed rounded-md p-8 text-center">
      <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-gray-50">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-5 w-5 text-gray-400">
          <circle cx="12" cy="12" r="9" strokeWidth="1.5" />
          <path d="M8 12h8" strokeWidth="1.5" />
        </svg>
      </div>
      <div className="font-medium">{title}</div>
      {subtitle && <div className="text-sm text-gray-600">{subtitle}</div>}
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

function IconCheck() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M5 13l4 4L19 7" />
    </svg>
  );
}
