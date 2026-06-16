import { z } from 'zod'
import { RecordStatus } from '@prisma/client'

export const createMedicineTypeSchema = z.object({
  name: z.string().trim().min(1, { message: 'Name is required' }),
  requiredPrescription: z.boolean({ error: 'requiredPrescription must be a boolean' }),
  status: z.enum(RecordStatus),
  pharmacyUuid: z.string().trim().uuid().optional(),
})

export const updateMedicineTypeSchema = z.object({
  name: z.string().trim().min(1).optional(),
  requiredPrescription: z.boolean().optional(),
  status: z.enum(RecordStatus).optional(),
})

export const medicineTypeQuerySchema = z.object({
  search: z.string().trim().optional(),
  status: z.enum(RecordStatus).optional(),
  isGlobal: z.enum(['true', 'false']).optional(),
  sortBy: z.enum(['name', 'createdAt']).optional().default('name'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
})

export type CreateMedicineTypeInput = z.infer<typeof createMedicineTypeSchema>
export type UpdateMedicineTypeInput = z.infer<typeof updateMedicineTypeSchema>
export type MedicineTypeQueryInput = z.infer<typeof medicineTypeQuerySchema>
