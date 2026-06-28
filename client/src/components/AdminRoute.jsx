import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { Loader2 } from 'lucide-react';

/**
 * AdminRoute
 * Wraps routes that require admin access.
 * Same shape as ProtectedRoute, with one extra check: user.role === 'admin'.
 * Non-admin users are redirected to the dashboard (not login).
 */
const AdminRoute = ({ children }) => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-950">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
          <p className="text-dark-400 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default AdminRoute;
