import { useState, useEffect } from 'react';
import { activityAPI } from '../services/api';
import {
  HardDrive, FileText, Image, File, TrendingUp,
  Upload, Download, Trash2, Edit3, Share2, LogIn, UserPlus,
  Loader2
} from 'lucide-react';

/**
 * AnalyticsPanel
 * Dashboard widget showing storage analytics:
 * - Total storage used with visual bar
 * - File count by category
 * - Upload trend (last 7 days)
 * - Recent activity timeline
 */
const AnalyticsPanel = ({ refreshKey }) => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const res = await activityAPI.getAnalytics();
        setAnalytics(res.data.data);
      } catch (error) {
        console.error('Failed to load analytics', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [refreshKey]);

  // Format bytes to human-readable
  const formatSize = (bytes) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  };

  // Get icon for file type category
  const getCategoryIcon = (category) => {
    switch (category) {
      case 'Images': return <Image className="w-4 h-4 text-emerald-400" />;
      case 'PDFs': return <FileText className="w-4 h-4 text-red-400" />;
      case 'Documents': return <FileText className="w-4 h-4 text-blue-400" />;
      default: return <File className="w-4 h-4 text-dark-400" />;
    }
  };

  // Get icon for activity action
  const getActionIcon = (action) => {
    const icons = {
      UPLOAD: <Upload className="w-3.5 h-3.5 text-emerald-400" />,
      DOWNLOAD: <Download className="w-3.5 h-3.5 text-blue-400" />,
      DELETE: <Trash2 className="w-3.5 h-3.5 text-red-400" />,
      RENAME: <Edit3 className="w-3.5 h-3.5 text-amber-400" />,
      SHARE: <Share2 className="w-3.5 h-3.5 text-purple-400" />,
      LOGIN: <LogIn className="w-3.5 h-3.5 text-primary-400" />,
      REGISTER: <UserPlus className="w-3.5 h-3.5 text-pink-400" />,
    };
    return icons[action] || <File className="w-3.5 h-3.5 text-dark-400" />;
  };

  // Format relative time
  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="glass-card p-5 animate-pulse">
            <div className="h-4 bg-dark-700 rounded w-1/3 mb-3" />
            <div className="h-8 bg-dark-700 rounded w-2/3 mb-2" />
            <div className="h-3 bg-dark-700 rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (!analytics) return null;

  const maxStorage = 100 * 1024 * 1024; // 100MB visual cap
  const storagePercent = Math.min(100, (analytics.storage.totalSize / maxStorage) * 100);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 animate-fade-in" id="analytics-panel">
      {/* Storage Card */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-primary-500/15 flex items-center justify-center">
            <HardDrive className="w-4 h-4 text-primary-400" />
          </div>
          <span className="text-sm text-dark-400">Storage Used</span>
        </div>
        <p className="text-2xl font-bold text-dark-100 mb-1">
          {formatSize(analytics.storage.totalSize)}
        </p>
        <p className="text-xs text-dark-500 mb-3">
          {analytics.storage.totalFiles} file{analytics.storage.totalFiles !== 1 ? 's' : ''}
        </p>
        {/* Storage bar */}
        <div className="w-full h-2 bg-dark-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-linear-to-r from-primary-500 to-purple-500 rounded-full transition-all duration-700"
            style={{ width: `${Math.max(2, storagePercent)}%` }}
          />
        </div>
      </div>

      {/* Files by Type Card */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
            <FileText className="w-4 h-4 text-emerald-400" />
          </div>
          <span className="text-sm text-dark-400">File Types</span>
        </div>
        {analytics.filesByType.length > 0 ? (
          <div className="space-y-2">
            {analytics.filesByType.map((cat) => (
              <div key={cat._id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getCategoryIcon(cat._id)}
                  <span className="text-sm text-dark-300">{cat._id}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-dark-500">{formatSize(cat.size)}</span>
                  <span className="text-sm font-medium text-dark-200">{cat.count}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-dark-500">No files yet</p>
        )}
      </div>

      {/* Recent Activity Card */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-amber-400" />
          </div>
          <span className="text-sm text-dark-400">Recent Activity</span>
        </div>
        {analytics.recentActivity.length > 0 ? (
          <div className="space-y-2.5">
            {analytics.recentActivity.slice(0, 4).map((log) => (
              <div key={log._id} className="flex items-center gap-2">
                {getActionIcon(log.action)}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-dark-300 truncate">
                    {log.resourceName || log.action}
                  </p>
                </div>
                <span className="text-xs text-dark-500 whitespace-nowrap">
                  {timeAgo(log.createdAt)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-dark-500">No activity yet</p>
        )}
      </div>
    </div>
  );
};

export default AnalyticsPanel;
