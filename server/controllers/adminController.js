const User = require('../models/User');
const File = require('../models/File');
const { logUserActivity } = require('../services/activityService');
const { AppError, asyncHandler } = require('../middleware/errorHandler');
const { escapeRegex } = require('../utils/escapeRegex');

/**
 * Admin Controller
 * Handles user management and platform-wide admin actions.
 * All endpoints require admin role (enforced via requireAdmin middleware).
 *
 * Design notes:
 * - Self-targeting is blocked on status/role changes to prevent lockout.
 * - The last admin can't be demoted by anyone.
 * - Every action is audit-logged with the admin as actor.
 * - Admin has ZERO visibility into user files — no list, no view, no delete.
 */

// @desc    Get all users (paginated, searchable)
// @route   GET /api/admin/users
// @access  Admin
const getAllUsers = asyncHandler(async (req, res) => {
  const { search = '', page = 1, limit = 20 } = req.query;

  const query = search
    ? {
        $or: [
          { name: { $regex: escapeRegex(search), $options: 'i' } },
          { email: { $regex: escapeRegex(search), $options: 'i' } },
        ],
      }
    : {};

  const users = await User.find(query)
    .select('-password')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit))
    .lean();

  const total = await User.countDocuments(query);

  // Enrich each user with their file count and storage used
  if (users.length > 0) {
    const userIds = users.map((u) => u._id);
    const fileStats = await File.aggregate([
      { $match: { userId: { $in: userIds } } },
      {
        $group: {
          _id: '$userId',
          fileCount: { $sum: 1 },
          storageUsed: { $sum: '$size' },
        },
      },
    ]);

    const statsMap = {};
    fileStats.forEach((s) => { statsMap[s._id.toString()] = s; });

    users.forEach((user) => {
      const stats = statsMap[user._id.toString()];
      user.fileCount = stats?.fileCount || 0;
      user.storageUsed = stats?.storageUsed || 0;
    });
  }
  res.status(200).json({
    success: true,
    data: {
      users,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
    },
  });
});

// @desc    Update user account status (suspend / activate / disable)
// @route   PATCH /api/admin/users/:id/status
// @access  Admin
const updateUserStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;

  // Block self-targeting — admin can't suspend themselves
  if (req.params.id === req.user._id.toString()) {
    throw new AppError("You can't change your own account status", 400);
  }

  const user = await User.findByIdAndUpdate(
    req.params.id,
    { status },
    { new: true }
  ).select('-password');

  if (!user) throw new AppError('User not found', 404);

  await logUserActivity({
    userId: req.user._id,
    action: status === 'active' ? 'ACTIVATE_USER' : 'SUSPEND_USER',
    resourceType: 'user',
    resourceId: user._id,
    resourceName: user.email,
    details: { newStatus: status },
    ipAddress: req.ip,
  });

  res.status(200).json({
    success: true,
    message: `User ${status}`,
    data: { user },
  });
});

// @desc    Update user role (promote / demote)
// @route   PATCH /api/admin/users/:id/role
// @access  Admin
const updateUserRole = asyncHandler(async (req, res) => {
  const { role } = req.body;

  // Block self-targeting — admin can't change their own role
  if (req.params.id === req.user._id.toString()) {
    throw new AppError("You can't change your own role", 400);
  }

  // Don't allow demoting the last remaining admin
  if (role === 'user') {
    const adminCount = await User.countDocuments({ role: 'admin' });
    const target = await User.findById(req.params.id);
    if (target?.role === 'admin' && adminCount <= 1) {
      throw new AppError('Cannot demote the last remaining admin', 400);
    }
  }

  const user = await User.findByIdAndUpdate(
    req.params.id,
    { role },
    { new: true }
  ).select('-password');

  if (!user) throw new AppError('User not found', 404);

  await logUserActivity({
    userId: req.user._id,
    action: role === 'admin' ? 'PROMOTE_ADMIN' : 'DEMOTE_ADMIN',
    resourceType: 'user',
    resourceId: user._id,
    resourceName: user.email,
    ipAddress: req.ip,
  });

  res.status(200).json({
    success: true,
    message: `User role set to ${role}`,
    data: { user },
  });
});

// @desc    Get platform-wide stats for admin dashboard
// @route   GET /api/admin/stats
// @access  Admin
const getAdminStats = asyncHandler(async (req, res) => {
  const [totalUsers, totalFiles, totalStorage, statusCounts, roleCounts] = await Promise.all([
    User.countDocuments(),
    File.countDocuments(),
    File.aggregate([{ $group: { _id: null, total: { $sum: '$size' } } }]),
    User.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
  ]);

  const statusMap = {};
  statusCounts.forEach((s) => { statusMap[s._id] = s.count; });

  const roleMap = {};
  roleCounts.forEach((r) => { roleMap[r._id] = r.count; });

  res.status(200).json({
    success: true,
    data: {
      totalUsers,
      totalFiles,
      totalStorage: totalStorage[0]?.total || 0,
      usersByStatus: statusMap,
      usersByRole: roleMap,
    },
  });
});

module.exports = {
  getAllUsers,
  updateUserStatus,
  updateUserRole,
  getAdminStats,
};



