import { useState } from 'react';
import { Folder, FolderPlus, Trash2, ChevronRight, Home, X, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { foldersAPI } from '../services/api';
import ConfirmModal from './ConfirmModal';

/**
 * FolderList
 * Sidebar component for folder navigation and creation.
 * Supports mobile mode (overlay drawer) via `isMobileOpen` prop.
 */
const FolderList = ({
  folders,
  selectedFolder,
  onSelectFolder,
  onFoldersChange,
  loading,
  isMobileOpen = false,
  onMobileClose,
}) => {
  const [showCreate, setShowCreate] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const handleCreateFolder = async (e) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    setCreating(true);
    try {
      await foldersAPI.create(newFolderName.trim());
      toast.success('Folder created!');
      setNewFolderName('');
      setShowCreate(false);
      onFoldersChange();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create folder');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteFolder = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await foldersAPI.delete(deleteTarget._id);
      toast.success('Folder deleted');
      if (selectedFolder === deleteTarget._id) {
        onSelectFolder(null);
      }
      setDeleteTarget(null);
      onFoldersChange();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete folder');
    } finally {
      setDeleting(false);
    }
  };

  const handleFolderSelect = (folderId) => {
    onSelectFolder(folderId);
    if (onMobileClose) onMobileClose();
  };

  const sidebarContent = (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-5 pb-3 border-b border-dark-700/40">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-primary-500/20 to-purple-500/20 flex items-center justify-center">
            <Folder className="w-3.5 h-3.5 text-primary-400" />
          </div>
          <h2 className="text-xs font-semibold text-dark-300 uppercase tracking-wider">Folders</h2>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowCreate(!showCreate)}
            className={`p-1.5 rounded-lg transition-all duration-200 ${
              showCreate
                ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                : 'bg-primary-500/10 text-primary-400 hover:bg-primary-500/20'
            }`}
            title={showCreate ? 'Cancel' : 'New Folder'}
            id="new-folder-btn"
          >
            {showCreate ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          </button>
          {/* Close button for mobile overlay */}
          {isMobileOpen && onMobileClose && (
            <button
              onClick={onMobileClose}
              className="btn-ghost p-1.5 md:hidden"
              aria-label="Close sidebar"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Create folder form */}
      {showCreate && (
        <form onSubmit={handleCreateFolder} className="mb-4 animate-slide-down">
          <div className="flex gap-2">
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Folder name"
              className="input-field text-sm py-2"
              autoFocus
              id="folder-name-input"
            />
            <button
              type="submit"
              disabled={creating || !newFolderName.trim()}
              className="btn-primary text-sm py-2 px-3 whitespace-nowrap"
              id="create-folder-submit"
            >
              {creating ? (
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
              ) : (
                'Add'
              )}
            </button>
          </div>
        </form>
      )}

      {/* Folder list */}
      <nav className="flex-1 overflow-y-auto space-y-1">
        {/* All Files (root) */}
        <button
          onClick={() => handleFolderSelect(null)}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 group
            ${selectedFolder === null
              ? 'bg-primary-500/15 text-primary-400 border border-primary-500/20 shadow-sm shadow-primary-500/5'
              : 'text-dark-300 hover:bg-dark-800 hover:text-dark-200'
            }`}
          id="all-files-btn"
        >
          <Home className="w-4 h-4 shrink-0" />
          <span className="truncate flex-1 text-left font-medium">All Files</span>
        </button>

        {loading ? (
          <div className="py-8 text-center">
            <div className="w-5 h-5 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin mx-auto" />
          </div>
        ) : (
          folders.map((folder) => (
            <div
              role="button"
              tabIndex={0}
              key={folder._id}
              onClick={() => handleFolderSelect(folder._id)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleFolderSelect(folder._id); } }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 group cursor-pointer
                ${selectedFolder === folder._id
                  ? 'bg-primary-500/15 text-primary-400 border border-primary-500/20 shadow-sm shadow-primary-500/5'
                  : 'text-dark-300 hover:bg-dark-800 hover:text-dark-200'
                }`}
            >
              <Folder className={`w-4 h-4 shrink-0 transition-colors ${
                selectedFolder === folder._id ? 'text-primary-400' : 'text-dark-500 group-hover:text-dark-400'
              }`} />
              <span className="truncate flex-1 text-left">{folder.name}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded-md transition-colors ${
                selectedFolder === folder._id
                  ? 'bg-primary-500/20 text-primary-300'
                  : 'bg-dark-700/50 text-dark-500'
              }`}>
                {folder.fileCount}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); setDeleteTarget(folder); }}
                className="opacity-0 group-hover:opacity-100 text-dark-500 hover:text-red-400 transition-all p-1 rounded-md hover:bg-red-500/10"
                title="Delete folder"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}

        {!loading && folders.length === 0 && (
          <div className="py-8 text-center">
            <div className="w-12 h-12 rounded-xl bg-dark-800/50 flex items-center justify-center mx-auto mb-3">
              <FolderPlus className="w-5 h-5 text-dark-600" />
            </div>
            <p className="text-dark-500 text-xs mb-1">No folders yet</p>
            <p className="text-dark-600 text-xs">
              Click <span className="text-primary-400">+</span> to create one
            </p>
          </div>
        )}
      </nav>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Delete Folder"
        message={`Delete "${deleteTarget?.name}"? Files inside will be moved to root.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDeleteFolder}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </>
  );

  // Mobile overlay mode
  if (isMobileOpen) {
    return (
      <div className="fixed inset-0 z-40 md:hidden">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onMobileClose} />
        <aside className="absolute top-0 left-0 w-64 h-full glass-card rounded-none border-l-0 border-t-0 border-b-0 p-4 flex flex-col animate-slide-right z-50">
          {sidebarContent}
        </aside>
      </div>
    );
  }

  // Desktop sidebar (hidden on mobile by default)
  return (
    <aside className="w-64 shrink-0 glass-card rounded-none border-t-0 border-b-0 border-l-0 p-4 flex-col h-full overflow-hidden hidden md:flex">
      {sidebarContent}
    </aside>
  );
};

export default FolderList;
