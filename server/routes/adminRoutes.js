const express = require('express');
const router = express.Router();
const { protect, requireAdmin } = require('../middleware/auth');
const { validate, updateStatusSchema, updateRoleSchema } = require('../middleware/validate');
const {
  getAllUsers,
  updateUserStatus,
  updateUserRole,
  getAllFiles,
  adminDeleteFile,
  getAdminStats,
} = require('../controllers/adminController');

/**
 * Admin Routes
 *
 * All routes below require authentication + admin role.
 * The apiLimiter in app.js already covers /api/* broadly,
 * so no extra rate-limit config is needed here.
 */
router.use(protect, requireAdmin);

// Platform stats
router.get('/stats', getAdminStats);

// User management
router.get('/users', getAllUsers);
router.patch('/users/:id/status', validate(updateStatusSchema), updateUserStatus);
router.patch('/users/:id/role', validate(updateRoleSchema), updateUserRole);

// File oversight
router.get('/files', getAllFiles);
router.delete('/files/:id', adminDeleteFile);

module.exports = router;
