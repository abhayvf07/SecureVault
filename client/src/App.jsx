import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ActivityPage from './pages/ActivityPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import SharedFilePage from './pages/SharedFilePage';

/**
 * App
 * Root component with routing and auth context.
 *
 * Routes:
 * /login           — Login/Signup (public)
 * /dashboard       — File management (protected)
 * /activity        — Activity history (protected)
 * /admin           — Admin dashboard (admin only)
 * /shared/:token   — Shared file access (public)
 */
const LogoutRedirector = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleLogout = () => navigate('/login');
    window.addEventListener('sv_logout', handleLogout);
    return () => window.removeEventListener('sv_logout', handleLogout);
  }, [navigate]);

  return null;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/activity"
            element={
              <ProtectedRoute>
                <ActivityPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminDashboardPage />
              </AdminRoute>
            }
          />
          <Route path="/shared/:token" element={<SharedFilePage />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
        <LogoutRedirector />
      </Router>

      {/* Global toast notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#1e293b',
            color: '#e2e8f0',
            border: '1px solid rgba(99, 102, 241, 0.2)',
            borderRadius: '12px',
            fontSize: '14px',
          },
          success: {
            iconTheme: {
              primary: '#6366f1',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </AuthProvider>
  );
}

export default App;
