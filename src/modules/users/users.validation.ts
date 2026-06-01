import { z } from 'zod';

// ─── User ─────────────────────────────────────────────────────────────────────

export const listUserSchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  search: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'DELETED']).optional(),
  platformRole: z.enum(['PLATFORM_ADMIN', 'PLATFORM_VIEWER', 'PLATFORM_SUPPORT']).optional(),
});

export const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email'),
  phone: z.string().max(20).optional(),
  address: z.string().max(255).optional(),
  platformRole: z
    .enum(['PLATFORM_ADMIN', 'PLATFORM_VIEWER', 'PLATFORM_SUPPORT'])
    .optional()
    .default('PLATFORM_VIEWER'),
});

export const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(20).optional(),
  address: z.string().max(255).optional(),
  platformRole: z.enum(['PLATFORM_ADMIN', 'PLATFORM_VIEWER', 'PLATFORM_SUPPORT']).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

// ─── Me ───────────────────────────────────────────────────────────────────────

export const updateMeSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  phone: z.string().max(20).optional(),
  address: z.string().max(255).optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100)
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Must contain at least one number'),
});

// ─── Assignments ──────────────────────────────────────────────────────────────

export const listPlacementSchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'DELETED']).optional(),
});

export const createPlacementSchema = z.object({
  pharmacyUuid: z.string().uuid('Invalid pharmacy UUID'),
  roleUuid: z.string().uuid('Invalid role UUID'),
  joinedAt: z.string().datetime({ message: 'Invalid joinedAt date' }),
});

export const updatePlacementSchema = z.object({
  roleUuid: z.string().uuid('Invalid role UUID').optional(),
  joinedAt: z.string().datetime().optional(),
  leftAt: z.string().datetime().nullable().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

// ─── Licenses ─────────────────────────────────────────────────────────────────

export const listLicenseSchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'DELETED']).optional(),
});

export const createLicenseSchema = z.object({
  licenseNumber: z.string().min(1, 'License number is required').max(100),
  validFrom: z.string().datetime({ message: 'Invalid validFrom date' }),
  validUntil: z.string().datetime({ message: 'Invalid validUntil date' }),
}).refine(
  (data) => new Date(data.validUntil) > new Date(data.validFrom),
  { message: 'validUntil must be after validFrom', path: ['validUntil'] }
);

export const updateLicenseSchema = z.object({
  licenseNumber: z.string().min(1).max(100).optional(),
  validFrom: z.string().datetime().optional(),
  validUntil: z.string().datetime().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
}).refine(
  (data) => {
    if (data.validFrom && data.validUntil) {
      return new Date(data.validUntil) > new Date(data.validFrom);
    }
    return true;
  },
  { message: 'validUntil must be after validFrom', path: ['validUntil'] }
);

