import { z } from 'zod'
import { RecordStatus } from '@prisma/client'

export const createDistributorSchema = z.object({
  name: z.string().min(1, { message: 'Name is required' }),
  phone: z.coerce.number().int().positive().min(1, { message: 'Phone is required' }),
  email: z.string().email({ message: 'Invalid email format' }).optional(),
  address: z.string().optional(),
  contactPerson: z.string().optional(),
  permitNumber: z.string().optional(),
  description: z.string().optional(),
})

export const updateDistributorSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.coerce.number().int().positive().min(1).optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
  contactPerson: z.string().optional(),
  permitNumber: z.string().optional(),
  description: z.string().optional(),
  status: z.nativeEnum(RecordStatus).optional(),
})

export const distributorQuerySchema = z.object({
  search: z.string().optional(),
  status: z.nativeEnum(RecordStatus).optional(),
  sortBy: z.enum(['name', 'createdAt']).optional().default('name'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
})

export type CreateDistributorInput = z.infer<typeof createDistributorSchema>
export type UpdateDistributorInput = z.infer<typeof updateDistributorSchema>
export type DistributorQueryInput = z.infer<typeof distributorQuerySchema>