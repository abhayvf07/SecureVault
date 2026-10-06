const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

/**
 * File Upload Middleware (Multer Configuration)
 *
 * - Stores files on disk in /uploads directory
 * - Generates unique filenames using UUID to prevent collisions
 * - Validates file types (blocks dangerous extensions)
 * - Validates actual file magic bytes (prevents MIME-type spoofing)
 * - Enforces 5MB file size limit (configurable via MAX_FILE_SIZE env)
 */

// Allowed MIME types
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',       // ⚠️ SVG WARNING: Currently safe because files are served as `attachment` downloads
                         // (never rendered inline in browser). If you add an inline preview/thumbnail feature,
                         // SVGs can contain embedded <script> tags — sanitize with DOMPurify server-side first.
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'application/zip',
  'application/x-rar-compressed',
];

// Blocked file extensions (security: prevent executable uploads and script injections)
const BLOCKED_EXTENSIONS = [
  '.exe', '.bat', '.cmd', '.sh', '.msi', '.com', '.scr',
  '.pif', '.vbs', '.js', '.json', '.wsf', '.ps1', '.dll',
];

// Configure disk storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', 'uploads'));
  },
  filename: (req, file, cb) => {
    // Generate unique filename: uuid + original extension
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${uuidv4()}${ext}`;
    cb(null, uniqueName);
  },
});

// File filter: validate type and extension
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();

  // Check blocked extensions
  if (BLOCKED_EXTENSIONS.includes(ext)) {
    return cb(
      new Error(`File type "${ext}" is not allowed for security reasons`),
      false
    );
  }

  // Check MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(
      new Error(`File type "${file.mimetype}" is not supported. Allowed: images, PDFs, documents, text files`),
      false
    );
  }

  cb(null, true);
};

// Create multer instance
const upload = multer({
  storage,
  fileFilter,
  limits: {
    // Use MAX_FILE_SIZE from .env (default 5MB = 5242880 bytes)
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024,
  },
});

/**
 * Validate text-based files that file-type can't detect via magic bytes.
 * file-type relies on binary signatures; plain text formats (txt, csv) have none.
 * For these, we verify the content is valid UTF-8 with no binary/null bytes.
 * For SVGs, we additionally reject embedded scripts (stored-XSS vector).
 *
 * @param {string} filePath - Path to the uploaded file on disk
 * @param {string} declaredMimeType - The MIME type declared by the client
 * @returns {object} { valid: boolean, reason?: string, actualType?: string }
 */
const validateTextBasedFile = (filePath, declaredMimeType) => {
  const TEXT_MIMES = ['text/plain', 'text/csv', 'application/vnd.ms-excel'];
  const SVG_MIME = 'image/svg+xml';

  // Only handle text-based types that lack magic bytes
  if (!TEXT_MIMES.includes(declaredMimeType) && declaredMimeType !== SVG_MIME) {
    // file-type couldn't detect this, and it's not a known text format — suspicious
    return {
      valid: false,
      reason: `Could not verify file content for declared type (${declaredMimeType})`,
    };
  }

  try {
    // Read first 64KB to avoid memory issues with large files
    const fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(65536);
    const bytesRead = fs.readSync(fd, buffer, 0, 65536, 0);
    fs.closeSync(fd);
    const content = buffer.slice(0, bytesRead);

    // Check for null bytes — binary content disguised as text
    if (content.includes(0x00)) {
      return {
        valid: false,
        reason: 'File contains binary content but was declared as a text file',
      };
    }

    // SVG-specific: reject embedded scripts and event handlers (stored-XSS vectors).
    // This is defense-in-depth — files are served as attachment downloads, but if inline
    // preview is ever added, unscreened SVGs would be a direct XSS vector.
    if (declaredMimeType === SVG_MIME) {
      const text = content.toString('utf-8').toLowerCase();

      const dangerousPatterns = [
        /<script[\s>]/i,
        /on\w+\s*=/i,           // onclick=, onload=, onerror=, etc.
        /javascript\s*:/i,      // javascript: URIs
        /<iframe[\s>]/i,
        /<embed[\s>]/i,
        /<object[\s>]/i,
        /<foreignobject[\s>]/i,
      ];

      for (const pattern of dangerousPatterns) {
        if (pattern.test(text)) {
          return {
            valid: false,
            reason: 'SVG contains potentially dangerous content (embedded scripts or event handlers). Sanitize before uploading.',
          };
        }
      }

      // Verify it at least looks like SVG/XML
      if (!text.includes('<svg') && !text.includes('<?xml')) {
        return {
          valid: false,
          reason: 'File does not appear to be a valid SVG document',
        };
      }
    }

    return { valid: true, actualType: declaredMimeType };
  } catch (err) {
    return {
      valid: false,
      reason: `Could not validate text file content: ${err.message}`,
    };
  }
};

/**
 * Validate file magic bytes (actual file content type, not spoofed MIME)
 * Prevents attackers from uploading .exe as .jpg by just renaming
 */
const validateFileMagicBytes = async (filePath, declaredMimeType) => {
  try {
    const { fileTypeFromFile } = await import('file-type');
    const fileType = await fileTypeFromFile(filePath);

    // file-type can't detect text-based formats (txt, csv, svg) because they have
    // no magic bytes. Fall through to content-based validation for these types.
    if (!fileType) {
      return validateTextBasedFile(filePath, declaredMimeType);
    }

    // Check if actual MIME type matches declared MIME type
    if (fileType.mime === declaredMimeType) {
      return { valid: true, actualType: fileType.mime };
    }

    // Legacy MS Office files (.doc, .xls, .ppt) are detected as application/x-cfb
    if (
      fileType.mime === 'application/x-cfb' &&
      [
        'application/msword',
        'application/vnd.ms-excel',
        'application/vnd.ms-powerpoint'
      ].includes(declaredMimeType)
    ) {
      return { valid: true, actualType: declaredMimeType };
    }

    // MIME mismatch detected — potential spoofing attack
    return {
      valid: false,
      reason: `File content (${fileType.mime}) does not match declared type (${declaredMimeType})`,
      actualType: fileType.mime,
    };
  } catch (err) {
    // Distinguish between module loading errors (ESM/CJS conflicts) and generic read errors
    if (err.code === 'ERR_MODULE_NOT_FOUND' || err.message.includes('import')) {
      return {
        valid: false,
        reason: 'Server configuration error: Could not load the file verification module. Please contact an administrator.',
        actualType: null,
      };
    }

    // Generic fallback for file reading errors
    return {
      valid: false,
      reason: `Could not verify file content: ${err.message}`,
      actualType: null,
    };
  }
};

/**
 * Middleware wrapper to handle Multer errors and perform magic-byte validation
 */
const uploadMiddleware = (req, res, next) => {
  const singleUpload = upload.single('file');

  singleUpload(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      // Multer-specific errors
      if (err.code === 'LIMIT_FILE_SIZE') {
        const maxSize = parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024;
        const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(0);
        return res.status(400).json({
          success: false,
          message: `File too large. Maximum size is ${maxSizeMB}MB`,
        });
      }
      return res.status(400).json({
        success: false,
        message: `Upload error: ${err.message}`,
      });
    }

    if (err) {
      // Custom filter errors or other errors
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }

    // No file provided
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file provided. Please select a file to upload',
      });
    }

    // Validate file magic bytes to prevent MIME-type spoofing
    const validation = await validateFileMagicBytes(req.file.path, req.file.mimetype);
    if (!validation.valid) {
      // Delete the invalid file
      fs.unlinkSync(req.file.path);
      
      return res.status(400).json({
        success: false,
        message: validation.reason,
      });
    }

    next();
  });
};

module.exports = uploadMiddleware;