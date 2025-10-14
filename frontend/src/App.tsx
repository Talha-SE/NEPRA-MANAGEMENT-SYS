import { Route, Routes, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Home from './pages/Home';
import Register from './pages/Register';
import HRDashboard from './pages/hr/Dashboard';
import ReportingOfficerDashboard from './pages/hr/ReportingOfficerDashboard';
import EmployeeDashboard from './pages/employee/Dashboard';
import ProtectedRoute from './routes/ProtectedRoute';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Home />} />

        <Route path="/register/:role" element={<Register />} />

        <Route
          path="/hr/dashboard"
          element={
            <ProtectedRoute requiredRole="hr">
              <HRDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/hr/ro"
          element={
            <ProtectedRoute requiredRole="hr">
              <ReportingOfficerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/employee/dashboard"
          element={
            <ProtectedRoute requiredRole="employee">
              <EmployeeDashboard />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
