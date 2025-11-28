import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ReactNode } from 'react';

export default function ProtectedRoute({ children, requiredRole }: { children: ReactNode; requiredRole: 'hr' | 'employee' | 'reporting' }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to={`/`} state={{ from: location, openLogin: true, role: requiredRole }} replace />;
  }

  if (user.role !== requiredRole) {
    const path = user.role === 'hr' ? '/hr/dashboard' : user.role === 'reporting' ? '/reporting/dashboard' : '/employee/dashboard';
    return <Navigate to={path} replace />;
  }

  return <>{children}</>;
}
