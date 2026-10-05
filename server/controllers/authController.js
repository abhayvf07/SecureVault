const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const crypto = require('crypto');
const { generateAccessToken, generateRefreshToken } = require('../utils/generateToken');
const logger = require('../utils/logger');
const { AppError, asyncHandler } = require('../middleware/errorHandler');
const { parseDurationMs } = require('../utils/timeParser');
const { logUserActivity } = require('../services/activityService');

/**
 * Auth Controller
 * Handles user registration, login, token refresh, and logout.
 * Uses short-lived access tokens (15min) + long-lived refresh tokens (7d).
 * Refresh tokens are SHA-256 hashed before storage and support reuse detection
 * via token families — a replayed (already-rotated) token invalidates the entire chain.
 */

/**
 * Hash a raw refresh token with SHA-256 before storage or lookup.
 * SHA-256 is appropriate here (vs bcrypt) because refresh tokens are 256-bit random —
 * they have enough entropy that brute-force is infeasible even without a slow hash.
 */
const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

// ─── Helper: Save refresh token to DB and set httpOnly cookie ───
const issueRefreshToken = async (userId, res, family = null) => {
  const refreshToken = generateRefreshToken();
  const refreshExpiresMs = parseDurationMs(process.env.JWT_REFRESH_EXPIRES_IN, 7 * 24 * 60 * 60 * 1000);
  const expiresAt = new Date(Date.now() + refreshExpiresMs);

  // Generate new family ID for first token in chain (login/register),
  // or inherit family from the rotated token (refresh)
  const tokenFamily = family || crypto.randomUUID();

  await RefreshToken.create({
    userId,
    tokenHash: hashToken(refreshToken),
    family: tokenFamily,
    expiresAt,
  });

  // Set as httpOnly cookie (secure in production)
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    maxAge: refreshExpiresMs,
    path: '/',
  });

  return refreshToken;
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  // ✅ FIX: Explicit type check for defense-in-depth consistency
  if (typeof email !== 'string') {
    throw new AppError('Invalid email format', 400);
  }

  // Check if user already exists
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    throw new AppError('User with this email already exists', 409);
  }

  // Create user (password hashed automatically via pre-save hook)
  const user = await User.create({ name, email, password });

  // Generate tokens
  const accessToken = generateAccessToken(user._id);
  await issueRefreshToken(user._id, res);

  // Log activity
  await logUserActivity({
    userId: user._id,
    action: 'REGISTER',
    resourceType: 'user',
    resourceId: user._id,
    resourceName: user.email,
    ipAddress: req.ip,
  });

  logger.success(`New user registered: ${user.email}`);

  res.status(201).json({
    success: true,
    message: 'Registration successful',
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      token: accessToken,
    },
  });
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (typeof email !== 'string') {
    throw new AppError('Invalid email format', 400);
  }

  // Find user and explicitly include password field
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

  if (!user) {
    throw new AppError('Invalid email or password', 401);
  }

  // Verify password
  const isMatch = await user.matchPassword(password);
  if (!isMatch) {
    throw new AppError('Invalid email or password', 401);
  }

  // Generate tokens
  const accessToken = generateAccessToken(user._id);
  await issueRefreshToken(user._id, res);

  // Log activity
  await logUserActivity({
    userId: user._id,
    action: 'LOGIN',
    resourceType: 'user',
    resourceId: user._id,
    resourceName: user.email,
    ipAddress: req.ip,
  });

  logger.success(`User logged in: ${user.email}`);

  res.status(200).json({
    success: true,
    message: 'Login successful',
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      token: accessToken,
    },
  });
});

// @desc    Refresh access token using refresh token cookie
// @route   POST /api/auth/refresh
// @access  Public (uses httpOnly cookie)
const refreshAccessToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.cookies;

  if (!refreshToken) {
    throw new AppError('No refresh token provided', 401);
  }

  const tokenHash = hashToken(refreshToken);

  // Atomically find an unused, non-expired token and mark it as used.
  // findOneAndUpdate is atomic — if two requests race with the same token,
  // only one will match the { used: false } condition.
  const storedToken = await RefreshToken.findOneAndUpdate(
    {
      tokenHash,
      used: false,
      expiresAt: { $gt: new Date() },
    },
    { $set: { used: true } },
  );

  if (!storedToken) {
    // Token not found as unused — either invalid, expired, or REUSED.
    // Check if it exists but was already marked used (reuse detection).
    const reusedToken = await RefreshToken.findOne({ tokenHash });
    if (reusedToken) {
      // ⚠️ REUSE DETECTED: This token was already rotated out.
      // Someone (attacker or out-of-sync client) is replaying a stale token.
      // Invalidate the entire family to protect the legitimate session.
      logger.warn(
        `Refresh token reuse detected for user ${reusedToken.userId}, ` +
        `family ${reusedToken.family}. Invalidating entire token family.`
      );
      await RefreshToken.deleteMany({ family: reusedToken.family });
      throw new AppError('Session compromised — all sessions in this chain have been invalidated. Please log in again.', 401);
    }
    throw new AppError('Invalid refresh token', 401);
  }

  // Issue new tokens in the same family (rotation chain continues)
  const newAccessToken = generateAccessToken(storedToken.userId);
  await issueRefreshToken(storedToken.userId, res, storedToken.family);

  res.status(200).json({
    success: true,
    message: 'Token refreshed',
    data: {
      token: newAccessToken,
    },
  });
});

// @desc    Logout user (invalidate refresh token)
// @route   POST /api/auth/logout
// @access  Public
const logout = asyncHandler(async (req, res) => {
  const { refreshToken } = req.cookies;

  if (refreshToken) {
    // Delete refresh token from DB (look up by hash, raw token never stored)
    await RefreshToken.findOneAndDelete({ tokenHash: hashToken(refreshToken) });
  }

  // Clear the cookie
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    path: '/',
  });

  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
});

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
      },
    },
  });
});

// @desc    Change password (logged-in user)
// @route   PUT /api/auth/change-password
// @access  Private
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  // Fetch user with password field
  const user = await User.findById(req.user._id).select('+password');
  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Verify current password
  const isMatch = await user.matchPassword(currentPassword);
  if (!isMatch) {
    throw new AppError('Current password is incorrect', 401);
  }

  // Prevent reuse of same password
  const isSame = await user.matchPassword(newPassword);
  if (isSame) {
    throw new AppError('New password must be different from current password', 400);
  }

  // Update password (pre-save hook will hash it)
  user.password = newPassword;
  await user.save();

  // Invalidate all existing refresh tokens for this user (force re-login on other devices)
  await RefreshToken.deleteMany({ userId: user._id });

  // Issue fresh tokens for this session
  const accessToken = generateAccessToken(user._id);
  await issueRefreshToken(user._id, res);

  // Log activity
  await logUserActivity({
    userId: user._id,
    action: 'CHANGE_PASSWORD',
    resourceType: 'user',
    resourceId: user._id,
    resourceName: user.email,
    ipAddress: req.ip,
  });

  logger.success(`Password changed for: ${user.email}`);

  res.status(200).json({
    success: true,
    message: 'Password changed successfully',
    data: {
      token: accessToken,
    },
  });
});

module.exports = { register, login, refreshAccessToken, logout, getMe, changePassword };