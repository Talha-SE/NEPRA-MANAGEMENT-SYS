import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
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
  const { refresh } = useAuth();

  const [form, setForm] = useState({ firstName: '', middleName: '', lastName: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof typeof form, string>>>({});

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
    setFieldErrors({});
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const flat = parsed.error.flatten();
      const errs: Partial<Record<keyof typeof form, string>> = {};
      for (const key in flat.fieldErrors) {
        const k = key as keyof typeof form;
        const list = flat.fieldErrors[k];
        if (list && list.length) errs[k] = list[0]!;
      }
      setFieldErrors(errs);
      setError(parsed.error.errors[0]?.message || 'Invalid form');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setFieldErrors({ ...fieldErrors, confirmPassword: 'Passwords do not match' });
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
      // Cookie is already set by backend on register; refresh auth state so ProtectedRoute passes immediately
      await refresh();
      setSuccess('Account created successfully');
      setTimeout(() => {
        navigate(roleValue === 'hr' ? '/hr/dashboard' : '/employee/dashboard', { replace: true });
      }, 900);
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
      {success && (
        <div className="fixed top-4 right-4 z-50 bg-white border border-brand-200 shadow-lg rounded-md px-4 py-2 text-sm text-brand-700">
          {success}
        </div>
      )}
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
                  <div className="h-1 bg-gradient-to-r from-brand-500 to-brand-700 rounded-t-xl -mx-6 -mt-6 mb-6" />
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
                        {fieldErrors.firstName && <p className="mt-1 text-xs text-red-600">{fieldErrors.firstName}</p>}
                      </div>
                      <div>
                        <label className="label" htmlFor="middleName">Middle Name</label>
                        <input id="middleName" placeholder="(Optional)" className="input" value={form.middleName} onChange={(e) => setForm({ ...form, middleName: e.target.value })} />
                      </div>
                      <div>
                        <label className="label" htmlFor="lastName">Last Name</label>
                        <input id="lastName" placeholder="Doe" className="input" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
                        {fieldErrors.lastName && <p className="mt-1 text-xs text-red-600">{fieldErrors.lastName}</p>}
                      </div>
                      <div>
                        <label className="label" htmlFor="email">Work Email</label>
                        <input id="email" type="email" placeholder="hr@nepra.gov" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                        {fieldErrors.email && <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p>}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="label" htmlFor="password">Password</label>
                        <div className="relative">
                          <input id="password" type={showPassword ? 'text' : 'password'} placeholder="At least 8 characters" className="input pr-10" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
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
                        {fieldErrors.password && <p className="mt-1 text-xs text-red-600">{fieldErrors.password}</p>}
                      </div>
                      <div>
                        <label className="label" htmlFor="confirmPassword">Confirm Password</label>
                        <div className="relative">
                          <input id="confirmPassword" type={showConfirm ? 'text' : 'password'} className="input pr-10" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} />
                          <button
                            type="button"
                            className="absolute inset-y-0 right-2 my-auto text-gray-600 hover:text-gray-900"
                            onClick={() => setShowConfirm((s) => !s)}
                            aria-label={showConfirm ? 'Hide password' : 'Show password'}
                          >
                            {showConfirm ? (
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
                        {fieldErrors.confirmPassword && <p className="mt-1 text-xs text-red-600">{fieldErrors.confirmPassword}</p>}
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
              <div className="h-1 bg-gradient-to-r from-brand-500 to-brand-700 rounded-t-xl -mx-6 -mt-6 mb-6" />
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
                    {fieldErrors.firstName && <p className="mt-1 text-xs text-red-600">{fieldErrors.firstName}</p>}
                  </div>
                  <div>
                    <label className="label" htmlFor="middleName">Middle Name</label>
                    <input id="middleName" placeholder="(Optional)" className="input" value={form.middleName} onChange={(e) => setForm({ ...form, middleName: e.target.value })} />
                  </div>
                  <div>
                    <label className="label" htmlFor="lastName">Last Name</label>
                    <input id="lastName" placeholder="Doe" className="input" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
                    {fieldErrors.lastName && <p className="mt-1 text-xs text-red-600">{fieldErrors.lastName}</p>}
                  </div>
                  <div>
                    <label className="label" htmlFor="email">Email</label>
                    <input id="email" type="email" placeholder="employee@nepra.gov" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                    {fieldErrors.email && <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label" htmlFor="password">Password</label>
                    <div className="relative">
                      <input id="password" type={showPassword ? 'text' : 'password'} placeholder="At least 8 characters" className="input pr-10" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
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
                    {fieldErrors.password && <p className="mt-1 text-xs text-red-600">{fieldErrors.password}</p>}
                  </div>
                  <div>
                    <label className="label" htmlFor="confirmPassword">Confirm Password</label>
                    <div className="relative">
                      <input id="confirmPassword" type={showConfirm ? 'text' : 'password'} className="input pr-10" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-2 my-auto text-gray-600 hover:text-gray-900"
                        onClick={() => setShowConfirm((s) => !s)}
                        aria-label={showConfirm ? 'Hide password' : 'Show password'}
                      >
                        {showConfirm ? (
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
                    {fieldErrors.confirmPassword && <p className="mt-1 text-xs text-red-600">{fieldErrors.confirmPassword}</p>}
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
