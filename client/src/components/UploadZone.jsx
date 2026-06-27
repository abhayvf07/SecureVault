import { useState, useRef, useCallback } from 'react';
import { Upload, CloudUpload, X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { filesAPI } from '../services/api';

const DEFAULT_MAX_SIZE = 5 * 1024 * 1024; // 5MB fallback

/**
 * UploadZone
 * Drag-and-drop + click-to-upload file area.
 * Shows upload progress and validates file before sending.
 */
const UploadZone = ({ folderId, onUploadComplete, maxFileSize }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);

  const effectiveMax = maxFileSize || DEFAULT_MAX_SIZE;
  const maxSizeMB = Math.round(effectiveMax / (1024 * 1024));

  const uploadFile = useCallback(async (file) => {
    // Client-side validation
    if (file.size > effectiveMax) {
      toast.error(`File too large. Maximum size is ${maxSizeMB}MB`);
      return;
    }

    const blockedExtensions = ['.exe', '.bat', '.cmd', '.sh', '.msi'];
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (blockedExtensions.includes(ext)) {
      toast.error(`File type "${ext}" is not allowed`);
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (folderId) {
        formData.append('folderId', folderId);
      }

      await filesAPI.upload(formData, {
        onUploadProgress: (progressEvent) => {
          const percent = Math.round((progressEvent.loaded / progressEvent.total) * 100);
          setUploadProgress(percent);
        },
      });

      toast.success(`"${file.name}" uploaded successfully!`);
      onUploadComplete(); // Refresh file list
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [folderId, onUploadComplete, effectiveMax, maxSizeMB]);

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
      uploadFile(files[0]);
    }
  }, [uploadFile]);

  const handleFileSelect = (e) => {
    const files = e.target.files;
    if (files.length > 0) {
      uploadFile(files[0]);
    }
    // Reset input so the same file can be selected again
    e.target.value = '';
  };

  return (
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
        onChange={handleFileSelect}
        className="hidden"
        id="file-input"
      />

      {isUploading ? (
        <div className="flex flex-col items-center gap-3 animate-pulse-soft">
          <Loader2 className="w-10 h-10 text-primary-500 animate-spin" />
          <p className="text-dark-300 font-medium">Uploading...</p>
          <div className="w-full h-2 rounded-full bg-dark-800 overflow-hidden mt-2">
            <div
              className="h-full bg-primary-500 transition-all duration-200"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <p className="text-xs text-dark-400">{uploadProgress}%</p>
        </div>
      ) : (
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
              {isDragging ? 'Drop file here' : 'Click or drag file to upload'}
            </p>
            <p className="text-dark-500 text-sm">
              Images, PDFs, documents — max {maxSizeMB}MB
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadZone;
