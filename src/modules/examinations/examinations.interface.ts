import { Request } from 'express'
import { VisitStatus, AllergySeverity, AllergyType, PrescriptionStatus } from '@prisma/client'
import { CheckInInput, StartExamInput, SaveExamInput, CompleteExamInput, CancelExamInput } from './examinations.validation'

export interface ExaminationPatient {
  uuid: string
  name: string
  phone: string | null
  gender: string | null
  dateOfBirth: Date | null
  medicalRecordNumber: string
  bloodType: string | null
  allergies: {
    uuid: string
    allergenName: string
    allergenType: AllergyType
    severity: AllergySeverity
    reaction: string | null
  }[]
}

export interface ExaminationResponse {
  uuid: string
  queueNumber: number | null
  status: VisitStatus
  visitDate: Date
  checkedInAt: Date | null
  startedAt: Date | null
  completedAt: Date | null
  chiefComplaint: string | null
  diagnosis: string | null
  notes: string | null
  weightKg: number | null
  heightCm: number | null
  bloodPressure: string | null
  temperatureCelsius: number | null
  pulsePerMinute: number | null
  doctor: { uuid: string; name: string } | null
  prescription: {
    uuid: string
    prescriptionNumber: string | null
    status: PrescriptionStatus
    details: { uuid: string; medicineName: string; qty: number; frequency: string | null; duration: string | null; notes: string | null }[]
  } | null
  patient: ExaminationPatient
}

export interface ExaminationQueueResponse {
  date: string
  counts: Record<VisitStatus, number>
  items: ExaminationResponse[]
}

/** One prescription line that matches one of the patient's recorded allergies. */
export interface AllergyConflict {
  medicineName: string
  allergenName: string
  severity: AllergySeverity
  matchedOn: string
}

type P = { examination_uuid: string }
export interface CheckInRequest extends Request { body: CheckInInput }
export interface ExaminationRequest extends Request { params: P }
export interface StartExamRequest extends Request { params: P; body: StartExamInput }
export interface SaveExamRequest extends Request { params: P; body: SaveExamInput }
export interface CompleteExamRequest extends Request { params: P; body: CompleteExamInput }
export interface CancelExamRequest extends Request { params: P; body: CancelExamInput }
