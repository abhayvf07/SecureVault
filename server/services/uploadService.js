const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

/**
 * Upload Service — Storage Abstraction Layer
 *
 * Provides a unified interface for file storage operations.
 * Supports two backends:
 *   - LOCAL (default): Files stored in /uploads directory
 *   - CLOUDINARY (optional): Files stored on Cloudinary CDN
 *
 * To switch to Cloudinary, set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY,
 * and CLOUDINARY_API_SECRET in your .env file.
 *
 * Usage:
 *   const uploadService = require('./services/uploadService');
 *   await uploadService.deleteFile(filePath); // Works with either backend
 */

// Detect storage backend from env
const isCloudinaryConfigured = () => {
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
};

// Lazy-load Cloudinary (only if configured)
let cloudinary = null;
const getCloudinary = () => {
  if (!cloudinary) {
    try {
      const cloudinaryModule = require('cloudinary').v2;
      cloudinaryModule.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
      });
      cloudinary = cloudinaryModule;
    } catch (err) {
      logger.error('Cloudinary package not installed. Run: npm install cloudinary');
      throw new Error('Cloudinary package not installed');
    }
  }
  return cloudinary;
};

const getCloudinaryPublicId = (filePath) => {
  if (!filePath) return null;

  try {
    const parsedUrl = new URL(filePath);
    const pathSegments = parsedUrl.pathname.split('/').filter(Boolean);
    const uploadIndex = pathSegments.indexOf('upload');
    if (uploadIndex === -1) {
      const fileName = pathSegments.pop();
      return fileName ? fileName.replace(path.extname(fileName), '') : null;
    }

    const versionCandidate = pathSegments[uploadIndex + 1];
    const publicPath = pathSegments.slice(
      versionCandidate && /^v\d+$/.test(versionCandidate)
        ? uploadIndex + 2
        : uploadIndex + 1
    );

    const publicIdWithExtension = publicPath.join('/');
    return publicIdWithExtension
      ? publicIdWithExtension.replace(path.extname(publicIdWithExtension), '')
      : null;
  } catch (err) {
    const fileName = filePath.split('/').pop();
    return fileName ? fileName.split('.')[0] : null;
  }
};

const getRelativePath = (absolutePath) => {
  const baseDir = path.join(__dirname, '..');
  return path.relative(baseDir, absolutePath);
};

/**
 * Delete a file from storage.
 * @param {string} filePath - Local file path or Cloudinary URL
 * @param {string} storageType - 'local' or 'cloudinary'
 * @param {string|null} publicId - Optional Cloudinary public ID
 */
const deleteFile = async (filePath, storageType = 'local', publicId = null) => {
  try {
    if (storageType === 'cloudinary' && isCloudinaryConfigured()) {
      const cloud = getCloudinary();
      const publicIdToDelete = publicId || getCloudinaryPublicId(filePath);
      if (publicIdToDelete) {
        await cloud.uploader.destroy(publicIdToDelete);
        logger.info(`Deleted from Cloudinary: ${publicIdToDelete}`);
      }
    } else {
      // Local storage — with path traversal protection
      const uploadsDir = path.resolve(__dirname, '..', 'uploads');
      const resolvedPath = path.resolve(filePath);
      
      // Security: Ensure the file path is within uploads directory
      if (!resolvedPath.startsWith(uploadsDir + path.sep)) {
        logger.error(`Attempted file deletion outside uploads directory: ${resolvedPath}`);
        return; // Silently skip — don't throw to avoid blocking DB cleanup
      }
      
      if (fs.existsSync(resolvedPath)) {
        fs.unlinkSync(resolvedPath);
        logger.info(`Deleted local file: ${resolvedPath}`);
      }
    }
  } catch (err) {
    logger.error(`Failed to delete file: ${err.message}`);
    // Don't throw — file cleanup failure shouldn't block DB operations
  }
};

/**
 * Upload a file to Cloudinary (if configured).
 * Falls back to local storage (Multer handles this).
 * @param {string} localPath - Path to the locally stored file
 * @param {string} folder - Cloudinary folder name
 * @returns {object} { url, publicId, storageType }
 */
const uploadToCloud = async (localPath, folder = 'securevault') => {
  if (!isCloudinaryConfigured()) {
    return {
      url: getRelativePath(localPath),
      publicId: null,
      storageType: 'local',
    };
  }

  try {
    const cloud = getCloudinary();
    const result = await cloud.uploader.upload(localPath, {
      folder,
      resource_type: 'auto',
    });

    // Delete local temp file after cloud upload
    if (fs.existsSync(localPath)) {
      fs.unlinkSync(localPath);
    }

    logger.info(`Uploaded to Cloudinary: ${result.public_id}`);

    return {
      url: result.secure_url,
      publicId: result.public_id,
      storageType: 'cloudinary',
    };
  } catch (err) {
    logger.error(`Cloudinary upload failed, keeping local: ${err.message}`);
    return {
      url: getRelativePath(localPath),
      publicId: null,
      storageType: 'local',
    };
  }
};

/**
 * Get the current storage backend type.
 * @returns {string} 'cloudinary' or 'local'
 */
const getStorageType = () => {
  return isCloudinaryConfigured() ? 'cloudinary' : 'local';
};

module.exports = {
  deleteFile,
  uploadToCloud,
  getStorageType,
  isCloudinaryConfigured,
};
