import { useState, useEffect, useCallback } from 'react';
import Navbar from '../components/Navbar';
import FolderList from '../components/FolderList';
import UploadZone from '../components/UploadZone';
import FileCard from '../components/FileCard';
import AnalyticsPanel from '../components/AnalyticsPanel';
import { filesAPI, foldersAPI } from '../services/api';
import { FileX, Loader2, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { FileListSkeleton } from '../components/SkeletonLoader';
import toast from 'react-hot-toast';

/**
 * DashboardPage
 * Main file management interface with:
 * - Analytics panel at top
 * - Sidebar folder navigation
 * - Upload zone (drag & drop)
 * - File list with search, type filters, and pagination
 * - Loading and empty states
 */
const DashboardPage = () => {
  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [loadingFolders, setLoadingFolders] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});

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
      const params = { page, limit: 12 };
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
  }, [selectedFolder, searchQuery, typeFilter, page]);

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
  }, [selectedFolder, searchQuery, typeFilter]);

  const typeFilters = [
    { value: '', label: 'All' },
    { value: 'image', label: 'Images' },
    { value: 'pdf', label: 'PDFs' },
    { value: 'document', label: 'Docs' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-dark-950">
      <Navbar searchQuery={searchQuery} onSearchChange={setSearchQuery} />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <FolderList
          folders={folders}
          selectedFolder={selectedFolder}
          onSelectFolder={setSelectedFolder}
          onFoldersChange={fetchFolders}
          loading={loadingFolders}
        />

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {/* Analytics Panel */}
          <AnalyticsPanel />

          {/* Upload Zone */}
          <UploadZone
            folderId={selectedFolder}
            onUploadComplete={fetchFiles}
          />

          {/* Toolbar */}
          <div className="flex items-center justify-between mt-6 mb-4">
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
                    onFileChange={fetchFiles}
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
