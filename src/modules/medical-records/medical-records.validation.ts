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

export const updateAllergySchema = createAllergySchema.partial()

export const createVisitSchema = z.object({
  visitDate: z.string().datetime(),
  chiefComplaint: z.string().trim().optional(),
  findings: z.string().trim().optional(),
  diagnosis: z.string().trim().optional(),
  advice: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  weightKg: z.number().positive().optional(),
  heightCm: z.number().positive().optional(),
  bloodPressure: z.string().trim().optional(),
  temperatureCelsius: z.number().optional(),
  pulsePerMinute: z.number().int().positive().optional(),
  oxygenSaturation: z.number().int().min(50).max(100).optional(),
  // null unlinks the prescription on update
  prescriptionUuid: z.string().uuid().nullable().optional(),
  doctorUuid: z.string().uuid().optional(),
})

export const updateVisitSchema = createVisitSchema.partial()

export const visitQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
})

export type UpdateMedicalRecordInput = z.infer<typeof updateMedicalRecordSchema>
export type CreateAllergyInput = z.infer<typeof createAllergySchema>
export type UpdateAllergyInput = z.infer<typeof updateAllergySchema>
export type CreateVisitInput = z.infer<typeof createVisitSchema>
export type UpdateVisitInput = z.infer<typeof updateVisitSchema>
export type VisitQueryInput = z.infer<typeof visitQuerySchema>
