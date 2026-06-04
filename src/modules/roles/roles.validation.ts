import { z } from 'zod'

export const roleQuerySchema = z.object({
  search: z.string().trim().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'DELETED']).optional(),
  isGlobal: z.enum(['true', 'false']).optional(),
  sortBy: z.enum(['name', 'createdAt']).optional().default('name'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
})

export const createRoleSchema = z.object({
  name: z.string().trim().min(1, { message: 'Name is required' }).max(100),
  type: z.enum(['OWNER', 'ADMIN', 'PHARMACIST', 'CASHIER'], { message: 'Invalid role type' }),
  requiresLicense: z.boolean().optional().default(false),
  pharmacyUuid: z.string().trim().uuid({ message: 'Invalid pharmacy UUID' }).optional(),
})

export const updateRoleSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  requiresLicense: z.boolean().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'DELETED']).optional(),
})

export const setRolePermissionsSchema = z.object({
  permissionUuids: z
    .array(z.string().trim().uuid({ message: 'Invalid permission UUID' }))
    .min(0),
})

export type RoleQueryInput = z.infer<typeof roleQuerySchema>
export type CreateRoleInput = z.infer<typeof createRoleSchema>
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>
export type SetRolePermissionsInput = z.infer<typeof setRolePermissionsSchema>
