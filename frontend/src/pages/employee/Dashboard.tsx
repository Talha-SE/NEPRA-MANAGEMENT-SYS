import { useEffect, useMemo, useState } from 'react';
import Navbar from '../../components/Navbar';
import { useAuth } from '../../context/AuthContext';
import ProfilePanel from '../../components/ProfilePanel';
import DailyAttendance from '../../components/DailyAttendance';

type TabKey = 'attendance' | 'profile';

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => {
    const saved = localStorage.getItem('emp-sidebar-open');
    return saved ? saved === '1' : true;
  });
  const [tab, setTab] = useState<TabKey>('attendance');

  useEffect(() => {
    localStorage.setItem('emp-sidebar-open', sidebarOpen ? '1' : '0');
  }, [sidebarOpen]);

  const title = useMemo(() => (tab === 'attendance' ? 'Your Attendance' : 'Your Profile'), [tab]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Shift Navbar with sidebar so logo stays visible */}
      <div className={`relative z-50 transition-[margin] duration-300 ease-out ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-16'}`}>
        <Navbar />
      </div>

      <main className="relative flex-1 min-h-0">
        {/* Mobile overlay when sidebar open */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-30 bg-black/20 lg:hidden" onClick={() => setSidebarOpen(false)} aria-hidden />
        )}

        {/* Sidebar */}
        <aside
          className={`z-40 fixed inset-y-0 left-0 bg-gradient-to-b from-white to-gray-50 border-r border-gray-200 shadow-sm transform transition-[transform,width] duration-300 ease-out ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          } ${sidebarOpen ? 'w-64 lg:w-64' : 'w-64 lg:w-16'}`}
          aria-label="Sidebar"
        >
          <div className="h-full flex flex-col">
            {/* Fixed-height header */}
            <div className="px-3 h-12 border-b flex items-center justify-between">
              <div className="text-sm font-medium text-gray-700">{sidebarOpen ? 'Menu' : ''}</div>
              <button
                type="button"
                className={`hidden lg:inline-flex items-center justify-center w-8 h-8 rounded-md border border-gray-200 hover:bg-gray-50`}
                onClick={() => setSidebarOpen((s) => !s)}
                aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
                title={sidebarOpen ? 'Hide menu' : 'Show menu'}
              >
                {sidebarOpen ? <IconCollapse /> : <IconExpand />}
              </button>
            </div>

            <nav className={`overflow-y-auto flex-1 ${sidebarOpen ? 'p-2' : 'p-2 lg:p-1'} space-y-1`}>
              <SidebarButton collapsed={!sidebarOpen} active={tab === 'attendance'} onClick={() => setTab('attendance')} icon={<IconCalendar />}>Attendance</SidebarButton>
              <SidebarButton collapsed={!sidebarOpen} active={tab === 'profile'} onClick={() => setTab('profile')} icon={<IconUser />}>Profile</SidebarButton>
            </nav>

            <div className="px-3 pb-3 pt-3 border-t hidden lg:block" />
          </div>
        </aside>

        {/* Content area shifts with sidebar width */}
        <div className={`transition-[margin] duration-300 ease-out ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-16'}`}>
          <div className="container mx-auto px-4 py-6 lg:py-8">
            <div className="flex items-center justify-between mb-4 lg:mb-6">
              <div>
                <h2 className="text-xl lg:text-2xl font-semibold">Employee Dashboard</h2>
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
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-5 w-5">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 7h16M4 12h16M4 17h16" />
                  </svg>
                </button>
              </div>
            </div>

            <section>
              <div className="card">
                <div className="card-body">
                  <div className="h-1 bg-gradient-to-r from-brand-500 to-brand-700 rounded-t-xl -mx-6 -mt-6 mb-6" />

                  {tab === 'attendance' && (
                    <div className="grid gap-4">
                      <h3 className="text-lg font-semibold">Attendance</h3>
                      <DailyAttendance />
                    </div>
                  )}

                  {tab === 'profile' && (
                    <div className="grid gap-4">
                      <ProfilePanel />
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
      {active && <span aria-hidden className="absolute inset-y-0 left-0 w-0.5 bg-brand-500 rounded-r" />}
      {icon && (
        <span className={`${collapsed ? 'shrink-0 text-gray-600 rounded-md border ' + (active ? 'border-brand-300 bg-brand-50 text-brand-700' : 'border-transparent') + ' p-2 hover:bg-gray-50' : 'shrink-0 text-gray-500'}`}>
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
