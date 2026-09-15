import { useState, useEffect, useCallback } from 'react';
import { activityAPI } from '../services/api';
import Navbar from '../components/Navbar';
import {
  Upload, Download, Trash2, Edit3, Share2, LogIn, UserPlus,
  File, ChevronLeft, ChevronRight, Filter, Loader2, Activity
} from 'lucide-react';

/**
 * ActivityPage
 * Full activity history page with:
 * - Timeline view of all user actions
 * - Filter by action type
 * - Pagination
 */
const ActivityPage = () => {
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [page, setPage] = useState(1);

  const actionTypes = [
    { value: '', label: 'All', icon: null },
    { value: 'UPLOAD', label: 'Uploads', icon: Upload },
    { value: 'DOWNLOAD', label: 'Downloads', icon: Download },
    { value: 'DELETE', label: 'Deletes', icon: Trash2 },
    { value: 'RENAME', label: 'Renames', icon: Edit3 },
    { value: 'SHARE', label: 'Shares', icon: Share2 },
    { value: 'LOGIN', label: 'Logins', icon: LogIn },
  ];

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (actionFilter) params.action = actionFilter;

      const res = await activityAPI.getLogs(params);
      setLogs(res.data.data.logs);
      setPagination(res.data.data.pagination);
    } catch {
      console.error('Failed to load activity');
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Reset page when filter changes
  useEffect(() => {
    setPage(1);
  }, [actionFilter]);

  // Get action icon + color
  const getActionConfig = (action) => {
    const configs = {
      UPLOAD: { Icon: Upload, color: 'text-emerald-400', bg: 'bg-emerald-500/15', label: 'Uploaded' },
      DOWNLOAD: { Icon: Download, color: 'text-blue-400', bg: 'bg-blue-500/15', label: 'Downloaded' },
      DELETE: { Icon: Trash2, color: 'text-red-400', bg: 'bg-red-500/15', label: 'Deleted' },
      RENAME: { Icon: Edit3, color: 'text-amber-400', bg: 'bg-amber-500/15', label: 'Renamed' },
      SHARE: { Icon: Share2, color: 'text-purple-400', bg: 'bg-purple-500/15', label: 'Shared' },
      LOGIN: { Icon: LogIn, color: 'text-primary-400', bg: 'bg-primary-500/15', label: 'Logged in' },
      REGISTER: { Icon: UserPlus, color: 'text-pink-400', bg: 'bg-pink-500/15', label: 'Registered' },
    };
    return configs[action] || { Icon: File, color: 'text-dark-400', bg: 'bg-dark-500/15', label: action };
  };

  // Format time
  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-dark-950">
      <Navbar searchQuery="" onSearchChange={() => {}} showSearch={false} />

      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-linear-to-br from-primary-500 to-purple-600 flex items-center justify-center">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-dark-100">Activity History</h1>
            <p className="text-sm text-dark-500">Track all your actions</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          <Filter className="w-4 h-4 text-dark-500" />
          {actionTypes.map((type) => (
            <button
              key={type.value}
              onClick={() => setActionFilter(type.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-1.5 ${
                actionFilter === type.value
                  ? 'bg-primary-500/15 text-primary-400 border border-primary-500/20'
                  : 'text-dark-400 hover:bg-dark-800 hover:text-dark-300'
              }`}
            >
              {type.icon && <type.icon className="w-3 h-3" />}
              {type.label}
            </button>
          ))}
        </div>

        {/* Activity List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
              <p className="text-dark-400 text-sm">Loading activity...</p>
            </div>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="w-16 h-16 rounded-2xl bg-dark-800 flex items-center justify-center">
                <Activity className="w-8 h-8 text-dark-600" />
              </div>
              <p className="text-dark-300 font-medium">No activity found</p>
              <p className="text-dark-500 text-sm">
                {actionFilter ? `No ${actionFilter.toLowerCase()} actions yet` : 'Start using SecureVault to see activity here'}
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Timeline */}
            <div className="space-y-2">
              {logs.map((log, idx) => {
                const config = getActionConfig(log.action);
                return (
                  <div
                    key={log._id}
                    className="glass-card-hover p-4 animate-fade-in"
                    style={{ animationDelay: `${idx * 30}ms` }}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg ${config.bg} flex items-center justify-center shrink-0`}>
                        <config.Icon className={`w-4 h-4 ${config.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-dark-200">
                          <span className="font-medium">{config.label}</span>
                          {log.resourceName && (
                            <span className="text-dark-400"> — {log.resourceName}</span>
                          )}
                        </p>
                        {log.details && log.details.oldName && (
                          <p className="text-xs text-dark-500 mt-0.5">
                            {log.details.oldName} → {log.details.newName}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-dark-500 whitespace-nowrap shrink-0">
                        {formatTime(log.createdAt)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-8" id="activity-pagination">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={!pagination.hasPrevPage}
                  className="btn-ghost disabled:opacity-30"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-sm text-dark-400">
                  Page <span className="text-dark-200 font-medium">{pagination.page}</span> of{' '}
                  <span className="text-dark-200 font-medium">{pagination.totalPages}</span>
                </span>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!pagination.hasNextPage}
                  className="btn-ghost disabled:opacity-30"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default ActivityPage;
