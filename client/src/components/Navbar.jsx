import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/useAuth';
import { useNavigate, useLocation } from 'react-router-dom';
import { Shield, LogOut, User, Activity, LayoutDashboard, Crown, Menu, X, KeyRound, ChevronDown } from 'lucide-react';
import ChangePasswordModal from './ChangePasswordModal';

/**
 * Navbar
 * Top navigation bar with:
 * - Logo + nav tabs (desktop)
 * - Hamburger menu (mobile)
 * - Search bar (conditionally shown via showSearch prop)
 * - User dropdown menu
 */
const Navbar = ({ searchQuery, onSearchChange, showSearch = true }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const userMenuRef = useRef(null);

  const handleLogout = async () => {
    setUserMenuOpen(false);
    setMobileMenuOpen(false);
    await logout();
    navigate('/login');
  };

  // Close user dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/activity', label: 'Activity', icon: Activity },
    ...(user?.role === 'admin'
      ? [{ path: '/admin', label: 'Admin', icon: Crown }]
      : []),
  ];

  return (
    <>
      <nav className="sticky top-0 z-50 glass-card border-t-0 border-x-0 rounded-none px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between gap-3 sm:gap-4">
          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="btn-ghost p-2 sm:hidden"
            aria-label="Toggle navigation menu"
            id="mobile-menu-btn"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* Logo */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-lg bg-linear-to-br from-primary-500 to-purple-600 flex items-center justify-center shadow-lg shadow-primary-500/20">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold hidden sm:block">
              <span className="text-gradient">Secure</span>
              <span className="text-dark-200">Vault</span>
            </h1>
          </div>

          {/* Desktop Nav Tabs */}
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

          {/* Search Bar — only shown on pages that use it */}
          {showSearch && (
            <div className="flex-1 max-w-xl hidden sm:block">
              <input
                type="text"
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="input-field text-sm py-2.5"
                id="search-input"
                aria-label="Search files"
              />
            </div>
          )}

          {/* Spacer when search is hidden */}
          {!showSearch && <div className="flex-1" />}

          {/* User Dropdown Menu */}
          <div className="relative shrink-0" ref={userMenuRef}>
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-dark-800 transition-all duration-200"
              id="user-menu-btn"
              aria-label="User menu"
            >
              <div className="w-8 h-8 rounded-full bg-linear-to-br from-primary-500 to-purple-600 flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm text-dark-300 hidden sm:block max-w-[120px] truncate">{user?.name}</span>
              <ChevronDown className={`w-3.5 h-3.5 text-dark-500 hidden sm:block transition-transform duration-200 ${userMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown */}
            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 glass-card p-2 animate-scale-in origin-top-right z-50">
                {/* User info */}
                <div className="px-3 py-2.5 border-b border-dark-700/50 mb-1">
                  <p className="text-sm font-medium text-dark-100 truncate">{user?.name}</p>
                  <p className="text-xs text-dark-500 truncate">{user?.email}</p>
                  {user?.role === 'admin' && (
                    <span className="badge-primary mt-1.5 inline-flex items-center gap-1 text-[10px]">
                      <Crown className="w-2.5 h-2.5" /> Admin
                    </span>
                  )}
                </div>

                {/* Change Password */}
                <button
                  onClick={() => { setUserMenuOpen(false); setShowChangePassword(true); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-dark-300 hover:bg-dark-800 hover:text-dark-200 transition-all"
                  id="change-password-menu-btn"
                >
                  <KeyRound className="w-4 h-4" />
                  Change Password
                </button>

                {/* Logout */}
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-500/10 transition-all"
                  id="logout-btn"
                >
                  <LogOut className="w-4 h-4" />
                  Log Out
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Search — shown below navbar on Dashboard */}
        {showSearch && (
          <div className="mt-3 sm:hidden">
            <input
              type="text"
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="input-field text-sm py-2.5"
              aria-label="Search files"
            />
          </div>
        )}
      </nav>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 sm:hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <div className="absolute top-0 left-0 w-64 h-full glass-card rounded-none border-l-0 border-t-0 border-b-0 p-4 animate-slide-right">
            {/* Logo in drawer */}
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-dark-700/50">
              <div className="w-9 h-9 rounded-lg bg-linear-to-br from-primary-500 to-purple-600 flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-lg font-bold">
                <span className="text-gradient">Secure</span>
                <span className="text-dark-200">Vault</span>
              </h2>
            </div>

            {/* Nav Links */}
            <nav className="space-y-1">
              {navItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => { navigate(item.path); setMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    location.pathname === item.path
                      ? 'bg-primary-500/15 text-primary-400 border border-primary-500/20'
                      : 'text-dark-300 hover:bg-dark-800 hover:text-dark-200'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </button>
              ))}
            </nav>

            {/* User info at bottom */}
            <div className="absolute bottom-4 left-4 right-4">
              <div className="glass-card p-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-linear-to-br from-primary-500 to-purple-600 flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-dark-200 truncate">{user?.name}</p>
                  <p className="text-xs text-dark-500 truncate">{user?.email}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={showChangePassword}
        onClose={() => setShowChangePassword(false)}
      />
    </>
  );
};

export default Navbar;
