import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-white via-brand-50/30 to-white">
      <Navbar />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          {/* Responsive emerald background layer */}
          <div aria-hidden className="absolute inset-0 -z-10">
            {/* mobile */}
            <div className="block sm:hidden h-64 bg-gradient-to-b from-emerald-100 to-transparent" />
            {/* tablet/desktop */}
            <div className="hidden sm:block h-[420px] bg-gradient-to-b from-emerald-100 to-transparent" />
          </div>

          {/* Decorative blobs (responsive positions to avoid clipping) */}
          <div className="pointer-events-none absolute right-0 top-4 sm:-top-24 sm:-right-24 h-56 w-56 sm:h-72 sm:w-72 rounded-full bg-brand-200/40 blur-3xl" />
          <div className="pointer-events-none absolute left-0 bottom-0 sm:-bottom-24 sm:-left-24 h-56 w-56 sm:h-72 sm:w-72 rounded-full bg-emerald-200/40 blur-3xl" />

          <div className="container mx-auto px-4 py-16">
            <div className="mx-auto max-w-4xl text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white/60 px-3 py-1 text-xs text-brand-700 backdrop-blur">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-600" /> Employee Management System
              </div>
              <div className="mt-6 flex flex-col items-center gap-4">
                <img src="/nepra-logo.png" alt="NEPRA EMS" className="h-16 sm:h-20 md:h-24 w-auto" />
                <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight">NEPRA EMS</h1>
                <p className="max-w-2xl text-gray-600">A modern, secure platform for Human Resource and Employees to manage organizational data, access dashboards, and streamline workflows.</p>
              </div>
            </div>

            {/* Role cards */}
            <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
              {/* HR Card */}
              <div className="card group hover:shadow-md transition-shadow">
                <div className="card-body">
                  <div className="h-1 bg-gradient-to-r from-brand-500 to-brand-700 rounded-t-xl -mx-6 -mt-6 mb-6" />
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-brand-50 text-brand-700 grid place-items-center">
                        {/* briefcase icon */}
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-5 w-5">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8.25 6.75V6A2.25 2.25 0 0110.5 3.75h3A2.25 2.25 0 0115.75 6v.75M4.5 9.75A2.25 2.25 0 016.75 7.5h10.5A2.25 2.25 0 0119.5 9.75v7.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 17.25v-7.5zM9 12h6" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">Human Resource</h3>
                        <p className="text-sm text-gray-500">Manage employees and organizational records.</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <Link to="/login/hr" className="btn btn-primary">Login</Link>
                    <Link to="/register/hr" className="btn btn-secondary">Register</Link>
                  </div>
                </div>
              </div>

              {/* Employee Card */}
              <div className="card group hover:shadow-md transition-shadow">
                <div className="card-body">
                  <div className="h-1 bg-gradient-to-r from-emerald-500 to-emerald-700 rounded-t-xl -mx-6 -mt-6 mb-6" />
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-emerald-50 text-emerald-700 grid place-items-center">
                        {/* user icon */}
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-5 w-5">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 14.25c-3.728 0-6.75 2.186-6.75 4.875V21h13.5v-1.875c0-2.689-3.022-4.875-6.75-4.875z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 12a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">Employee</h3>
                        <p className="text-sm text-gray-500">Access your dashboard and profile.</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <Link to="/login/employee" className="btn btn-primary">Login</Link>
                    <Link to="/register/employee" className="btn btn-secondary">Register</Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="border-t border-gray-200 bg-white/70 backdrop-blur">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <img src="/nepra-logo.png" alt="NEPRA" className="h-5 w-auto" />
              <span>© 2025 NEPRA EMS</span>
            </div>
            <nav className="flex flex-wrap items-center gap-4 text-sm">
              <Link to="/login/hr" className="text-gray-600 hover:text-gray-900">HR Login</Link>
              <Link to="/register/hr" className="text-gray-600 hover:text-gray-900">HR Register</Link>
              <span className="hidden sm:block h-4 w-px bg-gray-300" />
              <Link to="/login/employee" className="text-gray-600 hover:text-gray-900">Employee Login</Link>
              <Link to="/register/employee" className="text-gray-600 hover:text-gray-900">Employee Register</Link>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}
