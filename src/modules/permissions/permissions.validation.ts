import { z } from 'zod'

export const permissionQuerySchema = z.object({
  search: z.string().trim().optional(),
  module: z.string().trim().optional(),
  sortBy: z.enum(['name', 'module', 'createdAt']).optional().default('module'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
})

export type PermissionQueryInput = z.infer<typeof permissionQuerySchema>