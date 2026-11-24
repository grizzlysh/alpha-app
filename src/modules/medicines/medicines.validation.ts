import { z } from 'zod'
import { OrderLetterKind, RecordStatus } from '@prisma/client'
import { normalizeStrength } from '@utils/medicineName'

/** A scanned or typed barcode: letters, digits and - . / only (what Code 128 / EAN carry). Empty clears it. */
const barcodeField = z
  .string()
  .trim()
  .max(64)
  .regex(/^[0-9A-Za-z\-./]*$/, { message: 'Barcode may only contain letters, digits, - . /' })
  .transform((v) => (v === '' ? null : v))
  .nullable()
  .optional()

/** An ingredient: a plain name, or a name with its strength ("500 mg"). */
const ingredientField = z.union([
  z
    .string()
    .trim()
    .min(1, { message: 'Ingredient name cannot be empty' })
    .transform((name) => ({ name, strength: null as string | null })),
  z.object({
    name: z.string().trim().min(1, { message: 'Ingredient name cannot be empty' }).max(200),
    strength: z
      .string()
      .trim()
      .max(50)
      .nullable()
      .optional()
      .transform((v) => (v ? normalizeStrength(v) : null)),
  }),
])

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .optional()
    .transform((v) => (v === undefined ? undefined : v || null))

/**
 * A structured name (baseName + strengths + shape + variant, joined by the
 * pharmacy's format) or a custom one typed in `name`. Without isCustomName,
 * sending only `name` means a custom name.
 */
const nameFields = {
  name: z.string().trim().min(1).max(200).optional(),
  baseName: z.string().trim().min(1).max(200).optional(),
  variant: optionalText(100),
  isCustomName: z.boolean().optional(),
  /** The surat pesanan it goes on when that differs from its type's; null follows the type. */
  orderLetterKind: z.enum(OrderLetterKind).nullable().optional(),
}

export const createMedicineSchema = z.object({
  ...nameFields,
  medicineShapeUuid: z.string().uuid({ message: 'Invalid shape UUID' }),
  medicineTypeUuid: z.string().uuid({ message: 'Invalid type UUID' }),
  medicineClassUuid: z.string().uuid({ message: 'Invalid medicine class UUID' }),
  unit: z.string().trim().min(1, { message: 'Unit is required' }),
  barcode: barcodeField,
  ingredients: z.array(ingredientField).min(1, { message: 'At least one ingredient is required' }),
}).superRefine((d, ctx) => {
  const custom = d.isCustomName ?? !d.baseName
  if (custom && !d.name) ctx.addIssue({ code: 'custom', path: ['name'], message: 'Name is required' })
  if (!custom && !d.baseName) ctx.addIssue({ code: 'custom', path: ['baseName'], message: 'Name is required' })
})

export const updateMedicineSchema = z.object({
  ...nameFields,
  medicineShapeUuid: z.string().uuid().optional(),
  medicineTypeUuid: z.string().uuid().optional(),
  medicineClassUuid: z.string().uuid().optional(),
  unit: z.string().trim().min(1).optional(),
  barcode: barcodeField,
  ingredients: z.array(ingredientField).min(1).optional(),
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
