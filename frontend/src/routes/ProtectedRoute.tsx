import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ReactNode } from 'react';

export default function ProtectedRoute({ children, requiredRole }: { children: ReactNode; requiredRole: 'hr' | 'employee' }) {
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
    return <Navigate to={`/login/${requiredRole}`} state={{ from: location }} replace />;
  }

  if (user.role !== requiredRole) {
    const path = user.role === 'hr' ? '/hr/dashboard' : '/employee/dashboard';
    return <Navigate to={path} replace />;
  }

  return <>{children}</>;
}
