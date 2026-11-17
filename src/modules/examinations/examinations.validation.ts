import { z } from 'zod'
import { VisitStatus } from '@prisma/client'

const vitalFields = {
  chiefComplaint: z.string().trim().max(2000).optional(),
  weightKg: z.number().positive().max(500).nullable().optional(),
  heightCm: z.number().positive().max(300).nullable().optional(),
  bloodPressure: z.string().trim().max(20).optional(),
  temperatureCelsius: z.number().min(25).max(45).nullable().optional(),
  pulsePerMinute: z.number().int().positive().max(300).nullable().optional(),
  oxygenSaturation: z.number().int().min(50).max(100).nullable().optional(),
}

const examFields = {
  ...vitalFields,
  findings: z.string().trim().max(4000).optional(),
  diagnosis: z.string().trim().max(2000).optional(),
  advice: z.string().trim().max(4000).optional(),
  notes: z.string().trim().max(4000).optional(),
}

export const queueQuerySchema = z.object({
  /** yyyy-MM-dd in the pharmacy's timezone; defaults to today. */
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status: z.nativeEnum(VisitStatus).optional(),
})

export const checkInSchema = z.object({
  customerUuid: z.string().uuid(),
  doctorUuid: z.string().uuid().optional(),
  chiefComplaint: z.string().trim().max(2000).optional(),
})

export const startExamSchema = z.object({
  doctorUuid: z.string().uuid().optional(),
})

export const triageSchema = z.object(vitalFields)

export const saveExamSchema = z.object(examFields)

const prescriptionItemSchema = z.object({
  medicineUuid: z.string().uuid().optional(),
  medicineName: z.string().trim().min(1).max(255),
  qty: z.number().int().min(1),
  frequency: z.string().trim().max(50).optional(),
  duration: z.string().trim().max(100).optional(),
  notes: z.string().trim().max(500).optional(),
})

export const completeExamSchema = z.object({
  ...examFields,
  prescription: z
    .object({
      notes: z.string().trim().max(2000).optional(),
      items: z.array(prescriptionItemSchema).min(1),
    })
    .optional(),
  /** Required when the prescription contains a medicine the patient is allergic to. */
  acknowledgeAllergies: z.boolean().optional().default(false),
})

export const cancelExamSchema = z.object({
  reason: z.string().trim().max(500).optional(),
})

export type QueueQueryInput = z.infer<typeof queueQuerySchema>
export type CheckInInput = z.infer<typeof checkInSchema>
export type StartExamInput = z.infer<typeof startExamSchema>
export type TriageInput = z.infer<typeof triageSchema>
export type SaveExamInput = z.infer<typeof saveExamSchema>
export type CompleteExamInput = z.infer<typeof completeExamSchema>
export type CancelExamInput = z.infer<typeof cancelExamSchema>
