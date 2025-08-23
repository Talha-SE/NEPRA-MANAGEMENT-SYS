import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { z } from 'zod';
import { apiRegister } from '../lib/api';
import Navbar from '../components/Navbar';

const schema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  middleName: z.string().optional(),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
});

export default function Register() {
  const { role = '' } = useParams();
  const navigate = useNavigate();
  const validRole = role === 'hr' || role === 'employee' ? (role as 'hr' | 'employee') : null;
  const isHR = validRole === 'hr';

  const [form, setForm] = useState({ firstName: '', middleName: '', lastName: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const title = useMemo(() => {
    if (!validRole) return 'Register';
    return isHR ? 'Human Resource Registration' : 'Employee Registration';
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

  // At this point, validRole is guaranteed to be non-null
  const roleValue = validRole as 'hr' | 'employee';

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      setError(parsed.error.errors[0]?.message || 'Invalid form');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    try {
      setSubmitting(true);
      await apiRegister({
        role: roleValue,
        firstName: form.firstName,
        middleName: form.middleName || undefined,
        lastName: form.lastName,
        email: form.email,
        password: form.password,
      });
      navigate(roleValue === 'hr' ? '/hr/dashboard' : '/employee/dashboard', { replace: true });
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Registration failed';
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
                <p className="text-gray-600">Create an HR account to manage employees and organizational records within NEPRA EMS.</p>
                <ul className="text-sm text-gray-500 list-disc pl-5 space-y-1">
                  <li>Secure, role-based access</li>
                  <li>Profile and dashboard access</li>
                  <li>Modern, responsive design</li>
                </ul>
              </div>
            </div>
            <div className="lg:col-span-3">
              <div className="card">
                <div className="card-body">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-xl font-semibold">{title}</h3>
                      <p className="text-sm text-gray-500">Please provide your details to proceed.</p>
                    </div>
                    <span className="px-2 py-1 text-xs rounded bg-brand-100 text-brand-700">HR</span>
                  </div>
                  {error && <div className="mb-4 text-sm text-red-600">{error}</div>}
                  <form className="grid gap-4" onSubmit={onSubmit}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="label" htmlFor="firstName">First Name</label>
                        <input id="firstName" placeholder="John" className="input" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
                      </div>
                      <div>
                        <label className="label" htmlFor="middleName">Middle Name</label>
                        <input id="middleName" placeholder="(Optional)" className="input" value={form.middleName} onChange={(e) => setForm({ ...form, middleName: e.target.value })} />
                      </div>
                      <div>
                        <label className="label" htmlFor="lastName">Last Name</label>
                        <input id="lastName" placeholder="Doe" className="input" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
                      </div>
                      <div>
                        <label className="label" htmlFor="email">Work Email</label>
                        <input id="email" type="email" placeholder="hr@nepra.gov" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="label" htmlFor="password">Password</label>
                        <input id="password" type="password" placeholder="At least 8 characters" className="input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                      </div>
                      <div>
                        <label className="label" htmlFor="confirmPassword">Confirm Password</label>
                        <input id="confirmPassword" type="password" className="input" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} />
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-2">
                      <p className="text-xs text-gray-500">By creating an account you agree to our terms and privacy policy.</p>
                      <button className="btn btn-primary" disabled={submitting}>
                        {submitting ? 'Creating account...' : 'Create HR Account'}
                      </button>
                    </div>
                    <p className="text-sm text-gray-600">
                      Already have an account? <Link className="text-brand-600 hover:underline" to={`/login/${validRole}`}>Login</Link>
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
              <p className="text-sm text-gray-500 mb-4">Create your account to access the employee dashboard.</p>
              {error && <div className="mb-4 text-sm text-red-600">{error}</div>}
              <form className="grid gap-4" onSubmit={onSubmit}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label" htmlFor="firstName">First Name</label>
                    <input id="firstName" placeholder="John" className="input" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
                  </div>
                  <div>
                    <label className="label" htmlFor="middleName">Middle Name</label>
                    <input id="middleName" placeholder="(Optional)" className="input" value={form.middleName} onChange={(e) => setForm({ ...form, middleName: e.target.value })} />
                  </div>
                  <div>
                    <label className="label" htmlFor="lastName">Last Name</label>
                    <input id="lastName" placeholder="Doe" className="input" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
                  </div>
                  <div>
                    <label className="label" htmlFor="email">Email</label>
                    <input id="email" type="email" placeholder="employee@nepra.gov" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label" htmlFor="password">Password</label>
                    <input id="password" type="password" placeholder="At least 8 characters" className="input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                  </div>
                  <div>
                    <label className="label" htmlFor="confirmPassword">Confirm Password</label>
                    <input id="confirmPassword" type="password" className="input" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} />
                  </div>
                </div>
                <button className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Creating account...' : 'Register'}
                </button>
                <p className="text-sm text-gray-600">
                  Already have an account? <Link className="text-brand-600 hover:underline" to={`/login/${validRole}`}>Login</Link>
                </p>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
