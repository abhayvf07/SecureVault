import { useState, useEffect } from 'react';
import { X, Download, Loader2, FileX } from 'lucide-react';
import { filesAPI } from '../services/api';
import FileIcon from './FileIcon';
import toast from 'react-hot-toast';

/**
 * PreviewModal
 * Renders an in-app preview of a file based on its MIME type.
 * Supports: images (including SVG via <img> for XSS safety), PDFs, and plain text.
 * Falls back to a "Download" button for unsupported types.
 *
 * IMPORTANT: SVG files are rendered via <img src=...>, NOT via dangerouslySetInnerHTML.
 * This sandboxes any embedded <script> tags in SVG files.
 */
const PreviewModal = ({ file, onClose }) => {
  const [blobUrl, setBlobUrl] = useState(null);
  const [textContent, setTextContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let revoked = false;

    const loadPreview = async () => {
      try {
        setLoading(true);
        setError(null);
        const blob = await filesAPI.getBlob(file._id);

        if (revoked) return;

        // For text/plain, decode the blob as text
        if (file.mimeType === 'text/plain') {
          const text = await blob.text();
          if (!revoked) setTextContent(text);
        } else {
          const url = URL.createObjectURL(blob);
          if (!revoked) setBlobUrl(url);
        }
      } catch (err) {
        if (!revoked) setError('Failed to load file preview');
      } finally {
        if (!revoked) setLoading(false);
      }
    };

    loadPreview();

    return () => {
      revoked = true;
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [file._id, file.mimeType]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDownload = async () => {
    try {
      await filesAPI.download(file._id, file.originalName);
      toast.success('Download started');
    } catch {
      toast.error('Download failed');
    }
  };

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const isImage = file.mimeType?.startsWith('image/');
  const isPdf = file.mimeType === 'application/pdf';
  const isText = file.mimeType === 'text/plain';
  const canPreview = isImage || isPdf || isText;

  const renderPreview = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
          <p className="text-sm text-dark-400">Loading preview...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <FileX className="w-10 h-10 text-dark-600" />
          <p className="text-sm text-dark-400">{error}</p>
          <button onClick={handleDownload} className="btn-primary text-sm mt-2">
            <Download className="w-4 h-4 mr-2 inline" />
            Download Instead
          </button>
        </div>
      );
    }

    if (isImage && blobUrl) {
      return (
        <div className="flex items-center justify-center max-h-[70vh] overflow-auto p-4">
          <img
            src={blobUrl}
            alt={file.originalName}
            className="max-w-full max-h-[65vh] object-contain rounded-lg"
          />
        </div>
      );
    }

    if (isPdf && blobUrl) {
      return (
        <iframe
          src={blobUrl}
          title={file.originalName}
          className="w-full h-[70vh] rounded-lg border border-dark-700/50"
        />
      );
    }

    if (isText && textContent !== null) {
      return (
        <div className="max-h-[70vh] overflow-auto p-4 bg-dark-800/50 rounded-lg border border-dark-700/50">
          <pre className="text-sm text-dark-200 whitespace-pre-wrap font-mono leading-relaxed">
            {textContent}
          </pre>
        </div>
      );
    }

    // Unsupported type
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-16 h-16 rounded-2xl bg-dark-800 flex items-center justify-center">
          <FileIcon mimeType={file.mimeType} size={32} />
        </div>
        <div className="text-center">
          <p className="text-dark-300 font-medium mb-1">Preview not available</p>
          <p className="text-sm text-dark-500">This file type ({file.mimeType}) cannot be previewed in the browser</p>
        </div>
        <button onClick={handleDownload} className="btn-primary text-sm mt-2">
          <Download className="w-4 h-4 mr-2 inline" />
          Download File
        </button>
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="glass-card w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-dark-700/50">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-dark-800 flex items-center justify-center shrink-0">
              <FileIcon mimeType={file.mimeType} size={16} />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-dark-100 truncate">{file.originalName}</h3>
              <p className="text-xs text-dark-500">{file.mimeType}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {canPreview && (
              <button
                onClick={handleDownload}
                className="btn-ghost p-2 hover:text-primary-400"
                title="Download"
              >
                <Download className="w-4 h-4" />
              </button>
            )}
            <button onClick={onClose} className="btn-ghost p-2" title="Close">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden p-4">
          {renderPreview()}
        </div>
      </div>
    </div>
  );
};

export default PreviewModal;
