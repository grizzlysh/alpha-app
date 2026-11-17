import { z } from 'zod'

// Names are stored lowercase across the medicine master (see medicines.validation).
const name = z.string().trim().toLowerCase().min(1).max(200)

export const MAX_IMPORT_MEDICINES = 5000

export const catalogImportSchema = z.object({
  /** Validate and count only; nothing is written. */
  dryRun: z.boolean().optional().default(false),
  shapes: z.array(z.object({ name })).max(500).optional().default([]),
  types: z.array(z.object({ name, requiredPrescription: z.boolean().optional() })).max(500).optional().default([]),
  classes: z.array(z.object({ name })).max(500).optional().default([]),
  medicines: z
    .array(
      z.object({
        // Rows are checked one by one so a single bad row doesn't reject the file.
        name: z.string().trim().toLowerCase().max(200).optional().default(''),
        unit: z.string().trim().toLowerCase().max(50).optional().default(''),
        shape: z.string().trim().toLowerCase().max(200).optional().default(''),
        type: z.string().trim().toLowerCase().max(200).optional().default(''),
        class: z.string().trim().toLowerCase().max(200).optional().default(''),
        ingredients: z.array(z.string().trim().toLowerCase().max(200)).max(50).optional().default([]),
      })
    )
    .max(MAX_IMPORT_MEDICINES, { message: `At most ${MAX_IMPORT_MEDICINES} medicines per import` })
    .optional()
    .default([]),
})

export type CatalogImportInput = z.infer<typeof catalogImportSchema>
