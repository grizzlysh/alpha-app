import { z } from 'zod'
import { AllergyType, AllergySeverity } from '@prisma/client'

export const updateMedicalRecordSchema = z.object({
  bloodType: z.string().trim().optional(),
  emergencyContactName: z.string().trim().optional(),
  emergencyContactPhone: z.string().trim().optional(),
})

export const createAllergySchema = z.object({
  allergenName: z.string().trim().min(1, { message: 'Allergen name is required' }),
  allergenType: z.nativeEnum(AllergyType),
  reaction: z.string().trim().optional(),
  severity: z.nativeEnum(AllergySeverity),
  notes: z.string().trim().optional(),
})

export const createVisitSchema = z.object({
  visitDate: z.string().datetime(),
  chiefComplaint: z.string().trim().optional(),
  diagnosis: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  weightKg: z.number().positive().optional(),
  heightCm: z.number().positive().optional(),
  bloodPressure: z.string().trim().optional(),
  temperatureCelsius: z.number().optional(),
  pulsePerMinute: z.number().int().positive().optional(),
  prescriptionUuid: z.string().uuid().optional(),
  doctorUuid: z.string().uuid().optional(),
})

export const updateVisitSchema = createVisitSchema.partial()

export const visitQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
})

export type UpdateMedicalRecordInput = z.infer<typeof updateMedicalRecordSchema>
export type CreateAllergyInput = z.infer<typeof createAllergySchema>
export type CreateVisitInput = z.infer<typeof createVisitSchema>
export type UpdateVisitInput = z.infer<typeof updateVisitSchema>
export type VisitQueryInput = z.infer<typeof visitQuerySchema>
