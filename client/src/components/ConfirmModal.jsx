import { AlertTriangle, X } from 'lucide-react';

/**
 * ConfirmModal
 * Styled confirmation dialog matching glassmorphism design system.
 * Replaces native `window.confirm()` across the app.
 */
const ConfirmModal = ({
  isOpen,
  title = 'Are you sure?',
  message = '',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger', // 'danger' | 'warning'
  onConfirm,
  onCancel,
  loading = false,
}) => {
  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      icon: 'bg-red-500/15 text-red-400',
      button: 'bg-red-600/20 text-red-400 border-red-500/30 hover:bg-red-600/30 hover:border-red-500/50',
    },
    warning: {
      icon: 'bg-amber-500/15 text-amber-400',
      button: 'bg-amber-600/20 text-amber-400 border-amber-500/30 hover:bg-amber-600/30 hover:border-amber-500/50',
    },
  };

  const styles = variantStyles[variant] || variantStyles.danger;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="glass-card p-6 w-full max-w-sm mx-4 animate-scale-in">
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${styles.icon}`}>
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-dark-100">{title}</h3>
            {message && (
              <p className="text-sm text-dark-400 mt-1">{message}</p>
            )}
          </div>
          <button
            onClick={onCancel}
            className="btn-ghost p-1 shrink-0"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 justify-end mt-6">
          <button
            onClick={onCancel}
            className="btn-secondary text-sm py-2 px-4"
            disabled={loading}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ${styles.button}`}
          >
            {loading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                Processing...
              </>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
