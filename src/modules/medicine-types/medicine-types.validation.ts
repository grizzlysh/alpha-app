import { z } from 'zod'
import { RecordStatus } from '@prisma/client'

export const createMedicineTypeSchema = z.object({
  name: z.string().min(1, { message: 'Name is required' }),
  pharmacyUuid: z.string().uuid().optional(),
})

export const updateMedicineTypeSchema = z.object({
  name: z.string().min(1).optional(),
  status: z.nativeEnum(RecordStatus).optional(),
})

export const medicineTypeQuerySchema = z.object({
  search: z.string().optional(),
  status: z.nativeEnum(RecordStatus).optional(),
  isGlobal: z.enum(['true', 'false']).optional(),
  sortBy: z.enum(['name', 'createdAt']).optional().default('name'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
})

export type CreateMedicineTypeInput = z.infer<typeof createMedicineTypeSchema>
export type UpdateMedicineTypeInput = z.infer<typeof updateMedicineTypeSchema>
export type MedicineTypeQueryInput = z.infer<typeof medicineTypeQuerySchema>