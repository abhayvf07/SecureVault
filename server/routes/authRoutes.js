const express = require('express');
const router = express.Router();
const { register, login, refreshAccessToken, logout, getMe, changePassword } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { validate, registerSchema, loginSchema, changePasswordSchema } = require('../middleware/validate');

/**
 * Auth Routes
 * POST /api/auth/register         — Register a new user
 * POST /api/auth/login            — Login user
 * POST /api/auth/refresh          — Refresh access token (uses httpOnly cookie)
 * POST /api/auth/logout           — Logout (invalidate refresh token)
 * GET  /api/auth/me               — Get current user (protected)
 * PUT  /api/auth/change-password  — Change password (protected)
 */

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.post('/refresh', refreshAccessToken);
router.post('/logout', logout);
router.get('/me', protect, getMe);
router.put('/change-password', protect, validate(changePasswordSchema), changePassword);

module.exports = router;
