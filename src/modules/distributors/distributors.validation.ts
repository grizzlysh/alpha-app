import { z } from 'zod'
import { RecordStatus } from '@prisma/client'

export const createDistributorSchema = z.object({
  name: z.string().trim().min(1, { message: 'Name is required' }),
  phone: z.string().trim().min(1, { message: 'Phone is required' }),
  email: z.string().trim().email({ message: 'Invalid email format' }).optional(),
  address: z.string().trim().optional(),
  contactPerson: z.string().trim().optional(),
  permitNumber: z.string().trim().optional(),
  description: z.string().trim().optional(),
})

export const updateDistributorSchema = z.object({
  name: z.string().trim().min(1).optional(),
  phone: z.string().trim().min(1).optional(),
  email: z.string().trim().email().optional(),
  address: z.string().trim().optional(),
  contactPerson: z.string().trim().optional(),
  permitNumber: z.string().trim().optional(),
  description: z.string().trim().optional(),
  status: z.enum(RecordStatus).optional(),
})

export const distributorQuerySchema = z.object({
  search: z.string().trim().optional(),
  status: z.enum(RecordStatus).optional(),
  sortBy: z.enum(['name', 'createdAt']).optional().default('name'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
})

export type CreateDistributorInput = z.infer<typeof createDistributorSchema>
export type UpdateDistributorInput = z.infer<typeof updateDistributorSchema>
export type DistributorQueryInput = z.infer<typeof distributorQuerySchema>
