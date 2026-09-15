import { useState, useEffect, useCallback } from 'react';
import Navbar from '../components/Navbar';
import FolderList from '../components/FolderList';
import UploadZone from '../components/UploadZone';
import FileCard from '../components/FileCard';
import AnalyticsPanel from '../components/AnalyticsPanel';
import api, { filesAPI, foldersAPI } from '../services/api';
import { FileX, Loader2, Filter, ChevronLeft, ChevronRight, ArrowUpDown, FolderOpen } from 'lucide-react';
import { FileListSkeleton } from '../components/SkeletonLoader';
import toast from 'react-hot-toast';

/**
 * DashboardPage
 * Main file management interface with:
 * - Analytics panel at top
 * - Sidebar folder navigation (collapsible on mobile)
 * - Upload zone (drag & drop, multi-file)
 * - File list with search, type filters, sort dropdown, and pagination
 * - Loading and empty states
 */
const DashboardPage = () => {
  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [sortBy, setSortBy] = useState('date_desc');
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [loadingFolders, setLoadingFolders] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [maxFileSize, setMaxFileSize] = useState(null);
  const [analyticsKey, setAnalyticsKey] = useState(0);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Fetch server config (max file size) from health endpoint
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await api.get('/health');
        setMaxFileSize(res.data.data?.maxFileSize);
      } catch {
        // Silently fall back to client default
      }
    };
    fetchConfig();
  }, []);

  // Fetch folders
  const fetchFolders = useCallback(async () => {
    setLoadingFolders(true);
    try {
      const res = await foldersAPI.getAll();
      setFolders(res.data.data.folders);
    } catch {
      toast.error('Failed to load folders');
    } finally {
      setLoadingFolders(false);
    }
  }, []);

  // Fetch files with filters and pagination
  const fetchFiles = useCallback(async () => {
    setLoadingFiles(true);
    try {
      const params = { page, limit: 12, sort: sortBy };
      if (selectedFolder) params.folderId = selectedFolder;
      if (searchQuery) params.search = searchQuery;
      if (typeFilter) params.type = typeFilter;

      const res = await filesAPI.getAll(params);
      setFiles(res.data.data.files);
      setPagination(res.data.data.pagination || {});
    } catch {
      toast.error('Failed to load files');
    } finally {
      setLoadingFiles(false);
    }
  }, [selectedFolder, searchQuery, typeFilter, sortBy, page]);

  // Helper: refetch files, folders, AND bump analytics after any file mutation
  const handleFileMutation = useCallback(() => {
    fetchFiles();
    fetchFolders();
    setAnalyticsKey((k) => k + 1);
  }, [fetchFiles, fetchFolders]);

  // Initial load
  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

  // Re-fetch files when filters change (with debounce for search)
  useEffect(() => {
    const timer = setTimeout(fetchFiles, 300);
    return () => clearTimeout(timer);
  }, [fetchFiles, searchQuery]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [selectedFolder, searchQuery, typeFilter, sortBy]);

  const typeFilters = [
    { value: '', label: 'All' },
    { value: 'image', label: 'Images' },
    { value: 'pdf', label: 'PDFs' },
    { value: 'document', label: 'Docs' },
  ];

  const sortOptions = [
    { value: 'date_desc', label: 'Newest First' },
    { value: 'date_asc', label: 'Oldest First' },
    { value: 'name_asc', label: 'Name (A-Z)' },
    { value: 'name_desc', label: 'Name (Z-A)' },
    { value: 'size_desc', label: 'Size (Largest)' },
    { value: 'size_asc', label: 'Size (Smallest)' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-dark-950">
      <Navbar searchQuery={searchQuery} onSearchChange={setSearchQuery} showSearch={true} />

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        <FolderList
          folders={folders}
          selectedFolder={selectedFolder}
          onSelectFolder={setSelectedFolder}
          onFoldersChange={fetchFolders}
          loading={loadingFolders}
        />

        {/* Mobile Sidebar Overlay — only mount when open */}
        {mobileSidebarOpen && (
          <FolderList
            folders={folders}
            selectedFolder={selectedFolder}
            onSelectFolder={setSelectedFolder}
            onFoldersChange={fetchFolders}
            loading={loadingFolders}
            isMobileOpen={true}
            onMobileClose={() => setMobileSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {/* Analytics Panel */}
          <AnalyticsPanel refreshKey={analyticsKey} />

          {/* Mobile folder toggle button */}
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="md:hidden flex items-center gap-2 text-sm text-dark-400 hover:text-dark-200 mb-4 btn-ghost px-3 py-2"
            id="mobile-sidebar-btn"
          >
            <FolderOpen className="w-4 h-4" />
            {selectedFolder
              ? folders.find((f) => f._id === selectedFolder)?.name || 'Folder'
              : 'All Files'
            }
          </button>

          {/* Upload Zone */}
          <UploadZone
            folderId={selectedFolder}
            onUploadComplete={handleFileMutation}
            maxFileSize={maxFileSize}
          />

          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mt-6 mb-4 gap-3">
            <div>
              <h2 className="text-lg font-semibold text-dark-100">
                {selectedFolder
                  ? folders.find((f) => f._id === selectedFolder)?.name || 'Folder'
                  : 'All Files'
                }
              </h2>
              <p className="text-sm text-dark-500">
                {loadingFiles
                  ? 'Loading...'
                  : `${pagination.total || files.length} file${(pagination.total || files.length) !== 1 ? 's' : ''}`
                }
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {/* Sort Dropdown */}
              <div className="flex items-center gap-1.5">
                <ArrowUpDown className="w-4 h-4 text-dark-500" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-dark-800/80 border border-dark-600/50 rounded-lg text-sm text-dark-300 px-2.5 py-1.5 focus:outline-none focus:border-primary-500/50 focus:ring-2 focus:ring-primary-500/20 cursor-pointer"
                  id="sort-select"
                  aria-label="Sort files"
                >
                  {sortOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Type filter */}
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-dark-500" />
                <div className="flex gap-1">
                  {typeFilters.map((filter) => (
                    <button
                      key={filter.value}
                      onClick={() => setTypeFilter(filter.value)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                        typeFilter === filter.value
                          ? 'bg-primary-500/15 text-primary-400 border border-primary-500/20'
                          : 'text-dark-400 hover:bg-dark-800 hover:text-dark-300'
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* File List */}
          {loadingFiles ? (
            <FileListSkeleton count={4} />
          ) : files.length === 0 ? (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="w-16 h-16 rounded-2xl bg-dark-800 flex items-center justify-center">
                  <FileX className="w-8 h-8 text-dark-600" />
                </div>
                <div>
                  <p className="text-dark-300 font-medium mb-1">No files found</p>
                  <p className="text-dark-500 text-sm">
                    {searchQuery
                      ? `No results for "${searchQuery}"`
                      : 'Upload files to get started'
                    }
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="grid gap-3">
                {files.map((file) => (
                  <FileCard
                    key={file._id}
                    file={file}
                    folders={folders}
                    onFileChange={handleFileMutation}
                  />
                ))}
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 mt-6" id="files-pagination">
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
    </div>
  );
};

export default DashboardPage;
