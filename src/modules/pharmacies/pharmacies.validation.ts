import { z } from 'zod'
import { RecordStatus, PharmacyCategory } from '@prisma/client'

export const pharmacyQuerySchema = z.object({
  search: z.string().trim().optional(),
  status: z.nativeEnum(RecordStatus).optional(),
  category: z.nativeEnum(PharmacyCategory).optional(),
  sortBy: z.enum(['name', 'code', 'createdAt']).optional().default('name'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
})

export const createPharmacySchema = z.object({
  name: z.string().trim().min(1, { message: 'Name is required' }),
  code: z
    .string()
    .trim()
    .length(5)
    .toUpperCase()
    .regex(/^[A-Z0-9]{5}$/, { message: 'Code must be 5 alphanumeric characters' })
    .optional(),
  category: z.nativeEnum(PharmacyCategory),
  permitNumber: z.string().trim().min(1, { message: 'Permit number is required' }),
  ownerUuid: z.string().trim().uuid({ message: 'Invalid owner UUID' }),
  phone: z.string().trim().min(1, { message: 'Phone is required' }),
  address: z.string().trim().min(1, { message: 'Address is required' }),
  email: z.string().trim().email({ message: 'Invalid email' }).optional(),
})

export const updatePharmacySchema = z.object({
  name: z.string().trim().min(1).optional(),
  code: z
    .string()
    .trim()
    .length(5)
    .toUpperCase()
    .regex(/^[A-Z0-9]{5}$/, { message: 'Code must be 5 alphanumeric characters' })
    .optional(),
  category: z.nativeEnum(PharmacyCategory).optional(),
  permitNumber: z.string().trim().min(1).optional(),
  phone: z.string().trim().optional(),
  address: z.string().trim().optional(),
  email: z.string().trim().email().optional(),
  status: z.nativeEnum(RecordStatus).optional(),
})

export const updatePharmacyOwnerSchema = z.object({
  ownerUuid: z.string().trim().uuid({ message: 'Invalid owner UUID' }),
})

export type PharmacyQueryInput = z.infer<typeof pharmacyQuerySchema>
export type CreatePharmacyInput = z.infer<typeof createPharmacySchema>
export type UpdatePharmacyInput = z.infer<typeof updatePharmacySchema>
export type UpdatePharmacyOwnerInput = z.infer<typeof updatePharmacyOwnerSchema>