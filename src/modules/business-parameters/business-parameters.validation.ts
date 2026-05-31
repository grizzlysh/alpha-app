import { z } from 'zod'

export const businessParameterQuerySchema = z.object({
  search: z.string().trim().optional(),
  sortBy: z.enum(['key', 'createdAt']).optional().default('key'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
})

export const updateBusinessParameterSchema = z.object({
  value: z.string().trim().min(1, { message: 'Value is required' }),
  description: z.string().trim().optional(),
})

export type BusinessParameterQueryInput = z.infer<typeof businessParameterQuerySchema>
export type UpdateBusinessParameterInput = z.infer<typeof updateBusinessParameterSchema>