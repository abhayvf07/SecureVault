import { useState, useRef } from 'react';
import {
  Download, Trash2, Edit3, Share2, MoreVertical,
  Check, X, Copy, Clock, Lock, Hash, Eye,
  Move, FolderInput, Home
} from 'lucide-react';
import toast from 'react-hot-toast';
import FileIcon from './FileIcon';
import ConfirmModal from './ConfirmModal';
import ContextMenu from './ContextMenu';
import PreviewModal from './PreviewModal';
import { filesAPI, shareAPI } from '../services/api';

/**
 * FileCard
 * Displays file info with Drive-style interactions:
 * - Double-click anywhere → opens PreviewModal
 * - Right-click anywhere → custom context menu at cursor
 * - MoreVertical (⋮) button → same menu anchored to button (for touch/mobile)
 *
 * Context menu items: Open, Download, Move to..., Copy to..., Rename, Share, Delete
 */
const FileCard = ({ file, folders = [], onFileChange }) => {
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(file.originalName);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareOptions, setShareOptions] = useState({
    expiryHours: '',
    password: '',
    downloadLimit: '',
  });
  const [shareResult, setShareResult] = useState(null);
  const [isSharing, setIsSharing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [contextMenu, setContextMenu] = useState(null); // { x, y } or null
  const moreButtonRef = useRef(null);

  // Format file size
  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Format date
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${Math.floor(diffHours)}h ago`;
    if (diffHours < 48) return 'Yesterday';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // ─── Actions ───
  const handleDownload = async () => {
    try {
      await filesAPI.download(file._id, file.originalName);
      toast.success('Download started');
    } catch {
      toast.error('Download failed');
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await filesAPI.delete(file._id);
      toast.success('File deleted');
      setShowDeleteConfirm(false);
      onFileChange();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRename = async () => {
    if (!newName.trim() || newName === file.originalName) {
      setIsRenaming(false);
      return;
    }
    try {
      await filesAPI.rename(file._id, newName.trim());
      toast.success('File renamed');
      onFileChange();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Rename failed');
    }
    setIsRenaming(false);
  };

  const handleShare = async () => {
    setIsSharing(true);
    try {
      const options = {};
      if (shareOptions.expiryHours) options.expiryHours = Number(shareOptions.expiryHours);
      if (shareOptions.password) options.password = shareOptions.password;
      if (shareOptions.downloadLimit) options.downloadLimit = Number(shareOptions.downloadLimit);

      const res = await shareAPI.create(file._id, options);
      setShareResult(res.data.data);
      toast.success('Share link created!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create share link');
    } finally {
      setIsSharing(false);
    }
  };

  const handleMove = async (folderId) => {
    try {
      await filesAPI.move(file._id, folderId);
      toast.success('File moved');
      onFileChange();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Move failed');
    }
  };

  const handleCopy = async (folderId) => {
    try {
      await filesAPI.copy(file._id, folderId);
      toast.success('File copied');
      onFileChange();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Copy failed');
    }
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText(shareResult.shareUrl);
    toast.success('Link copied to clipboard!');
  };

  // ─── Context Menu ───
  const handleContextMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const handleMoreClick = (e) => {
    e.stopPropagation();
    const rect = moreButtonRef.current.getBoundingClientRect();
    setContextMenu({ x: rect.right - 200, y: rect.bottom + 4 });
  };

  const handleDoubleClick = (e) => {
    // Don't open preview if user is renaming or clicked on an interactive element
    if (isRenaming) return;
    if (e.target.closest('button') || e.target.closest('input')) return;
    setShowPreview(true);
  };

  // Build folder sub-menu items for Move and Copy
  const buildFolderSubmenu = (action) => {
    const items = [
      {
        label: 'Root (All Files)',
        icon: Home,
        active: file.folderId === null,
        onClick: () => action(null),
      },
    ];

    if (folders.length > 0) {
      items.push({ divider: true });
      folders.forEach((folder) => {
        items.push({
          label: folder.name,
          icon: FolderInput,
          active: file.folderId === folder._id,
          onClick: () => action(folder._id),
        });
      });
    }

    return items;
  };

  const contextMenuItems = [
    {
      label: 'Open',
      icon: Eye,
      onClick: () => setShowPreview(true),
    },
    {
      label: 'Download',
      icon: Download,
      onClick: handleDownload,
    },
    { divider: true },
    {
      label: 'Move to...',
      icon: Move,
      submenu: buildFolderSubmenu(handleMove),
    },
    {
      label: 'Copy to...',
      icon: Copy,
      submenu: buildFolderSubmenu(handleCopy),
    },
    { divider: true },
    {
      label: 'Rename',
      icon: Edit3,
      onClick: () => { setIsRenaming(true); setNewName(file.originalName); },
    },
    {
      label: 'Share',
      icon: Share2,
      onClick: () => { setShowShareModal(true); setShareResult(null); },
    },
    { divider: true },
    {
      label: 'Delete',
      icon: Trash2,
      danger: true,
      onClick: () => setShowDeleteConfirm(true),
    },
  ];

  return (
    <>
      <div
        className="glass-card-hover p-4 animate-fade-in select-none"
        onContextMenu={handleContextMenu}
        onDoubleClick={handleDoubleClick}
      >
        <div className="flex items-start gap-3">
          {/* File Icon */}
          <div className="w-10 h-10 rounded-lg bg-dark-800 flex items-center justify-center shrink-0">
            <FileIcon mimeType={file.mimeType} size={20} />
          </div>

          {/* File Info */}
          <div className="flex-1 min-w-0">
            {isRenaming ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                  className="input-field text-sm py-1.5"
                  autoFocus
                />
                <button onClick={handleRename} className="btn-ghost p-1 text-emerald-400">
                  <Check className="w-4 h-4" />
                </button>
                <button onClick={() => setIsRenaming(false)} className="btn-ghost p-1 text-red-400">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <h3 className="text-sm font-medium text-dark-200 truncate" title={file.originalName}>
                {file.originalName}
              </h3>
            )}
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs text-dark-500">{formatSize(file.size)}</span>
              <span className="text-xs text-dark-600">•</span>
              <span className="text-xs text-dark-500">{formatDate(file.createdAt)}</span>
            </div>
          </div>

          {/* MoreVertical button — the only visible action button */}
          <button
            ref={moreButtonRef}
            onClick={handleMoreClick}
            className="btn-ghost p-1.5 shrink-0"
            title="Actions"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          position={contextMenu}
          items={contextMenuItems}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* Preview Modal */}
      {showPreview && (
        <PreviewModal
          file={file}
          onClose={() => setShowPreview(false)}
        />
      )}

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="glass-card p-6 w-full max-w-md mx-4 animate-scale-in">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-dark-100">Share File</h3>
              <button
                onClick={() => setShowShareModal(false)}
                className="btn-ghost p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-dark-400 mb-4 truncate">
              {file.originalName}
            </p>

            {!shareResult ? (
              <>
                {/* Share Options */}
                <div className="space-y-3 mb-5">
                  <div>
                    <label className="flex items-center gap-2 text-sm text-dark-300 mb-1.5">
                      <Clock className="w-4 h-4" /> Expiry (hours)
                    </label>
                    <input
                      type="number"
                      placeholder="No expiry"
                      value={shareOptions.expiryHours}
                      onChange={(e) => setShareOptions({ ...shareOptions, expiryHours: e.target.value })}
                      className="input-field text-sm"
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-sm text-dark-300 mb-1.5">
                      <Lock className="w-4 h-4" /> Password (optional)
                    </label>
                    <input
                      type="text"
                      placeholder="No password"
                      value={shareOptions.password}
                      onChange={(e) => setShareOptions({ ...shareOptions, password: e.target.value })}
                      className="input-field text-sm"
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-sm text-dark-300 mb-1.5">
                      <Hash className="w-4 h-4" /> Download limit
                    </label>
                    <input
                      type="number"
                      placeholder="Unlimited"
                      value={shareOptions.downloadLimit}
                      onChange={(e) => setShareOptions({ ...shareOptions, downloadLimit: e.target.value })}
                      className="input-field text-sm"
                      min="1"
                    />
                  </div>
                </div>

                <button
                  onClick={handleShare}
                  disabled={isSharing}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                  id="create-share-btn"
                >
                  {isSharing ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Share2 className="w-4 h-4" />
                      Create Share Link
                    </>
                  )}
                </button>
              </>
            ) : (
              /* Share Result */
              <div className="space-y-4">
                <div className="bg-dark-800 rounded-lg p-3">
                  <p className="text-xs text-dark-500 mb-1">Share URL</p>
                  <div className="flex items-center gap-2">
                    <code className="text-sm text-primary-400 flex-1 truncate">
                      {shareResult.shareUrl}
                    </code>
                    <button onClick={copyShareLink} className="btn-ghost p-1.5 text-primary-400">
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {shareResult.expiryDate && (
                    <span className="badge-amber flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Expires {new Date(shareResult.expiryDate).toLocaleString()}
                    </span>
                  )}
                  {shareResult.hasPassword && (
                    <span className="badge-primary flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Password protected
                    </span>
                  )}
                  {shareResult.downloadLimit && (
                    <span className="badge-green flex items-center gap-1">
                      <Hash className="w-3 h-3" /> {shareResult.downloadLimit} downloads
                    </span>
                  )}
                </div>

                <button
                  onClick={() => setShowShareModal(false)}
                  className="btn-secondary w-full"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="Delete File"
        message={`Are you sure you want to delete "${file.originalName}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        loading={isDeleting}
      />
    </>
  );
};

export default FileCard;
