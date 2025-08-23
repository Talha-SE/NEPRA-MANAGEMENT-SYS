import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const dashboardPath = user?.role === 'hr' ? '/hr/dashboard' : '/employee/dashboard';
  return (
    <nav className="navbar sticky top-0 z-40 bg-white/80 backdrop-blur">
      <div className="navbar-inner">
        {/* Left: Brand */}
        <Link to="/" className="flex items-center gap-2 font-semibold text-brand-700">
          <img src="/nepra-logo.png" alt="NEPRA" className="h-6 w-auto" />
          <span>NEPRA EMS</span>
        </Link>

        {/* Center: (intentionally empty, no links) */}
        <div className="hidden md:flex items-center gap-6" />

        {/* Right: Auth actions */}
        <div className="flex items-center gap-3">
          {user && (
            <span className="px-2 py-1 text-xs rounded bg-brand-100 text-brand-700 capitalize">{user.role}</span>
          )}
          {user ? (
            <>
              <Link to={dashboardPath} className="btn btn-primary">Dashboard</Link>
              <button onClick={logout} className="btn btn-secondary">Logout</button>
            </>
          ) : (
            <Link to="/" className="btn btn-secondary">Home</Link>
          )}
        </div>
      </div>
      {/* Gradient underline */}
      <div className="h-0.5 bg-gradient-to-r from-brand-500 via-emerald-500 to-brand-600" />
    </nav>
  );
}
