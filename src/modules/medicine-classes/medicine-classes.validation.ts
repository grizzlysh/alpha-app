import { z } from 'zod'

export const createMedicineClassSchema = z.object({
  name: z.string().trim().min(1, { message: 'Name is required' }),
  status: z.enum(['ACTIVE', 'INACTIVE', 'DELETED']),
  pharmacyUuid: z.string().trim().uuid().optional(),
})

export const updateMedicineClassSchema = z.object({
  name: z.string().trim().min(1).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'DELETED']).optional(),
})

export const medicineClassQuerySchema = z.object({
  search: z.string().trim().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'DELETED']).optional(),
  isGlobal: z.enum(['true', 'false']).optional(),
  sortBy: z.enum(['name', 'createdAt']).optional().default('name'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
})

export type CreateMedicineClassInput = z.infer<typeof createMedicineClassSchema>
export type UpdateMedicineClassInput = z.infer<typeof updateMedicineClassSchema>
export type MedicineClassQueryInput = z.infer<typeof medicineClassQuerySchema>
