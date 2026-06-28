import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/useAuth';
import { adminAPI } from '../services/api';
import Navbar from '../components/Navbar';
import {
  Users, FileText, HardDrive, Shield, ShieldOff, UserCheck, UserX,
  Trash2, ChevronLeft, ChevronRight, Search, Loader2, Crown,
  Activity, Ban, CheckCircle, AlertTriangle, Files
} from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * AdminDashboardPage
 * Platform-wide admin panel with:
 * - Stats overview (users, files, storage)
 * - User management (search, paginate, suspend/activate, promote/demote)
 * - File management (all files across users, admin delete)
 * - Tab-based navigation between Users and Files views
 */

// ─── Stats Cards ───────────────────────────────────────
const StatsPanel = ({ stats, loading }) => {
  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const cards = [
    {
      label: 'Total Users',
      value: stats.totalUsers ?? '—',
      icon: Users,
      gradient: 'from-primary-500 to-purple-600',
      shadow: 'shadow-primary-500/20',
    },
    {
      label: 'Total Files',
      value: stats.totalFiles ?? '—',
      icon: Files,
      gradient: 'from-emerald-500 to-teal-600',
      shadow: 'shadow-emerald-500/20',
    },
    {
      label: 'Storage Used',
      value: stats.totalStorage != null ? formatBytes(stats.totalStorage) : '—',
      icon: HardDrive,
      gradient: 'from-amber-500 to-orange-600',
      shadow: 'shadow-amber-500/20',
    },
    {
      label: 'Admins',
      value: stats.usersByRole?.admin ?? 0,
      icon: Crown,
      gradient: 'from-rose-500 to-pink-600',
      shadow: 'shadow-rose-500/20',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((card) => (
        <div
          key={card.label}
          className="glass-card p-4 animate-fade-in"
        >
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl bg-linear-to-br ${card.gradient} flex items-center justify-center shadow-lg ${card.shadow}`}>
              <card.icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-dark-100">
                {loading ? <span className="skeleton-shimmer inline-block w-10 h-6 rounded" /> : card.value}
              </p>
              <p className="text-xs text-dark-500">{card.label}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// ─── Status / Role Badges ──────────────────────────────
const StatusBadge = ({ status }) => {
  const config = {
    active: { label: 'Active', className: 'badge-green' },
    suspended: { label: 'Suspended', className: 'badge-amber' },
    disabled: { label: 'Disabled', className: 'badge-red' },
  };
  const c = config[status] || config.active;
  return <span className={c.className}>{c.label}</span>;
};

const RoleBadge = ({ role }) => {
  if (role === 'admin') {
    return (
      <span className="badge-primary flex items-center gap-1 w-fit">
        <Crown className="w-3 h-3" />
        Admin
      </span>
    );
  }
  return <span className="badge text-dark-400 bg-dark-700/50 border border-dark-600/30">User</span>;
};

// ─── User Management Tab ───────────────────────────────
const UserManagement = ({ currentUserId }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionLoading, setActionLoading] = useState(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getUsers({ search, page, limit: 15 });
      setUsers(res.data.data.users);
      setTotalPages(res.data.data.pages);
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    const timer = setTimeout(fetchUsers, 300);
    return () => clearTimeout(timer);
  }, [fetchUsers]);

  useEffect(() => { setPage(1); }, [search]);

  const handleStatusChange = async (userId, newStatus) => {
    setActionLoading(userId);
    try {
      await adminAPI.updateUserStatus(userId, newStatus);
      toast.success(`User ${newStatus}`);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    setActionLoading(userId);
    try {
      await adminAPI.updateUserRole(userId, newRole);
      toast.success(`User role set to ${newRole}`);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update role');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div>
      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
        <input
          type="text"
          placeholder="Search users by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field pl-10 text-sm py-2.5"
          id="admin-user-search"
        />
      </div>

      {/* Users Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
        </div>
      ) : users.length === 0 ? (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <Users className="w-10 h-10 text-dark-600 mx-auto mb-2" />
            <p className="text-dark-400">No users found</p>
          </div>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {users.map((user, idx) => {
              const isSelf = user._id === currentUserId;
              const isActioning = actionLoading === user._id;

              return (
                <div
                  key={user._id}
                  className={`glass-card p-4 animate-fade-in ${isSelf ? 'border-primary-500/30' : ''}`}
                  style={{ animationDelay: `${idx * 30}ms` }}
                >
                  <div className="flex items-center gap-4 flex-wrap">
                    {/* Avatar */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                      user.role === 'admin'
                        ? 'bg-linear-to-br from-primary-500 to-purple-600'
                        : 'bg-dark-700'
                    }`}>
                      <span className="text-sm font-bold text-white">
                        {user.name?.charAt(0).toUpperCase()}
                      </span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-dark-100 truncate">
                          {user.name}
                          {isSelf && <span className="text-primary-400 text-xs ml-1">(you)</span>}
                        </p>
                        <RoleBadge role={user.role} />
                        <StatusBadge status={user.status} />
                      </div>
                      <p className="text-xs text-dark-500 truncate">{user.email}</p>
                      <p className="text-xs text-dark-600 mt-0.5">
                        Joined {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>

                    {/* Actions */}
                    {!isSelf && (
                      <div className="flex items-center gap-2 shrink-0 flex-wrap">
                        {isActioning ? (
                          <Loader2 className="w-4 h-4 text-primary-500 animate-spin" />
                        ) : (
                          <>
                            {/* Status toggle */}
                            {user.status === 'active' ? (
                              <button
                                onClick={() => handleStatusChange(user._id, 'suspended')}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 transition-all"
                                title="Suspend user"
                              >
                                <Ban className="w-3 h-3" />
                                Suspend
                              </button>
                            ) : (
                              <button
                                onClick={() => handleStatusChange(user._id, 'active')}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all"
                                title="Activate user"
                              >
                                <CheckCircle className="w-3 h-3" />
                                Activate
                              </button>
                            )}

                            {/* Role toggle */}
                            {user.role === 'admin' ? (
                              <button
                                onClick={() => handleRoleChange(user._id, 'user')}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-all"
                                title="Demote to user"
                              >
                                <ShieldOff className="w-3 h-3" />
                                Demote
                              </button>
                            ) : (
                              <button
                                onClick={() => handleRoleChange(user._id, 'admin')}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-primary-400 bg-primary-500/10 border border-primary-500/20 hover:bg-primary-500/20 transition-all"
                                title="Promote to admin"
                              >
                                <Shield className="w-3 h-3" />
                                Promote
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-6" id="admin-users-pagination">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="btn-ghost disabled:opacity-30"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm text-dark-400">
                Page <span className="text-dark-200 font-medium">{page}</span> of{' '}
                <span className="text-dark-200 font-medium">{totalPages}</span>
              </span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= totalPages}
                className="btn-ghost disabled:opacity-30"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// ─── File Management Tab ───────────────────────────────
const FileManagement = () => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [deleteLoading, setDeleteLoading] = useState(null);

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getAllFiles({ search, page, limit: 15 });
      setFiles(res.data.data.files);
      setTotalPages(res.data.data.pages);
    } catch {
      toast.error('Failed to load files');
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    const timer = setTimeout(fetchFiles, 300);
    return () => clearTimeout(timer);
  }, [fetchFiles]);

  useEffect(() => { setPage(1); }, [search]);

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleDelete = async (fileId, fileName) => {
    if (!window.confirm(`Delete "${fileName}"? This cannot be undone.`)) return;
    setDeleteLoading(fileId);
    try {
      await adminAPI.deleteFile(fileId);
      toast.success('File deleted');
      fetchFiles();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete file');
    } finally {
      setDeleteLoading(null);
    }
  };

  return (
    <div>
      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
        <input
          type="text"
          placeholder="Search files by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field pl-10 text-sm py-2.5"
          id="admin-file-search"
        />
      </div>

      {/* Files List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
        </div>
      ) : files.length === 0 ? (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <FileText className="w-10 h-10 text-dark-600 mx-auto mb-2" />
            <p className="text-dark-400">No files found</p>
          </div>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {files.map((file, idx) => (
              <div
                key={file._id}
                className="glass-card-hover p-4 animate-fade-in"
                style={{ animationDelay: `${idx * 30}ms` }}
              >
                <div className="flex items-center gap-4">
                  <div className="w-9 h-9 rounded-lg bg-dark-700 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4 text-dark-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-dark-100 truncate">{file.originalName}</p>
                    <div className="flex items-center gap-3 text-xs text-dark-500 mt-0.5">
                      <span>{formatBytes(file.size)}</span>
                      <span>•</span>
                      <span className="truncate">
                        Owner: {file.userId?.name || file.userId?.email || 'Unknown'}
                      </span>
                      <span>•</span>
                      <span>{new Date(file.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(file._id, file.originalName)}
                    disabled={deleteLoading === file._id}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-all disabled:opacity-50 shrink-0"
                    title="Delete file"
                  >
                    {deleteLoading === file._id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Trash2 className="w-3 h-3" />
                    )}
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-6" id="admin-files-pagination">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="btn-ghost disabled:opacity-30"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm text-dark-400">
                Page <span className="text-dark-200 font-medium">{page}</span> of{' '}
                <span className="text-dark-200 font-medium">{totalPages}</span>
              </span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= totalPages}
                className="btn-ghost disabled:opacity-30"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// ─── Main Admin Page ───────────────────────────────────
const AdminDashboardPage = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('users');
  const [stats, setStats] = useState({});
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setStatsLoading(true);
      try {
        const res = await adminAPI.getStats();
        setStats(res.data.data);
      } catch {
        // Stats are optional — don't block the page
      } finally {
        setStatsLoading(false);
      }
    };
    fetchStats();
  }, []);

  const tabs = [
    { id: 'users', label: 'Users', icon: Users },
    { id: 'files', label: 'Files', icon: FileText },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-dark-950">
      <Navbar searchQuery="" onSearchChange={() => {}} />

      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-linear-to-br from-primary-500 to-purple-600 flex items-center justify-center shadow-lg shadow-primary-500/20">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-dark-100">Admin Dashboard</h1>
            <p className="text-sm text-dark-500">Manage users, files, and platform settings</p>
          </div>
        </div>

        {/* Stats */}
        <StatsPanel stats={stats} loading={statsLoading} />

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-6 border-b border-dark-700/50 pb-3">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-primary-500/15 text-primary-400 border border-primary-500/20'
                  : 'text-dark-400 hover:bg-dark-800 hover:text-dark-200'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'users' ? (
          <UserManagement currentUserId={user?.id} />
        ) : (
          <FileManagement />
        )}
      </main>
    </div>
  );
};

export default AdminDashboardPage;
