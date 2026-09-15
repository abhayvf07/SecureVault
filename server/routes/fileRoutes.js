const express = require('express');
const router = express.Router();
const {
  uploadFile,
  getFiles,
  deleteFile,
  renameFile,
  downloadFile,
  moveFile,
  copyFile,
} = require('../controllers/fileController');
const { protect } = require('../middleware/auth');
const uploadMiddleware = require('../middleware/upload');
const { validate, renameSchema, moveSchema } = require('../middleware/validate');

/**
 * File Routes (all protected)
 * POST   /api/files/upload       — Upload a file
 * GET    /api/files               — Get all user files (supports ?folderId, ?search, ?type)
 * DELETE /api/files/:id           — Delete a file
 * PUT    /api/files/:id/rename    — Rename a file
 * GET    /api/files/download/:id  — Download a file
 * PUT    /api/files/:id/move      — Move a file to a different folder
 * POST   /api/files/:id/copy      — Copy a file (physical duplication)
 */

router.post('/upload', protect, uploadMiddleware, uploadFile);
router.get('/', protect, getFiles);
router.delete('/:id', protect, deleteFile);
router.put('/:id/rename', protect, validate(renameSchema), renameFile);
router.get('/download/:id', protect, downloadFile);
router.put('/:id/move', protect, validate(moveSchema), moveFile);
router.post('/:id/copy', protect, copyFile);

module.exports = router;
