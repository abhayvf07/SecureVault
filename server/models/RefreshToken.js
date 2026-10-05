const mongoose = require('mongoose');

/**
 * RefreshToken Model
 * Stores long-lived refresh tokens for JWT rotation with reuse detection.
 *
 * Flow:
 * 1. On login/register → access token (15min) + refresh token (7d) issued
 * 2. On access token expiry → client sends refresh token to get new access token
 * 3. Old refresh token is marked as "used" and a new one is issued (same family)
 * 4. If a used token is presented again → reuse detected → entire family invalidated
 * 5. On logout → refresh token is deleted from DB
 *
 * Security:
 * - Tokens are SHA-256 hashed before storage (raw token never persisted in DB)
 * - Token families enable stolen-token reuse detection
 * - Auto-expire via MongoDB TTL index
 */
const refreshTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    family: {
      type: String,
      required: true,
      index: true, // Needed for reuse detection (invalidate all tokens in family)
    },
    used: {
      type: Boolean,
      default: false,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// TTL index: MongoDB automatically deletes expired tokens
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('RefreshToken', refreshTokenSchema);
