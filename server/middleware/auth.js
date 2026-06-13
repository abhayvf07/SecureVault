const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Authentication Middleware
 *
 * Strategy: Authorization header for access tokens + httpOnly cookie for refresh tokens
 *
 * Access tokens are expected in the Authorization header as: Bearer <token>
 * Refresh tokens are handled separately via a secure httpOnly cookie on the client.
 * This allows the frontend to keep the short-lived access token in memory while
 * the refresh token remains inaccessible to JavaScript.
 */
const protect = async (req, res, next) => {
  try {
    let token;

    // Extract token from Authorization header
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized — no token provided',
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach user to request (exclude password from the returned document)
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized — user no longer exists',
      });
    }

    // ✅ FIX: Check if the user's account is suspended or disabled
    // Assuming your User model uses a 'status' string (e.g., 'active', 'suspended', 'disabled')
    // Alternatively, if using a boolean, this could be: if (!user.isActive) { ... }
    if (user.status === 'suspended' || user.status === 'disabled') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized — account is suspended or disabled',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    // Handle specific JWT errors
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Not authorized — invalid token',
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Not authorized — token expired',
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Not authorized',
    });
  }
};

module.exports = { protect };