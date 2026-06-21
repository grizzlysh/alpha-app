import { z } from 'zod'

export const permissionQuerySchema = z.object({
  search: z.string().trim().optional(),
  module: z.string().trim().optional(),
  sortBy: z.enum(['name', 'module', 'createdAt']).optional().default('module'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
})

export type PermissionQueryInput = z.infer<typeof permissionQuerySchema>
