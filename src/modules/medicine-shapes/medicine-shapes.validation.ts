import { z } from 'zod'
import { RecordStatus } from '@prisma/client'

export const createMedicineShapeSchema = z.object({
  name: z.string().trim().toLowerCase().min(1, { message: 'Name is required' }),
  status: z.enum(RecordStatus),
  pharmacyUuid: z.string().trim().uuid().optional(),
})

export const updateMedicineShapeSchema = z.object({
  name: z.string().trim().toLowerCase().min(1).optional(),
  status: z.enum(RecordStatus).optional(),
})

export const medicineShapeQuerySchema = z.object({
  search: z.string().trim().optional(),
  status: z.enum(RecordStatus).optional(),
  isGlobal: z.enum(['true', 'false']).optional(),
  sortBy: z.enum(['name', 'createdAt']).optional().default('name'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
})

export type CreateMedicineShapeInput = z.infer<typeof createMedicineShapeSchema>
export type UpdateMedicineShapeInput = z.infer<typeof updateMedicineShapeSchema>
export type MedicineShapeQueryInput = z.infer<typeof medicineShapeQuerySchema>
