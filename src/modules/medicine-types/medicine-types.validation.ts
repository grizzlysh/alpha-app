import { z } from 'zod'

export const createMedicineTypeSchema = z.object({
  name: z.string().trim().min(1, { message: 'Name is required' }),
  status: z.enum(['ACTIVE', 'INACTIVE', 'DELETED']),
  pharmacyUuid: z.string().trim().uuid().optional(),
})

export const updateMedicineTypeSchema = z.object({
  name: z.string().trim().min(1).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'DELETED']).optional(),
})

export const medicineTypeQuerySchema = z.object({
  search: z.string().trim().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'DELETED']).optional(),
  isGlobal: z.enum(['true', 'false']).optional(),
  sortBy: z.enum(['name', 'createdAt']).optional().default('name'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
})

export type CreateMedicineTypeInput = z.infer<typeof createMedicineTypeSchema>
export type UpdateMedicineTypeInput = z.infer<typeof updateMedicineTypeSchema>
export type MedicineTypeQueryInput = z.infer<typeof medicineTypeQuerySchema>
