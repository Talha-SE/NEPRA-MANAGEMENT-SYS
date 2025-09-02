import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useEffect, useMemo, useRef, useState } from 'react';
import { apiGetProfile, assetUrl } from '../lib/api';

export default function Navbar() {
  const { user, logout } = useAuth();
  const dashboardPath = user?.role === 'hr' ? '/hr/dashboard' : '/employee/dashboard';

  // Profile photo for avatar
  const [photo, setPhoto] = useState<string | null>(null);
  const initials = useMemo(() => {
    if (!user) return '';
    const parts = [user.firstName?.[0], user.lastName?.[0]].filter(Boolean).join('');
    return parts || user.email?.[0] || '?';
  }, [user]);
  const avatarSrc = useMemo(() => {
    if (!photo) return undefined;
    let s = photo.replace(/\\/g, '/');
    const i = s.toLowerCase().indexOf('uploads');
    if (i >= 0) s = s.slice(i);
    if (!s.startsWith('/')) s = '/' + s;
    return assetUrl(s);
  }, [photo]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!user) { setPhoto(null); return; }
      try {
        const p = await apiGetProfile();
        if (mounted) setPhoto(p.photo ?? null);
      } catch {
        if (mounted) setPhoto(null);
      }
    })();
    return () => { mounted = false; };
  }, [user?.id]);

  // Dropdown state and outside click
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (open && menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

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
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                className="relative h-9 w-9 rounded-full overflow-hidden border bg-white ring-0 focus:outline-none focus:ring-2 focus:ring-brand-300 transition cursor-pointer group"
                aria-haspopup="menu"
                aria-expanded={open}
                onClick={() => setOpen((v) => !v)}
                title="Account"
              >
                {avatarSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarSrc} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full grid place-items-center text-xs font-semibold text-brand-700 bg-brand-50">
                    {initials}
                  </div>
                )}
                <span className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition" />
              </button>

              {open && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-44 rounded-lg border bg-white shadow-lg p-1 animate-in fade-in zoom-in"
                >
                  <Link
                    to={dashboardPath}
                    className="block px-3 py-2 rounded hover:bg-gray-50 text-sm font-medium"
                    onClick={() => setOpen(false)}
                  >
                    Dashboard
                  </Link>
                  <button
                    onClick={async () => { setOpen(false); await logout(); }}
                    className="w-full text-left block px-3 py-2 rounded hover:bg-gray-50 text-sm text-red-600"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
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
