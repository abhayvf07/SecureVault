const mongoose = require('mongoose');

/**
 * ActivityLog Model
 * Tracks user actions for auditing and monitoring.
 * Records who did what, when, and to which resource.
 *
 * Action types: UPLOAD, DOWNLOAD, DELETE, RENAME, SHARE, LOGIN, REGISTER
 */
const activityLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      enum: [
        'UPLOAD',
        'DOWNLOAD',
        'DELETE',
        'RENAME',
        'SHARE',
        'LOGIN',
        'REGISTER',
        'CREATE_FOLDER',
        'DELETE_FOLDER',
        'SUSPEND_USER',
        'ACTIVATE_USER',
        'PROMOTE_ADMIN',
        'DEMOTE_ADMIN',
        'ADMIN_DELETE_FILE',
      ],
    },
    resourceType: {
      type: String,
      enum: ['file', 'folder', 'user'],
      default: 'file',
    },
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    resourceName: {
      type: String,
      default: null,
    },
    details: {
      type: mongoose.Schema.Types.Mixed, // Flexible JSON for extra info
      default: {},
    },
    ipAddress: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Index for querying recent activity by user
activityLogSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
