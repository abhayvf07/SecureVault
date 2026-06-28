import { useAuth } from '../context/useAuth';
import { useNavigate, useLocation } from 'react-router-dom';
import { Shield, LogOut, User, Activity, LayoutDashboard, Crown } from 'lucide-react';

/**
 * Navbar
 * Top navigation bar with logo, nav tabs, search, and user menu.
 */
const Navbar = ({ searchQuery, onSearchChange }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/activity', label: 'Activity', icon: Activity },
    // Conditionally add Admin tab for admin users
    ...(user?.role === 'admin'
      ? [{ path: '/admin', label: 'Admin', icon: Crown }]
      : []),
  ];

  return (
    <nav className="sticky top-0 z-50 glass-card border-t-0 border-x-0 rounded-none px-6 py-3">
      <div className="flex items-center justify-between gap-4">
        {/* Logo */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-lg bg-linear-to-br from-primary-500 to-purple-600 flex items-center justify-center shadow-lg shadow-primary-500/20">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-bold">
            <span className="text-gradient">Secure</span>
            <span className="text-dark-200">Vault</span>
          </h1>
        </div>

        {/* Nav Tabs */}
        <div className="hidden sm:flex items-center gap-1 ml-6">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                location.pathname === item.path
                  ? 'bg-primary-500/15 text-primary-400 border border-primary-500/20'
                  : 'text-dark-400 hover:bg-dark-800 hover:text-dark-200'
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="flex-1 max-w-xl">
          <input
            type="text"
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="input-field text-sm py-2.5"
            id="search-input"
          />
        </div>

        {/* User Menu */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-linear-to-br from-primary-500 to-purple-600 flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm text-dark-300 hidden sm:block">{user?.name}</span>
          </div>
          <button
            onClick={handleLogout}
            className="btn-ghost"
            title="Logout"
            id="logout-btn"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
