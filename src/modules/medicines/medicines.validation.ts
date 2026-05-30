import { z } from 'zod'
import { RecordStatus } from '@prisma/client'

export const createMedicineSchema = z.object({
  name: z.string().trim().min(1, { message: 'Name is required' }),
  shapeId: z.number().int().positive({ message: 'Shape is required' }),
  typeId: z.number().int().positive({ message: 'Type is required' }),
  medicineClassId: z.number().int().positive({ message: 'Medicine class is required' }),
  unit: z.string().trim().min(1, { message: 'Unit is required' }),
  ingredients: z.array(
    z.string().trim().min(1, { message: 'Ingredient name cannot be empty' })
  ).min(1, { message: 'At least one ingredient is required' }),
})

export const updateMedicineSchema = z.object({
  name: z.string().trim().min(1).optional(),
  shapeId: z.number().int().positive().optional(),
  typeId: z.number().int().positive().optional(),
  medicineClassId: z.number().int().positive().optional(),
  unit: z.string().trim().min(1).optional(),
  ingredients: z.array(
    z.string().trim().min(1)
  ).min(1).optional(),
  status: z.nativeEnum(RecordStatus).optional(),
})

export const medicineQuerySchema = z.object({
  search: z.string().trim().optional(),
  shapeId: z.coerce.number().int().positive().optional(),
  typeId: z.coerce.number().int().positive().optional(),
  medicineClassId: z.coerce.number().int().positive().optional(),
  status: z.nativeEnum(RecordStatus).optional(),
  sortBy: z.enum(['name', 'createdAt']).optional().default('name'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
})

export type CreateMedicineInput = z.infer<typeof createMedicineSchema>
export type UpdateMedicineInput = z.infer<typeof updateMedicineSchema>
export type MedicineQueryInput = z.infer<typeof medicineQuerySchema>