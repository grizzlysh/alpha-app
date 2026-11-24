import { z } from 'zod'

// Names are kept as typed; matching against existing rows is case-insensitive.
const name = z.string().trim().min(1).max(200)

export const MAX_IMPORT_MEDICINES = 5000

export const catalogImportSchema = z.object({
  /** Validate and count only; nothing is written. */
  dryRun: z.boolean().optional().default(false),
  shapes: z.array(z.object({ name })).max(500).optional().default([]),
  types: z.array(z.object({ name, requiredPrescription: z.boolean().optional(), isControlled: z.boolean().optional() })).max(500).optional().default([]),
  classes: z.array(z.object({ name })).max(500).optional().default([]),
  medicines: z
    .array(
      z.object({
        // Rows are checked one by one so a single bad row doesn't reject the file.
        name: z.string().trim().max(200).optional().default(''),
        unit: z.string().trim().max(50).optional().default(''),
        shape: z.string().trim().max(200).optional().default(''),
        type: z.string().trim().max(200).optional().default(''),
        class: z.string().trim().max(200).optional().default(''),
        /** Set for a structured name (the name part); without it `name` is used as typed. */
        baseName: z.string().trim().max(200).nullable().optional(),
        variant: z.string().trim().max(100).nullable().optional(),
        isCustomName: z.boolean().optional(),
        /** "Paracetamol 500 mg" or { name, strength }. */
        ingredients: z
          .array(z.union([z.string().trim().max(200), z.object({ name: z.string().trim().max(200), strength: z.string().trim().max(50).nullable().optional() })]))
          .max(50)
          .optional()
          .default([]),
      })
    )
    .max(MAX_IMPORT_MEDICINES, { message: `At most ${MAX_IMPORT_MEDICINES} medicines per import` })
    .optional()
    .default([]),
})

export type CatalogImportInput = z.infer<typeof catalogImportSchema>
