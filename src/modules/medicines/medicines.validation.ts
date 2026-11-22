import { z } from 'zod'
import { RecordStatus } from '@prisma/client'

/** A scanned or typed barcode: letters, digits and - . / only (what Code 128 / EAN carry). Empty clears it. */
const barcodeField = z
  .string()
  .trim()
  .max(64)
  .regex(/^[0-9A-Za-z\-./]*$/, { message: 'Barcode may only contain letters, digits, - . /' })
  .transform((v) => (v === '' ? null : v))
  .nullable()
  .optional()

export const createMedicineSchema = z.object({
  name: z.string().trim().min(1, { message: 'Name is required' }),
  medicineShapeUuid: z.string().uuid({ message: 'Invalid shape UUID' }),
  medicineTypeUuid: z.string().uuid({ message: 'Invalid type UUID' }),
  medicineClassUuid: z.string().uuid({ message: 'Invalid medicine class UUID' }),
  unit: z.string().trim().min(1, { message: 'Unit is required' }),
  barcode: barcodeField,
  ingredients: z.array(
    z.string().trim().min(1, { message: 'Ingredient name cannot be empty' })
  ).min(1, { message: 'At least one ingredient is required' }),
})

export const updateMedicineSchema = z.object({
  name: z.string().trim().min(1).optional(),
  medicineShapeUuid: z.string().uuid().optional(),
  medicineTypeUuid: z.string().uuid().optional(),
  medicineClassUuid: z.string().uuid().optional(),
  unit: z.string().trim().min(1).optional(),
  barcode: barcodeField,
  ingredients: z.array(
    z.string().trim().min(1)
  ).min(1).optional(),
  status: z.enum(RecordStatus).optional(),
})

export const medicineQuerySchema = z.object({
  search: z.string().trim().optional(),
  medicineShapeUuid: z.string().uuid().optional(),
  medicineTypeUuid: z.string().uuid().optional(),
  medicineClassUuid: z.string().uuid().optional(),
  status: z.enum(RecordStatus).optional(),
  sortBy: z.enum(['name', 'createdAt']).optional().default('name'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
})

export type CreateMedicineInput = z.infer<typeof createMedicineSchema>
export type UpdateMedicineInput = z.infer<typeof updateMedicineSchema>
export type MedicineQueryInput = z.infer<typeof medicineQuerySchema>
