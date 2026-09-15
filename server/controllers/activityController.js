const mongoose = require('mongoose');
const ActivityLog = require('../models/ActivityLog');
const File = require('../models/File');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * Activity Controller
 * Exposes ActivityLog data to the frontend.
 * Provides paginated activity history and storage analytics.
 */

// @desc    Get paginated activity logs for the authenticated user
// @route   GET /api/activity?page=1&limit=20&action=UPLOAD
// @access  Private
const getActivityLogs = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
  const skip = (page - 1) * limit;

  // Build query
  const query = { userId: req.user._id };

  // Optional filter by action type
  if (req.query.action) {
    const validActions = [
      'UPLOAD', 'DOWNLOAD', 'DELETE', 'RENAME', 'MOVE', 'COPY', 'SHARE',
      'LOGIN', 'REGISTER', 'CREATE_FOLDER', 'DELETE_FOLDER'
    ];
    if (validActions.includes(req.query.action.toUpperCase())) {
      query.action = req.query.action.toUpperCase();
    }
  }

  const total = await ActivityLog.countDocuments(query);
  const totalPages = Math.ceil(total / limit);

  const logs = await ActivityLog.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  res.status(200).json({
    success: true,
    count: logs.length,
    data: {
      logs,
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

// @desc    Get storage analytics for the authenticated user
// @route   GET /api/activity/analytics
// @access  Private
const getAnalytics = asyncHandler(async (req, res) => {
  const userId = new mongoose.Types.ObjectId(req.user._id);

  // Run aggregations in parallel for performance
  const [
    storageStats,
    filesByType,
    recentActivity,
    uploadTrend,
  ] = await Promise.all([
    // 1. Total storage used & file count
    File.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: null,
          totalSize: { $sum: '$size' },
          totalFiles: { $sum: 1 },
        },
      },
    ]),

    // 2. File count by MIME type category
    File.aggregate([
      { $match: { userId } },
      {
        $addFields: {
          category: {
            $switch: {
              branches: [
                { case: { $regexMatch: { input: '$mimeType', regex: '^image/' } }, then: 'Images' },
                { case: { $eq: ['$mimeType', 'application/pdf'] }, then: 'PDFs' },
                {
                  case: {
                    $in: [
                      '$mimeType',
                      [
                        'application/msword',
                        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                        'text/plain',
                      ],
                    ],
                  },
                  then: 'Documents',
                },
              ],
              default: 'Other',
            },
          },
        },
      },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          size: { $sum: '$size' },
        },
      },
      { $sort: { count: -1 } },
    ]),

    // 3. Last 5 activities
    ActivityLog.find({ userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean(),

    // 4. Upload trend (last 7 days)
    ActivityLog.aggregate([
      {
        $match: {
          userId,
          action: 'UPLOAD',
          createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
  ]);

  const stats = storageStats[0] || { totalSize: 0, totalFiles: 0 };

  res.status(200).json({
    success: true,
    data: {
      storage: {
        totalSize: stats.totalSize,
        totalFiles: stats.totalFiles,
      },
      filesByType,
      recentActivity,
      uploadTrend,
    },
  });
});

module.exports = { getActivityLogs, getAnalytics };
