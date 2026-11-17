import { z } from 'zod'
import { RecordStatus } from '@prisma/client'

export const createMedicineClassSchema = z.object({
  name: z.string().trim().toLowerCase().min(1, { message: 'Name is required' }),
  status: z.enum(RecordStatus),
})

export const updateMedicineClassSchema = z.object({
  name: z.string().trim().toLowerCase().min(1).optional(),
  status: z.enum(RecordStatus).optional(),
})

export const medicineClassQuerySchema = z.object({
  search: z.string().trim().optional(),
  status: z.enum(RecordStatus).optional(),
  sortBy: z.enum(['name', 'createdAt']).optional().default('name'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
})

export type CreateMedicineClassInput = z.infer<typeof createMedicineClassSchema>
export type UpdateMedicineClassInput = z.infer<typeof updateMedicineClassSchema>
export type MedicineClassQueryInput = z.infer<typeof medicineClassQuerySchema>
