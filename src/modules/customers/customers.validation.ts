import { z } from 'zod'

export const createCustomerSchema = z.object({
  name: z.string().trim().min(1, { message: 'Name is required' }),
  phone: z.string().trim().optional(),
  address: z.string().trim().optional(),
  description: z.string().trim().optional(),
})

export const updateCustomerSchema = z.object({
  name: z.string().trim().min(1).optional(),
  phone: z.string().trim().optional(),
  address: z.string().trim().optional(),
  description: z.string().trim().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'DELETED']).optional(),
})

export const customerQuerySchema = z.object({
  search: z.string().trim().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'DELETED']).optional(),
  isWalkIn: z.enum(['true', 'false']).optional(),
  sortBy: z.enum(['name', 'createdAt']).optional().default('name'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
})

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>
export type CustomerQueryInput = z.infer<typeof customerQuerySchema>
