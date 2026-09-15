import { useState, useRef, useCallback } from 'react';
import { Upload, CloudUpload, X, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { filesAPI } from '../services/api';

const DEFAULT_MAX_SIZE = 5 * 1024 * 1024; // 5MB fallback

const ACCEPTED_TYPES = 'image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar,.webp,.svg';

/**
 * UploadZone
 * Drag-and-drop + click-to-upload file area.
 * Supports multiple files with per-file progress indicators.
 */
const UploadZone = ({ folderId, onUploadComplete, maxFileSize }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploads, setUploads] = useState([]); // { id, name, progress, status: 'uploading'|'done'|'error', error? }
  const fileInputRef = useRef(null);

  const effectiveMax = maxFileSize || DEFAULT_MAX_SIZE;
  const maxSizeMB = Math.round(effectiveMax / (1024 * 1024));

  const isUploading = uploads.some((u) => u.status === 'uploading');

  const uploadFile = useCallback(async (file, uploadId) => {
    // Client-side validation
    if (file.size > effectiveMax) {
      setUploads((prev) =>
        prev.map((u) => u.id === uploadId ? { ...u, status: 'error', error: `Too large (max ${maxSizeMB}MB)` } : u)
      );
      return;
    }

    const blockedExtensions = ['.exe', '.bat', '.cmd', '.sh', '.msi', '.com', '.scr', '.pif', '.vbs', '.js', '.json', '.wsf', '.ps1', '.dll'];
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (blockedExtensions.includes(ext)) {
      setUploads((prev) =>
        prev.map((u) => u.id === uploadId ? { ...u, status: 'error', error: `"${ext}" not allowed` } : u)
      );
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (folderId) {
        formData.append('folderId', folderId);
      }

      await filesAPI.upload(formData, {
        onUploadProgress: (progressEvent) => {
          const percent = Math.round((progressEvent.loaded / progressEvent.total) * 100);
          setUploads((prev) =>
            prev.map((u) => u.id === uploadId ? { ...u, progress: percent } : u)
          );
        },
      });

      setUploads((prev) =>
        prev.map((u) => u.id === uploadId ? { ...u, status: 'done', progress: 100 } : u)
      );
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Upload failed';
      setUploads((prev) =>
        prev.map((u) => u.id === uploadId ? { ...u, status: 'error', error: errorMsg } : u)
      );
    }
  }, [folderId, effectiveMax, maxSizeMB]);

  const processFiles = useCallback(async (fileList) => {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    // Create upload entries
    const newUploads = files.map((file, idx) => ({
      id: `${Date.now()}-${idx}`,
      name: file.name,
      progress: 0,
      status: 'uploading',
      error: null,
    }));

    setUploads((prev) => [...prev, ...newUploads]);

    // Upload sequentially to avoid overwhelming server
    for (let i = 0; i < files.length; i++) {
      await uploadFile(files[i], newUploads[i].id);
    }

    // Refresh file list after all uploads
    onUploadComplete();

    // Clear completed uploads after a delay
    setTimeout(() => {
      setUploads((prev) => prev.filter((u) => u.status === 'uploading'));
    }, 3000);
  }, [uploadFile, onUploadComplete]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFiles(files);
    }
  }, [processFiles]);

  const handleFileSelect = (e) => {
    const files = e.target.files;
    if (files.length > 0) {
      processFiles(files);
    }
    // Reset input so the same file can be selected again
    e.target.value = '';
  };

  const removeUploadEntry = (id) => {
    setUploads((prev) => prev.filter((u) => u.id !== id));
  };

  return (
    <div>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
          transition-all duration-300 ease-out group
          ${isDragging
            ? 'border-primary-500 bg-primary-500/10 scale-[1.01]'
            : 'border-dark-700/50 hover:border-primary-500/40 hover:bg-dark-800/40'
          }
          ${isUploading ? 'pointer-events-none opacity-70' : ''}
        `}
        id="upload-zone"
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ACCEPTED_TYPES}
          onChange={handleFileSelect}
          className="hidden"
          id="file-input"
        />

        <div className="flex flex-col items-center gap-3">
          <div className={`
            w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300
            ${isDragging
              ? 'bg-primary-500/20 text-primary-400 scale-110'
              : 'bg-dark-800 text-dark-400 group-hover:bg-primary-500/10 group-hover:text-primary-400'
            }
          `}>
            <CloudUpload className="w-7 h-7" />
          </div>
          <div>
            <p className="text-dark-200 font-medium mb-1">
              {isDragging ? 'Drop files here' : 'Click or drag files to upload'}
            </p>
            <p className="text-dark-500 text-sm">
              Images, PDFs, documents — max {maxSizeMB}MB per file
            </p>
          </div>
        </div>
      </div>

      {/* Upload Progress List */}
      {uploads.length > 0 && (
        <div className="mt-3 space-y-2 animate-slide-down">
          {uploads.map((upload) => (
            <div
              key={upload.id}
              className={`glass-card p-3 flex items-center gap-3 animate-fade-in ${
                upload.status === 'error' ? 'border-red-500/30' : ''
              }`}
            >
              {/* Status Icon */}
              {upload.status === 'uploading' && (
                <Loader2 className="w-4 h-4 text-primary-500 animate-spin shrink-0" />
              )}
              {upload.status === 'done' && (
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              )}
              {upload.status === 'error' && (
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              )}

              {/* File name + progress */}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-dark-200 truncate">{upload.name}</p>
                {upload.status === 'uploading' && (
                  <div className="w-full h-1.5 rounded-full bg-dark-800 overflow-hidden mt-1.5">
                    <div
                      className="h-full bg-primary-500 transition-all duration-200 rounded-full"
                      style={{ width: `${upload.progress}%` }}
                    />
                  </div>
                )}
                {upload.status === 'error' && (
                  <p className="text-xs text-red-400 mt-0.5">{upload.error}</p>
                )}
              </div>

              {/* Progress text or dismiss */}
              {upload.status === 'uploading' && (
                <span className="text-xs text-dark-500 shrink-0">{upload.progress}%</span>
              )}
              {upload.status !== 'uploading' && (
                <button
                  onClick={() => removeUploadEntry(upload.id)}
                  className="btn-ghost p-1 shrink-0"
                  aria-label="Dismiss"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UploadZone;
