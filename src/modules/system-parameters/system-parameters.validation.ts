import { z } from 'zod'

export const systemParameterQuerySchema = z.object({
  search: z.string().trim().optional(),
  sortBy: z.enum(['key', 'createdAt']).optional().default('key'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
})

export const updateSystemParameterSchema = z.object({
  value: z.string().trim().min(1, { message: 'Value is required' }),
  description: z.string().trim().optional(),
})

export type SystemParameterQueryInput = z.infer<typeof systemParameterQuerySchema>
export type UpdateSystemParameterInput = z.infer<typeof updateSystemParameterSchema>