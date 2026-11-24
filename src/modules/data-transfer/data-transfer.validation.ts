import { z } from 'zod'

// Rows arrive straight from a spreadsheet, so every field is optional here and
// checked row by row — one bad row is reported, not fatal for the file.
const text = (max = 200) => z.string().trim().max(max).optional().default('')
const MAX_ROWS = 5000

export const distributorImportSchema = z.object({
  dryRun: z.boolean().optional().default(false),
  rows: z
    .array(
      z.object({
        name: text(),
        phone: text(30),
        email: text(),
        address: text(500),
        contactPerson: text(),
        permitNumber: text(),
      })
    )
    .max(MAX_ROWS),
})

export const customerImportSchema = z.object({
  dryRun: z.boolean().optional().default(false),
  rows: z
    .array(
      z.object({
        name: text(),
        phone: text(30),
        address: text(500),
        /** "L"/"P", "Laki-laki"/"Perempuan", "MALE"/"FEMALE". */
        gender: text(20),
        /** YYYY-MM-DD */
        dateOfBirth: text(20),
        nik: text(30),
        bpjsNumber: text(30),
      })
    )
    .max(MAX_ROWS),
})

export const openingStockImportSchema = z.object({
  dryRun: z.boolean().optional().default(false),
  /** The pharmacist who confirms the counted stock (active SIPA; Head Pharmacist for controlled medicines). */
  signedByUuid: z.string().uuid({ message: 'Invalid signer UUID' }),
  /** Used for rows that name no distributor. */
  defaultDistributorUuid: z.string().uuid().optional(),
  rows: z
    .array(
      z.object({
        medicine: text(),
        batchNumber: text(100),
        /** YYYY-MM-DD */
        expiryDate: text(20),
        quantityPieces: z.coerce.number().optional().default(0),
        /** Purchase price per piece. */
        purchasePrice: z.coerce.number().optional().default(0),
        /** Optional fixed selling price per piece. */
        sellingPrice: z.coerce.number().optional(),
        distributor: text(),
      })
    )
    .min(1)
    .max(MAX_ROWS),
})

export type DistributorImportInput = z.infer<typeof distributorImportSchema>
export type CustomerImportInput = z.infer<typeof customerImportSchema>
export type OpeningStockImportInput = z.infer<typeof openingStockImportSchema>
