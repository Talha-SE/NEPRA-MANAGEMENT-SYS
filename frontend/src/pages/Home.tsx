import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="navbar">
        <div className="navbar-inner">
          <h1 className="text-xl font-semibold text-brand-700">NEPRA EMS</h1>
          <div className="text-sm text-gray-500">Role Selection</div>
        </div>
      </header>
      <main className="flex-1 container mx-auto px-4 grid place-items-center">
        <div className="grid gap-8 w-full max-w-3xl">
          <div className="text-center flex flex-col items-center gap-3">
            <img src="/nepra-logo.png" alt="NEPRA EMS" className="h-12 w-auto" />
            <h2 className="text-3xl font-semibold">Welcome to NEPRA EMS</h2>
            <p className="text-gray-500">Select your role to continue to authentication.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="card">
              <div className="card-body">
                <h3 className="font-semibold text-lg mb-2">Human Resource</h3>
                <p className="text-sm text-gray-500 mb-4">Manage employees and organizational records.</p>
                <div className="flex gap-3">
                  <Link to="/login/hr" className="btn btn-primary">Login</Link>
                  <Link to="/register/hr" className="btn btn-secondary">Register</Link>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="card-body">
                <h3 className="font-semibold text-lg mb-2">Employee</h3>
                <p className="text-sm text-gray-500 mb-4">Access your personal dashboard and profile.</p>
                <div className="flex gap-3">
                  <Link to="/login/employee" className="btn btn-primary">Login</Link>
                  <Link to="/register/employee" className="btn btn-secondary">Register</Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <footer className="py-6 text-center text-xs text-gray-500">© 2025 NEPRA EMS</footer>
    </div>
  );
}
