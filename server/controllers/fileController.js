const fs = require('fs');
const path = require('path');
const File = require('../models/File');
const SharedLink = require('../models/SharedLink');
const { AppError, asyncHandler } = require('../middleware/errorHandler');
const uploadService = require('../services/uploadService');
const { streamRemoteFile } = require('../utils/streamRemoteFile');
const { logUserActivity } = require('../services/activityService');
const { escapeRegex } = require('../utils/escapeRegex');

// Downloads older than this are considered abandoned (lock is stale)
const STALE_LOCK_MS = 10 * 60 * 1000; // 10 minutes

/**
 * File Controller
 * Handles file upload, listing (with pagination), download, rename, delete, and search.
 */

// @desc    Upload a file
// @route   POST /api/files/upload
// @access  Private
const uploadFile = asyncHandler(async (req, res) => {
  const { folderId } = req.body;

  if (!req.file) {
    throw new AppError('No file uploaded. Please select a file.', 400);
  }

  // ✅ FIX: Enforce per-user storage quota
  const maxUserStorage = parseInt(process.env.MAX_USER_STORAGE) || 500 * 1024 * 1024; // 500MB default
  const currentUsage = await File.aggregate([
    { $match: { userId: req.user._id } },
    { $group: { _id: null, totalSize: { $sum: '$size' } } },
  ]);
  const usedBytes = currentUsage[0]?.totalSize || 0;

  if (usedBytes + req.file.size > maxUserStorage) {
    // Clean up the temp file since we're rejecting
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    const maxMB = (maxUserStorage / (1024 * 1024)).toFixed(0);
    const usedMB = (usedBytes / (1024 * 1024)).toFixed(1);
    throw new AppError(
      `Storage quota exceeded. You've used ${usedMB}MB of ${maxMB}MB. Delete some files to free up space.`,
      413
    );
  }

  // Upload to cloud if configured, otherwise keep local
  const cloudResult = await uploadService.uploadToCloud(req.file.path);

  // Create file record in database
  const file = await File.create({
    userId: req.user._id,
    fileName: req.file.filename,
    originalName: req.file.originalname,
    filePath: cloudResult.url, // Local path or Cloudinary URL
    size: req.file.size,
    mimeType: req.file.mimetype,
    folderId: folderId || null,
    storageType: cloudResult.storageType,
    publicId: cloudResult.publicId || null,
  });

  // Log activity
  await logUserActivity({
    userId: req.user._id,
    action: 'UPLOAD',
    resourceType: 'file',
    resourceId: file._id,
    resourceName: file.originalName,
    ipAddress: req.ip,
    details: { size: file.size, mimeType: file.mimeType },
  });

  res.status(201).json({
    success: true,
    message: 'File uploaded successfully',
    data: { file },
  });
});

// @desc    Get all user files (with pagination, folder filter, search, type filter)
// @route   GET /api/files?page=1&limit=10&folderId=xxx&search=xxx&type=xxx
// @access  Private
const getFiles = asyncHandler(async (req, res) => {
  const { folderId, search, type } = req.query;

  // Pagination params (defaults: page 1, 12 per page)
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
  const skip = (page - 1) * limit;

  // Build query
  const query = { userId: req.user._id };

  // Filter by folder (null = root files)
  if (folderId === 'root' || folderId === 'null') {
    query.folderId = null;
  } else if (folderId) {
    query.folderId = folderId;
  }

  // Search by file name
  if (search) {
    query.originalName = { $regex: escapeRegex(search), $options: 'i' };
  }

  // Filter by MIME type category
  if (type) {
    switch (type) {
      case 'image':
        query.mimeType = { $regex: '^image/' };
        break;
      case 'pdf':
        query.mimeType = 'application/pdf';
        break;
      case 'document':
        query.mimeType = {
          $in: [
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain',
          ],
        };
        break;
      default:
        break;
    }
  }

  // Get total count for pagination metadata
  const total = await File.countDocuments(query);
  const totalPages = Math.ceil(total / limit);

  // Sort configuration
  const sortOptions = {};
  const sortParam = req.query.sort;
  if (sortParam) {
    switch (sortParam) {
      case 'name_asc':  sortOptions.originalName = 1; break;
      case 'name_desc': sortOptions.originalName = -1; break;
      case 'date_asc':  sortOptions.createdAt = 1; break;
      case 'date_desc': sortOptions.createdAt = -1; break;
      case 'size_asc':  sortOptions.size = 1; break;
      case 'size_desc': sortOptions.size = -1; break;
      default:          sortOptions.createdAt = -1; break;
    }
  } else {
    sortOptions.createdAt = -1; // Default: newest first
  }

  // Fetch paginated results
  const files = await File.find(query)
    .sort(sortOptions)
    .skip(skip)
    .limit(limit)
    .populate('folderId', 'name');

  res.status(200).json({
    success: true,
    count: files.length,
    data: {
      files,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    },
  });
});

// @desc    Delete a file
// @route   DELETE /api/files/:id
// @access  Private
const deleteFile = asyncHandler(async (req, res) => {
  const file = await File.findById(req.params.id);

  if (!file) {
    throw new AppError('File not found', 404);
  }

  // Verify ownership
  if (file.userId.toString() !== req.user._id.toString()) {
    throw new AppError('Not authorized to delete this file', 403);
  }

  // ✅ FIX: Prevent deletion if file is currently streaming
  if (file.isDownloading) {
    const lockAge = Date.now() - file.updatedAt.getTime();
    if (lockAge < STALE_LOCK_MS) {
      throw new AppError('File is currently being downloaded and cannot be deleted. Please try again later.', 409); // 409 Conflict
    }
    // Lock is stale (older than 10 min) — treat as abandoned and proceed with deletion
    await File.findByIdAndUpdate(file._id, { isDownloading: false });
  }

  // Delete file from storage (local or cloud)
  await uploadService.deleteFile(file.filePath, file.storageType || 'local', file.publicId);

  // Clean up any shared links referencing this file
  await SharedLink.deleteMany({ fileId: file._id });

  // Delete from database
  await File.findByIdAndDelete(req.params.id);

  // Log activity
  await logUserActivity({
    userId: req.user._id,
    action: 'DELETE',
    resourceType: 'file',
    resourceId: file._id,
    resourceName: file.originalName,
    ipAddress: req.ip,
  });

  res.status(200).json({
    success: true,
    message: 'File deleted successfully',
  });
});

// @desc    Rename a file
// @route   PUT /api/files/:id/rename
// @access  Private
const renameFile = asyncHandler(async (req, res) => {
  const { newName } = req.body;
  const file = await File.findById(req.params.id);

  if (!file) {
    throw new AppError('File not found', 404);
  }

  // Verify ownership
  if (file.userId.toString() !== req.user._id.toString()) {
    throw new AppError('Not authorized to rename this file', 403);
  }

  const oldName = file.originalName;
  file.originalName = newName;
  await file.save();

  // Log activity
  await logUserActivity({
    userId: req.user._id,
    action: 'RENAME',
    resourceType: 'file',
    resourceId: file._id,
    resourceName: newName,
    ipAddress: req.ip,
    details: { oldName, newName },
  });

  res.status(200).json({
    success: true,
    message: 'File renamed successfully',
    data: { file },
  });
});

// @desc    Download a file
// @route   GET /api/files/download/:id
// @access  Private
const downloadFile = asyncHandler(async (req, res) => {
  const file = await File.findById(req.params.id);

  if (!file) {
    throw new AppError('File not found', 404);
  }

  // Verify ownership
  if (file.userId.toString() !== req.user._id.toString()) {
    throw new AppError('Not authorized to download this file', 403);
  }

  // Log activity
  await logUserActivity({
    userId: req.user._id,
    action: 'DOWNLOAD',
    resourceType: 'file',
    resourceId: file._id,
    resourceName: file.originalName,
    ipAddress: req.ip,
  });

  // ✅ FIX: Mark file as downloading to lock it from deletion
  await File.findByIdAndUpdate(file._id, { isDownloading: true });

  // Cleanup helper to unlock the file when the stream finishes or the client aborts
  let flagReset = false;
  const unlockFile = async () => {
    if (!flagReset) {
      flagReset = true;
      await File.findByIdAndUpdate(file._id, { isDownloading: false }).catch(err => 
        console.error('Failed to reset download flag:', err)
      );
    }
  };

  // Attach cleanup to response lifecycle events
  res.on('finish', unlockFile);
  res.on('close', unlockFile);

  if (file.storageType === 'cloudinary' && file.filePath?.startsWith('http')) {
    await streamRemoteFile(file.filePath, res, file.originalName);
    return;
  }

  // Security: Verify local file path is within uploads directory (path traversal protection)
  const uploadsDir = path.resolve(__dirname, '..', 'uploads');
  const filePath = path.resolve(__dirname, '..', file.filePath);
  
  if (!filePath.startsWith(uploadsDir + path.sep)) {
    throw new AppError('Invalid file path', 403);
  }

  // ✅ FIX: Information Leakage — generic error message matching the DB check
  if (!fs.existsSync(filePath)) {
    throw new AppError('File not found', 404);
  }

  // Stream file download with original name
  res.download(filePath, file.originalName);
});

// @desc    Move a file to a different folder
// @route   PUT /api/files/:id/move
// @access  Private
const moveFile = asyncHandler(async (req, res) => {
  const { folderId } = req.body;
  const file = await File.findById(req.params.id);

  if (!file) {
    throw new AppError('File not found', 404);
  }

  // Verify file ownership
  if (file.userId.toString() !== req.user._id.toString()) {
    throw new AppError('Not authorized to move this file', 403);
  }

  // If folderId is provided, verify the target folder belongs to this user
  if (folderId) {
    const Folder = require('../models/Folder');
    const targetFolder = await Folder.findById(folderId);
    if (!targetFolder || targetFolder.userId.toString() !== req.user._id.toString()) {
      throw new AppError('Target folder not found', 404);
    }
  }

  const oldFolderId = file.folderId;
  file.folderId = folderId || null;
  await file.save();

  // Log activity
  await logUserActivity({
    userId: req.user._id,
    action: 'MOVE',
    resourceType: 'file',
    resourceId: file._id,
    resourceName: file.originalName,
    ipAddress: req.ip,
    details: { fromFolderId: oldFolderId, toFolderId: file.folderId },
  });

  res.status(200).json({
    success: true,
    message: 'File moved successfully',
    data: { file },
  });
});

// @desc    Copy a file (physical duplication + new DB record)
// @route   POST /api/files/:id/copy
// @access  Private
const copyFile = asyncHandler(async (req, res) => {
  const { folderId } = req.body;
  const sourceFile = await File.findById(req.params.id);

  if (!sourceFile) {
    throw new AppError('File not found', 404);
  }

  // Verify file ownership
  if (sourceFile.userId.toString() !== req.user._id.toString()) {
    throw new AppError('Not authorized to copy this file', 403);
  }

  // If folderId is provided, verify the target folder belongs to this user
  const targetFolderId = folderId !== undefined ? (folderId || null) : sourceFile.folderId;
  if (targetFolderId) {
    const Folder = require('../models/Folder');
    const targetFolder = await Folder.findById(targetFolderId);
    if (!targetFolder || targetFolder.userId.toString() !== req.user._id.toString()) {
      throw new AppError('Target folder not found', 404);
    }
  }

  // Enforce per-user storage quota
  const maxUserStorage = parseInt(process.env.MAX_USER_STORAGE) || 500 * 1024 * 1024; // 500MB default
  const currentUsage = await File.aggregate([
    { $match: { userId: req.user._id } },
    { $group: { _id: null, totalSize: { $sum: '$size' } } },
  ]);
  const usedBytes = currentUsage[0]?.totalSize || 0;

  if (usedBytes + sourceFile.size > maxUserStorage) {
    const maxMB = (maxUserStorage / (1024 * 1024)).toFixed(0);
    const usedMB = (usedBytes / (1024 * 1024)).toFixed(1);
    throw new AppError(
      `Storage quota exceeded. You've used ${usedMB}MB of ${maxMB}MB. Delete some files to free up space.`,
      413
    );
  }

  // Generate unique copy name (Google Drive style: "(copy)", "(2)", "(3)", etc.)
  let copyName = `${sourceFile.originalName} (copy)`;
  let suffix = 1;
  while (await File.findOne({ userId: req.user._id, folderId: targetFolderId, originalName: copyName })) {
    suffix++;
    copyName = `${sourceFile.originalName} (${suffix})`;
  }

  // Physically duplicate the file
  const { v4: uuidv4 } = require('uuid');
  let newFilePath, newPublicId, newStorageType, newFileName;

  if (sourceFile.storageType === 'cloudinary' && sourceFile.filePath?.startsWith('http')) {
    // Cloudinary: re-upload from URL so Cloudinary duplicates it server-side
    try {
      const cloudinary = require('cloudinary').v2;
      const uploadResult = await cloudinary.uploader.upload(sourceFile.filePath, {
        folder: 'securevault',
        resource_type: 'auto',
      });
      newFilePath = uploadResult.secure_url;
      newPublicId = uploadResult.public_id;
      newStorageType = 'cloudinary';
      newFileName = uuidv4() + path.extname(sourceFile.originalName);
    } catch (err) {
      throw new AppError('Failed to copy file in cloud storage', 500);
    }
  } else {
    // Local storage: copy file bytes to a new UUID filename
    newFileName = uuidv4() + path.extname(sourceFile.originalName);
    const uploadsDir = path.resolve(__dirname, '..', 'uploads');
    const sourcePath = path.resolve(__dirname, '..', sourceFile.filePath);
    const destPath = path.join(uploadsDir, newFileName);

    // Security: Verify source file path is within uploads directory
    if (!sourcePath.startsWith(uploadsDir + path.sep)) {
      throw new AppError('Invalid source file path', 403);
    }

    if (!fs.existsSync(sourcePath)) {
      throw new AppError('Source file not found on disk', 404);
    }

    fs.copyFileSync(sourcePath, destPath);
    newFilePath = path.join('uploads', newFileName);
    newPublicId = null;
    newStorageType = 'local';
  }

  // Create new File document
  const copiedFile = await File.create({
    userId: req.user._id,
    fileName: newFileName,
    originalName: copyName,
    filePath: newFilePath,
    size: sourceFile.size,
    mimeType: sourceFile.mimeType,
    folderId: targetFolderId,
    storageType: newStorageType,
    publicId: newPublicId,
  });

  // Log activity
  await logUserActivity({
    userId: req.user._id,
    action: 'COPY',
    resourceType: 'file',
    resourceId: copiedFile._id,
    resourceName: copiedFile.originalName,
    ipAddress: req.ip,
    details: { sourceFileId: sourceFile._id, sourceName: sourceFile.originalName },
  });

  res.status(201).json({
    success: true,
    message: 'File copied successfully',
    data: { file: copiedFile },
  });
});

module.exports = { uploadFile, getFiles, deleteFile, renameFile, downloadFile, moveFile, copyFile };