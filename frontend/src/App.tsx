import { Route, Routes, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Home from './pages/Home';
import HRDashboard from './pages/hr/Dashboard';
import EmployeeDashboard from './pages/employee/Dashboard';
import ProtectedRoute from './routes/ProtectedRoute';
import ReportingDashboard from './pages/reporting/Dashboard';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Home />} />


        <Route
          path="/hr/dashboard"
          element={
            <ProtectedRoute requiredRole="hr">
              <HRDashboard />
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
        <Route
          path="/reporting/dashboard"
          element={
            <ProtectedRoute requiredRole="reporting">
              <ReportingDashboard />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
