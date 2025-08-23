import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="font-semibold text-brand-700">NEPRA EMS</Link>
        <div className="flex items-center gap-3">
          {user && (
            <span className="px-2 py-1 text-xs rounded bg-brand-100 text-brand-700 capitalize">{user.role}</span>
          )}
          {user ? (
            <button onClick={logout} className="btn btn-secondary">Logout</button>
          ) : (
            <Link to="/" className="btn btn-secondary">Home</Link>
          )}
        </div>
      </div>
    </nav>
  );
}
