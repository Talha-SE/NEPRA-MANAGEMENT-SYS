import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { apiLogin } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';

export default function Login() {
  const { role = '' } = useParams();
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const validRole = role === 'hr' || role === 'employee' ? (role as 'hr' | 'employee') : null;
  const isHR = validRole === 'hr';

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const title = useMemo(() => {
    if (!validRole) return 'Login';
    return isHR ? 'Human Resource Login' : 'Employee Login';
  }, [validRole, isHR]);

  if (!validRole) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="card w-full max-w-md">
          <div className="card-body">
            <p className="text-red-600">Invalid role. Go back to home.</p>
            <Link to="/" className="btn btn-secondary mt-4">Home</Link>
          </div>
        </div>
      </div>
    );
  }

  // At this point, validRole is guaranteed non-null
  const roleValue = validRole as 'hr' | 'employee';

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      setSubmitting(true);
      await apiLogin({ role: roleValue, email: form.email, password: form.password });
      // After login, the backend sets cookie; refresh auth state so ProtectedRoute passes immediately
      await refresh();
      setSuccess('Signed in successfully');
      setTimeout(() => {
        navigate(roleValue === 'hr' ? '/hr/dashboard' : '/employee/dashboard', { replace: true });
      }, 900);
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Login failed';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-emerald-50 via-white to-emerald-100 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-80" aria-hidden>
        <div className="absolute -top-32 -left-24 h-80 w-80 rounded-full bg-emerald-200/40 blur-3xl" />
        <div className="absolute top-1/3 right-[-10rem] h-96 w-96 rounded-full bg-emerald-400/20 blur-[120px]" />
        <div className="absolute bottom-[-6rem] left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-sky-200/25 blur-[120px]" />
        <svg className="absolute inset-0 h-full w-full opacity-30" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
          <defs>
            <linearGradient id="gridGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="rgba(16,185,129,0.08)" />
              <stop offset="100%" stopColor="rgba(56,189,248,0.04)" />
            </linearGradient>
          </defs>
          <pattern id="grid" width="140" height="140" patternUnits="userSpaceOnUse">
            <path d="M 140 0 L 0 0 0 140" fill="none" stroke="url(#gridGradient)" strokeWidth="0.8" />
          </pattern>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>
      <Navbar />
      {success && (
        <div className="fixed top-4 right-4 z-50 bg-white border border-brand-200 shadow-lg rounded-md px-4 py-2 text-sm text-brand-700">
          {success}
        </div>
      )}
      <main className="container mx-auto px-4 py-10">
        {isHR ? (
          <div className="grid lg:grid-cols-5 gap-8 items-start">
            <div className="lg:col-span-2 hidden lg:block">
              <div className="sticky top-10 space-y-6">
                <img src="/nepra-logo.png" alt="NEPRA EMS" className="h-10 w-auto" />
                <h2 className="text-3xl font-semibold">Human Resource</h2>
                <p className="text-gray-600">Sign in to manage employees and organizational records.</p>
                <ul className="text-sm text-gray-500 list-disc pl-5 space-y-1">
                  <li>Secure access with JWT</li>
                  <li>Role-based dashboard</li>
                  <li>Modern, responsive UI</li>
                </ul>
              </div>
            </div>
            <div className="lg:col-span-3 w-full max-w-md mx-auto">
              <div className="card">
                <div className="card-body">
                  <div className="h-1 bg-gradient-to-r from-brand-500 to-brand-700 rounded-t-xl -mx-6 -mt-6 mb-6" />
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-xl font-semibold">{title}</h3>
                      <p className="text-sm text-gray-500">Enter your work email and password.</p>
                    </div>
                    <span className="px-2 py-1 text-xs rounded bg-brand-100 text-brand-700">HR</span>
                  </div>
                  {error && <div className="mb-4 text-sm text-red-600">{error}</div>}
                  <form className="grid gap-4" onSubmit={onSubmit}>
                    <div>
                      <label className="label" htmlFor="email">Work Email</label>
                      <input id="email" type="email" placeholder="hr@nepra.gov" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                    </div>
                    <div>
                      <label className="label" htmlFor="password">Password</label>
                      <div className="relative">
                        <input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Your password"
                          className="input pr-10"
                          value={form.password}
                          onChange={(e) => setForm({ ...form, password: e.target.value })}
                        />
                        <button
                          type="button"
                          className="absolute inset-y-0 right-2 my-auto text-gray-600 hover:text-gray-900"
                          onClick={() => setShowPassword((s) => !s)}
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? (
                            // eye-off icon
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-5 w-5">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 15.338 6.91 18.25 12 18.25c1.518 0 2.908-.264 4.158-.742M6.228 6.228A10.45 10.45 0 0112 5.75c5.09 0 8.774 2.912 10.066 6.25a10.523 10.523 0 01-4.16 4.51M6.228 6.228L3.75 3.75m2.478 2.478l13.044 13.044M17.77 17.77L20.25 20.25M9.53 9.53A3.75 3.75 0 0012 15.75c.845 0 1.624-.276 2.247-.741M9.53 9.53l4.717 4.717" />
                            </svg>
                          ) : (
                            // eye icon
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-5 w-5">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M2.036 12.322a1.012 1.012 0 010-.644C3.423 7.51 7.36 4.75 12 4.75s8.577 2.76 9.964 6.928c.07.205.07.439 0 .644C20.577 16.49 16.64 19.25 12 19.25S3.423 16.49 2.036 12.322z"/>
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15.25 12a3.25 3.25 0 11-6.5 0 3.25 3.25 0 016.5 0z"/>
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-2">
                      <Link className="text-sm text-brand-600 hover:underline" to="#">Forgot password?</Link>
                      <button className="btn btn-primary" disabled={submitting}>
                        {submitting ? 'Signing in…' : 'Sign In'}
                      </button>
                    </div>
                    <p className="text-sm text-gray-600">
                      New here? <Link className="text-brand-600 hover:underline" to={`/register/${roleValue}`}>Create an account</Link>
                    </p>
                  </form>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid lg:grid-cols-5 gap-8 items-start">
            <div className="lg:col-span-2 hidden lg:block">
              <div className="sticky top-10 space-y-6">
                <img src="/nepra-logo.png" alt="NEPRA EMS" className="h-10 w-auto" />
                <h2 className="text-3xl font-semibold">Employee</h2>
                <p className="text-gray-600">Sign in to access your dashboard, profile, and organizational resources.</p>
                <ul className="text-sm text-gray-500 list-disc pl-5 space-y-1">
                  <li>Secure access with JWT</li>
                  <li>Personalized employee dashboard</li>
                  <li>Modern, responsive UI</li>
                </ul>
              </div>
            </div>
            <div className="lg:col-span-3 w-full max-w-md mx-auto">
              <div className="card">
                <div className="card-body">
                  <div className="h-1 bg-gradient-to-r from-emerald-500 to-emerald-700 rounded-t-xl -mx-6 -mt-6 mb-6" />
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-xl font-semibold">{title}</h3>
                      <p className="text-sm text-gray-500">Enter your email and password.</p>
                    </div>
                    <span className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-700">Employee</span>
                  </div>
                  {error && <div className="mb-4 text-sm text-red-600">{error}</div>}
                  <form className="grid gap-4" onSubmit={onSubmit}>
                    <div>
                      <label className="label" htmlFor="email">Email</label>
                      <input id="email" type="email" placeholder="employee@nepra.gov" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                    </div>
                    <div>
                      <label className="label" htmlFor="password">Password</label>
                      <div className="relative">
                        <input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Your password"
                          className="input pr-10"
                          value={form.password}
                          onChange={(e) => setForm({ ...form, password: e.target.value })}
                        />
                        <button
                          type="button"
                          className="absolute inset-y-0 right-2 my-auto text-gray-600 hover:text-gray-900"
                          onClick={() => setShowPassword((s) => !s)}
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? (
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-5 w-5">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 15.338 6.91 18.25 12 18.25c1.518 0 2.908-.264 4.158-.742M6.228 6.228A10.45 10.45 0 0112 5.75c5.09 0 8.774 2.912 10.066 6.25a10.523 10.523 0 01-4.16 4.51M6.228 6.228L3.75 3.75m2.478 2.478l13.044 13.044M17.77 17.77L20.25 20.25M9.53 9.53A3.75 3.75 0 0012 15.75c.845 0 1.624-.276 2.247-.741M9.53 9.53l4.717 4.717" />
                            </svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-5 w-5">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M2.036 12.322a1.012 1.012 0 010-.644C3.423 7.51 7.36 4.75 12 4.75s8.577 2.76 9.964 6.928c.07.205.07.439 0 .644C20.577 16.49 16.64 19.25 12 19.25S3.423 16.49 2.036 12.322z"/>
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15.25 12a3.25 3.25 0 11-6.5 0 3.25 3.25 0 016.5 0z"/>
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-2">
                      <Link className="text-sm text-brand-600 hover:underline" to="#">Forgot password?</Link>
                      <button className="btn btn-primary" disabled={submitting}>
                        {submitting ? 'Signing in…' : 'Sign In'}
                      </button>
                    </div>
                    <p className="text-sm text-gray-600">
                      New here? <Link className="text-brand-600 hover:underline" to={`/register/${roleValue}`}>Create an account</Link>
                    </p>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
