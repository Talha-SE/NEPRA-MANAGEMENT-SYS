import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { apiLogin } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export default function Home() {
  const navigate = useNavigate();
  const location = useLocation();
  const { refresh } = useAuth();
  const [activeRole, setActiveRole] = useState<'hr' | 'employee' | null>(null);
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const emailRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (activeRole) {
      emailRef.current?.focus();
    }
  }, [activeRole]);

  useEffect(() => {
    const state = location.state as { openLogin?: boolean; role?: 'hr' | 'employee' } | null;
    if (state?.openLogin && state.role) {
      openLoginForm(state.role);
      navigate('/', { replace: true, state: null });
    }
  }, [location.state, navigate]);

  const roleTitle = useMemo(() => {
    if (!activeRole) return '';
    return activeRole === 'hr' ? 'Human Resource Login' : 'Employee Login';
  }, [activeRole]);

  const roleDescription = useMemo(() => {
    if (!activeRole) return '';
    return activeRole === 'hr'
      ? 'Enter your work email and password to manage employees and organizational records.'
      : 'Sign in with your credentials to access your dashboard, profile, and company resources.';
  }, [activeRole]);

  const accentStyles = useMemo(() => {
    if (activeRole === 'employee') {
      return {
        gradient: 'from-emerald-500 to-emerald-700',
        badgeGradient: 'from-emerald-400 to-emerald-600',
        button: 'bg-emerald-600 hover:bg-emerald-700 focus-visible:ring-emerald-500',
        link: 'text-emerald-600 hover:text-emerald-700',
        input: 'border-emerald-200 focus:border-emerald-500 focus:ring-emerald-500/60',
        subtleInput: 'border-transparent focus:border-emerald-500 focus:ring-emerald-500/50',
      } as const;
    }
    return {
      gradient: 'from-brand-500 to-brand-700',
      badgeGradient: 'from-brand-400 to-brand-600',
      button: 'bg-brand-600 hover:bg-brand-700 focus-visible:ring-brand-500',
      link: 'text-brand-600 hover:text-brand-700',
      input: 'border-brand-200 focus:border-brand-500 focus:ring-brand-500/60',
      subtleInput: 'border-transparent focus:border-brand-500 focus:ring-brand-500/50',
    } as const;
  }, [activeRole]);

  function openLoginForm(role: 'hr' | 'employee') {
    setActiveRole(role);
    setForm({ email: '', password: '' });
    setShowPassword(false);
    setError(null);
    setSuccess(null);
    setSubmitting(false);
  }

  function closeLoginForm() {
    setActiveRole(null);
    setForm({ email: '', password: '' });
    setShowPassword(false);
    setError(null);
    setSuccess(null);
    setSubmitting(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeRole) return;

    const role = activeRole;

    setError(null);
    try {
      setSubmitting(true);
      await apiLogin({ role, email: form.email, password: form.password });
      await refresh();
      setSuccess('Signed in successfully');
      setTimeout(() => {
        navigate(role === 'hr' ? '/hr/dashboard' : '/employee/dashboard', { replace: true });
        closeLoginForm();
      }, 900);
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Login failed. Please check your credentials.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-white via-brand-50/30 to-white">
      <Navbar />
      <main className="flex-1 min-h-0 flex flex-col">
        {/* Hero */}
        <section className="relative overflow-hidden flex-1">
          {/* Responsive emerald background layer: fills entire section height */}
          <div aria-hidden className="absolute inset-0 -z-10">
            <div className="h-full w-full bg-emerald-100" />
          </div>

          {/* Decorative blobs (responsive positions to avoid clipping) */}
          <div className="pointer-events-none absolute right-0 top-4 sm:-top-24 sm:-right-24 h-56 w-56 sm:h-72 sm:w-72 rounded-full bg-brand-200/40 blur-3xl" />
          <div className="pointer-events-none absolute left-0 bottom-0 sm:-bottom-24 sm:-left-24 h-56 w-56 sm:h-72 sm:w-72 rounded-full bg-emerald-200/40 blur-3xl" />

          <div className="container mx-auto px-4 py-[clamp(2rem,6vh,3.5rem)]">
            <div className="mx-auto max-w-4xl text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white/60 px-3 py-1 text-xs text-brand-700 backdrop-blur">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-600" /> Leave Management System
              </div>
              <div className="mt-6 flex flex-col items-center gap-3">
                <img src="/nepra-logo.png" alt="National Electric Power Regulatory Authority" className="h-20 w-20 sm:h-24 sm:w-24 object-contain" />
                <h1 className="text-3xl sm:text-5xl font-semibold tracking-tight text-center leading-tight">
                  <span className="block">National Electric Power Regulatory Authority</span>
                  <span className="mt-1 block text-lg sm:text-2xl font-medium text-gray-700">Leave Management System</span>
                </h1>
              </div>
            </div>

            {/* Role cards */}
            <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
              {/* HR Card */}
              <button
                type="button"
                onClick={() => openLoginForm('hr')}
                className="group relative overflow-hidden rounded-2xl bg-gradient-to-r from-brand-500 via-brand-600 to-brand-700 p-[1px] text-left shadow-lg transition-transform hover:-translate-y-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
              >
                <div className="relative rounded-2xl bg-gradient-to-r from-brand-500/90 to-brand-700/90 px-6 py-7 text-white">
                  <div className="absolute inset-y-0 right-0 w-24 bg-white/10 blur-2xl opacity-0 transition-opacity group-hover:opacity-40" aria-hidden />
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-6 w-6">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8.25 6.75V6A2.25 2.25 0 0110.5 3.75h3A2.25 2.25 0 0115.75 6v.75M4.5 9.75A2.25 2.25 0 016.75 7.5h10.5A2.25 2.25 0 0119.5 9.75v7.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 17.25v-7.5zM9 12h6" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold">Human Resource</h3>
                      <p className="mt-1 text-sm text-white/80">Manage employees and organizational records.</p>
                    </div>
                  </div>
                </div>
              </button>

              {/* Employee Card */}
              <button
                type="button"
                onClick={() => openLoginForm('employee')}
                className="group relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-700 p-[1px] text-left shadow-lg transition-transform hover:-translate-y-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
              >
                <div className="relative rounded-2xl bg-gradient-to-r from-emerald-500/90 to-emerald-700/90 px-6 py-7 text-white">
                  <div className="absolute inset-y-0 right-0 w-24 bg-white/10 blur-2xl opacity-0 transition-opacity group-hover:opacity-40" aria-hidden />
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-6 w-6">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 14.25c-3.728 0-6.75 2.186-6.75 4.875V21h13.5v-1.875c0-2.689-3.022-4.875-6.75-4.875z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 12a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold">Employee</h3>
                      <p className="mt-1 text-sm text-white/80">Access your dashboard and profile.</p>
                    </div>
                  </div>
                </div>
              </button>
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
              <button type="button" onClick={() => openLoginForm('hr')} className="text-gray-600 hover:text-gray-900 transition-colors">
                HR Login
              </button>
              <button type="button" onClick={() => openLoginForm('employee')} className="text-gray-600 hover:text-gray-900 transition-colors">
                Employee Login
              </button>
            </nav>
          </div>
        </div>
      </footer>
      {activeRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8 bg-slate-900/50 backdrop-blur">
          <div className="relative w-full max-w-lg">
            <div className="absolute inset-x-8 -top-10 hidden h-32 rounded-3xl bg-black/20 blur-3xl sm:block" aria-hidden />
            <div className="relative overflow-hidden rounded-3xl bg-white shadow-[0_35px_60px_-20px_rgba(15,27,40,0.25)]">
              <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${accentStyles.gradient}`} aria-hidden />
              <button
                type="button"
                onClick={closeLoginForm}
                className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white/95 text-gray-500 shadow-md transition hover:text-gray-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-300"
                aria-label="Close login form"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-5 w-5">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
              <div className="px-6 pb-7 pt-12 pr-10 sm:px-10 sm:pt-14">
                <div className="mb-7 flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-2xl font-semibold text-gray-900">{roleTitle}</h3>
                    <p className="mt-1 text-sm text-gray-500">{roleDescription}</p>
                  </div>
                  <span className={`inline-flex items-center gap-1 rounded-full bg-gradient-to-r ${accentStyles.badgeGradient} px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white shadow-sm`}>
                    <span className="grid h-5 w-5 place-items-center rounded-full bg-white/15">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-3.5 w-3.5">
                        {activeRole === 'hr' ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4.75 19.25v-9.5a2.25 2.25 0 012.25-2.25H9m6 0h2a2.25 2.25 0 012.25 2.25v9.5M9 7.5h6m-3-3.75V7.5" />
                        ) : (
                          <>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 13.5a3 3 0 100-6 3 3 0 000 6z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M5.25 19.25a6.75 6.75 0 0113.5 0" />
                          </>
                        )}
                      </svg>
                    </span>
                    {activeRole === 'hr' ? 'HR' : 'Employee'}
                  </span>
                </div>
                {error && (
                  <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 shadow-sm">
                    {error}
                  </div>
                )}
                {success && (
                  <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 shadow-sm">
                    {success}
                  </div>
                )}
                <form className="space-y-5" onSubmit={handleSubmit}>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700" htmlFor="home-login-email">Email</label>
                    <input
                      ref={emailRef}
                      id="home-login-email"
                      type="email"
                      placeholder={activeRole === 'hr' ? 'hr@nepra.gov' : 'employee@nepra.gov'}
                      className={`w-full rounded-xl border bg-white px-4 py-3 text-sm text-gray-900 shadow-sm transition focus:outline-none focus:ring-2 ${accentStyles.input}`}
                      value={form.email}
                      onChange={(event) => setForm({ ...form, email: event.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700" htmlFor="home-login-password">Password</label>
                    <div className={`relative rounded-xl border bg-slate-50 px-1 ${accentStyles.subtleInput}`}>
                      <input
                        id="home-login-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Your password"
                        className="w-full rounded-xl border-none bg-transparent px-3 py-3 text-sm text-gray-900 focus:outline-none"
                        value={form.password}
                        onChange={(event) => setForm({ ...form, password: event.target.value })}
                        required
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-3 my-auto inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 transition hover:text-gray-700"
                        onClick={() => setShowPassword((state) => !state)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? (
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-5 w-5">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 15.338 6.91 18.25 12 18.25c1.518 0 2.908-.264 4.158-.742M6.228 6.228A10.45 10.45 0 0112 5.75c5.09 0 8.774 2.912 10.066 6.25a10.523 10.523 0 01-4.16 4.51M6.228 6.228L3.75 3.75m2.478 2.478l13.044 13.044M17.77 17.77L20.25 20.25M9.53 9.53A3.75 3.75 0 0012 15.75c.845 0 1.624-.276 2.247-.741M9.53 9.53l4.717 4.717" />
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-5 w-5">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M2.036 12.322a1.012 1.012 0 010-.644C3.423 7.51 7.36 4.75 12 4.75s8.577 2.76 9.964 6.928c.07.205.07.439 0 .644C20.577 16.49 16.64 19.25 12 19.25S3.423 16.49 2.036 12.322z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15.25 12a3.25 3.25 0 11-6.5 0 3.25 3.25 0 016.5 0z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-3">
                    <Link className={`text-sm font-medium transition ${accentStyles.link}`} to="#">
                      Forgot password?
                    </Link>
                    <button className={`inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold text-white shadow-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${accentStyles.button}`} disabled={submitting}>
                      {submitting ? 'Signing in…' : 'Sign In'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
