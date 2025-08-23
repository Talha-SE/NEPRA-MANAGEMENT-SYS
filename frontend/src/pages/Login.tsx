import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { apiLogin } from '../lib/api';
import Navbar from '../components/Navbar';

export default function Login() {
  const { role = '' } = useParams();
  const navigate = useNavigate();
  const validRole = role === 'hr' || role === 'employee' ? (role as 'hr' | 'employee') : null;
  const isHR = validRole === 'hr';

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
      navigate(roleValue === 'hr' ? '/hr/dashboard' : '/employee/dashboard', { replace: true });
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Login failed';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className={isHR ? 'container mx-auto px-4 py-10' : 'container-narrow py-10'}>
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
            <div className="lg:col-span-3">
              <div className="card">
                <div className="card-body">
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
                      <input id="password" type="password" placeholder="Your password" className="input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
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
          <div className="card">
            <div className="card-body">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <img src="/nepra-logo.png" alt="NEPRA EMS" className="h-6 w-auto" />
                  <h2 className="text-lg font-semibold">{title}</h2>
                </div>
                <span className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-700">Employee</span>
              </div>
              <p className="text-sm text-gray-500 mb-4">Enter your credentials.</p>
              {error && <div className="mb-4 text-sm text-red-600">{error}</div>}
              <form className="grid gap-4" onSubmit={onSubmit}>
                <div>
                  <label className="label" htmlFor="email">Email</label>
                  <input id="email" type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div>
                  <label className="label" htmlFor="password">Password</label>
                  <input id="password" type="password" className="input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                </div>
                <button className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Signing in…' : 'Sign In'}
                </button>
                <p className="text-sm text-gray-600">
                  New here? <Link className="text-brand-600 hover:underline" to={`/register/${roleValue}`}>Create an account</Link>
                </p>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
