import { useState } from 'react';
import { X, Lock, Eye, EyeOff, Loader2, KeyRound } from 'lucide-react';
import toast from 'react-hot-toast';
import { authAPI, setApiToken } from '../services/api';

/**
 * ChangePasswordModal
 * Modal for changing password with current password verification
 * and password strength indicator.
 */
const ChangePasswordModal = ({ isOpen, onClose }) => {
  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (form.newPassword !== form.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const res = await authAPI.changePassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });

      // Update token in memory (backend issues fresh tokens after password change)
      const newToken = res.data.data?.token;
      if (newToken) {
        setApiToken(newToken);
      }

      toast.success('Password changed successfully!');
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      onClose();
    } catch (err) {
      const message = err.response?.data?.message
        || err.response?.data?.errors?.[0]?.message
        || 'Failed to change password';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const passwordChecks = [
    { test: form.newPassword.length >= 8, label: '8+ characters' },
    { test: /[A-Z]/.test(form.newPassword), label: 'Uppercase letter' },
    { test: /[a-z]/.test(form.newPassword), label: 'Lowercase letter' },
    { test: /[0-9]/.test(form.newPassword), label: 'Number' },
    { test: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(form.newPassword), label: 'Special character' },
  ];

  const allValid = passwordChecks.every((c) => c.test) && form.newPassword === form.confirmPassword && form.currentPassword;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="glass-card p-6 w-full max-w-md mx-4 animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary-500/15 flex items-center justify-center">
              <KeyRound className="w-4.5 h-4.5 text-primary-400" />
            </div>
            <h3 className="text-lg font-semibold text-dark-100">Change Password</h3>
          </div>
          <button onClick={onClose} className="btn-ghost p-1" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Current Password */}
          <div>
            <label className="flex items-center gap-2 text-sm text-dark-300 mb-1.5">
              <Lock className="w-4 h-4" /> Current Password
            </label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                name="currentPassword"
                value={form.currentPassword}
                onChange={handleChange}
                placeholder="Enter current password"
                className="input-field pr-10"
                required
                id="current-password-input"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-500 hover:text-dark-300 transition-colors"
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label className="flex items-center gap-2 text-sm text-dark-300 mb-1.5">
              <Lock className="w-4 h-4" /> New Password
            </label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                name="newPassword"
                value={form.newPassword}
                onChange={handleChange}
                placeholder="Enter new password"
                className="input-field pr-10"
                required
                minLength={8}
                id="new-password-input"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-500 hover:text-dark-300 transition-colors"
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Password strength checklist */}
            {form.newPassword.length > 0 && (
              <div className="mt-2 space-y-1 animate-slide-down">
                {passwordChecks.map(({ test, label }) => (
                  <p key={label} className={`text-xs flex items-center gap-1.5 transition-colors duration-200 ${test ? 'text-emerald-400' : 'text-dark-500'}`}>
                    <span>{test ? '✓' : '✗'}</span>
                    {label}
                  </p>
                ))}
              </div>
            )}
          </div>

          {/* Confirm New Password */}
          <div>
            <label className="flex items-center gap-2 text-sm text-dark-300 mb-1.5">
              <Lock className="w-4 h-4" /> Confirm New Password
            </label>
            <input
              type="password"
              name="confirmPassword"
              value={form.confirmPassword}
              onChange={handleChange}
              placeholder="Re-enter new password"
              className="input-field"
              required
              id="confirm-password-input"
            />
            {form.confirmPassword && form.newPassword !== form.confirmPassword && (
              <p className="text-xs text-red-400 mt-1">Passwords do not match</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !allValid}
            className="btn-primary w-full flex items-center justify-center gap-2 mt-2"
            id="change-password-btn"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Changing...
              </>
            ) : (
              'Change Password'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChangePasswordModal;
