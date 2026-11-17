import { z } from 'zod'
import { RecordStatus, PharmacyCategory } from '@prisma/client'

export const pharmacyQuerySchema = z.object({
  search: z.string().trim().optional(),
  status: z.enum(RecordStatus).optional(),
  category: z.enum(PharmacyCategory).optional(),
  sortBy: z.enum(['name', 'code', 'createdAt']).optional().default('name'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
})

const codeField = z
  .string()
  .trim()
  .min(1, { message: 'Code is required' })
  .max(5, { message: 'Code must be at most 5 characters' })
  .toUpperCase()
  .regex(/^[A-Z0-9]{1,5}$/, { message: 'Code must be alphanumeric characters' })

const requiredText = (label: string) => z.string().trim().min(1, { message: `${label} is required` })

export const createPharmacySchema = z.object({
  name: z.string().trim().toLowerCase().min(1, { message: 'Name is required' }),
  code: codeField,
  category: z.enum(PharmacyCategory),
  phone: requiredText('Phone'),
  address: requiredText('Address'),
  location: requiredText('Location'),
  email: z.string().trim().toLowerCase().email({ message: 'Invalid email' }).optional(),

  // ── Onboarding extras, all created in the same transaction ──
  /** Business license (SIA). Can also be added later from the pharmacy detail. */
  license: z
    .object({
      licenseNumber: z.string().trim().min(1, { message: 'License number is required' }),
      validFrom: z.coerce.date({ message: 'Invalid validFrom date' }),
      validUntil: z.coerce.date({ message: 'Invalid validUntil date' }),
    })
    .refine((d) => d.validUntil > d.validFrom, { message: 'validUntil must be after validFrom', path: ['validUntil'] })
    .optional(),
  /** The pharmacy owner: a new account, or an existing one (e.g. an owner opening another branch). */
  owner: z
    .discriminatedUnion('mode', [
      z.object({
        mode: z.literal('new'),
        name: z.string().trim().min(1, { message: 'Owner name is required' }).max(100),
        email: z.string().trim().toLowerCase().email({ message: 'Invalid email' }),
        phone: z.string().trim().max(20).optional(),
      }),
      z.object({
        mode: z.literal('existing'),
        userUuid: z.string().uuid({ message: 'Invalid user UUID' }),
      }),
    ])
    .optional(),
  /**
   * Start from another pharmacy's medicines, classifications and business
   * parameter values instead of the default template.
   */
  copyFromPharmacyUuid: z.string().uuid().optional(),
})

export const updatePharmacySchema = z.object({
  name: z.string().trim().toLowerCase().min(1).optional(),
  code: codeField.optional(),
  category: z.enum(PharmacyCategory).optional(),
  phone: requiredText('Phone').optional(),
  address: requiredText('Address').optional(),
  location: requiredText('Location').optional(),
  /** null clears it. */
  email: z.string().trim().toLowerCase().email({ message: 'Invalid email' }).nullable().optional(),
  status: z.enum([RecordStatus.ACTIVE, RecordStatus.INACTIVE]).optional(),
})

export type PharmacyQueryInput = z.infer<typeof pharmacyQuerySchema>
export type CreatePharmacyInput = z.infer<typeof createPharmacySchema>
export type UpdatePharmacyInput = z.infer<typeof updatePharmacySchema>

// ── Business Licenses ─────────────────────────────────

export const businessLicenseQuerySchema = z.object({
  status: z.enum(RecordStatus).optional(),
  sortBy: z.enum(['licenseNumber', 'validFrom', 'validUntil', 'createdAt']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
})

export const createBusinessLicenseSchema = z.object({
  licenseNumber: z.string().trim().min(1, { message: 'License number is required' }),
  validFrom: z.coerce.date({ message: 'Invalid validFrom date' }),
  validUntil: z.coerce.date({ message: 'Invalid validUntil date' }),
}).refine(
  (data) => data.validUntil > data.validFrom,
  { message: 'validUntil must be after validFrom', path: ['validUntil'] }
)

export const updateBusinessLicenseSchema = z.object({
  licenseNumber: z.string().trim().min(1).optional(),
  validFrom: z.coerce.date().optional(),
  validUntil: z.coerce.date().optional(),
  status: z.enum(RecordStatus).optional(),
})

export type BusinessLicenseQueryInput = z.infer<typeof businessLicenseQuerySchema>
export type CreateBusinessLicenseInput = z.infer<typeof createBusinessLicenseSchema>
export type UpdateBusinessLicenseInput = z.infer<typeof updateBusinessLicenseSchema>