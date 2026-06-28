const { z } = require('zod');

/**
 * Zod Validation Middleware Factory
 *
 * Creates Express middleware that validates request body against a Zod schema.
 * Returns standardized error responses with field-level details.
 *
 * Usage:
 *   router.post('/register', validate(registerSchema), controller);
 */
const validate = (schema) => (req, res, next) => {
  try {
    schema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }));

      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors,
      });
    }
    next(error);
  }
};

// ──────────────────────────────────────────────
// Validation Schemas
// ──────────────────────────────────────────────

const registerSchema = z.object({
  name: z
    .string({ required_error: 'Name is required' })
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name cannot exceed 50 characters'),
  email: z
    .string({ required_error: 'Email is required' })
    .email('Please enter a valid email address'),
  password: z
    .string({ required_error: 'Password is required' })
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password cannot exceed 128 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, 'Password must contain at least one special character'),
});

const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .email('Please enter a valid email address'),
  password: z
    .string({ required_error: 'Password is required' })
    .min(1, 'Password is required'),
});

const folderSchema = z.object({
  name: z
    .string({ required_error: 'Folder name is required' })
    .trim()
    .min(1, 'Folder name cannot be empty')
    .max(100, 'Folder name cannot exceed 100 characters'),
});

const renameSchema = z.object({
  newName: z
    .string({ required_error: 'New name is required' })
    .trim()
    .min(1, 'Name cannot be empty')
    .max(255, 'Name cannot exceed 255 characters'),
});

const shareSchema = z.object({
  expiryHours: z
    .number()
    .positive('Expiry must be positive')
    .optional(),
  password: z
    .string()
    .min(4, 'Share password must be at least 4 characters')
    .optional(),
  downloadLimit: z
    .number()
    .int('Download limit must be a whole number')
    .positive('Download limit must be positive')
    .optional(),
});

// ──────────────────────────────────────────────
// Admin Validation Schemas
// ──────────────────────────────────────────────

const updateStatusSchema = z.object({
  status: z.enum(['active', 'suspended', 'disabled']),
});

const updateRoleSchema = z.object({
  role: z.enum(['user', 'admin']),
});

module.exports = {
  validate,
  registerSchema,
  loginSchema,
  folderSchema,
  renameSchema,
  shareSchema,
  updateStatusSchema,
  updateRoleSchema,
};
