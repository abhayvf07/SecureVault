const mongoose = require("mongoose");

/**
 * File Model
 * Stores metadata for uploaded files. Actual files live on disk in /uploads.
 * Each file belongs to a user and optionally to a folder.
 */
const fileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    fileName: {
      type: String,
      required: true,
      unique: true, // UUID-generated, guaranteed unique
    },
    originalName: {
      type: String,
      required: true,
    },
    filePath: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    folderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Folder",
      default: null, // null = root level (no folder)
    },
    storageType: {
      type: String,
      enum: ["local", "cloudinary"],
      default: "local",
    },
    publicId: {
      type: String,
      default: null,
    },
    isDownloading: {
      type: Boolean,
      default: false,
    },
    // V2.0: Encryption-at-rest fields (AES-256-GCM)
    encryptionIV: {
      type: String,
      default: null,
    },
    encryptionAuthTag: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// Compound index for efficient queries: get user's files, optionally filtered by folder
fileSchema.index({ userId: 1, folderId: 1 });

module.exports = mongoose.model("File", fileSchema);
