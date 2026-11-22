import { Request } from 'express'
import { VisitStatus, AllergySeverity, AllergyType, PrescriptionStatus } from '@prisma/client'
import { CheckInInput, TriageInput, StartExamInput, SaveExamInput, CompleteExamInput, CancelExamInput } from './examinations.validation'

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
    notes: string | null
    createdAt: Date
  }[]
}

export interface ExaminationResponse {
  uuid: string
  queueNumber: number | null
  status: VisitStatus
  visitDate: Date
  checkedInAt: Date | null
  triagedAt: Date | null
  triagedBy: { uuid: string; name: string } | null
  startedAt: Date | null
  completedAt: Date | null
  chiefComplaint: string | null
  findings: string | null
  diagnosis: string | null
  advice: string | null
  notes: string | null
  weightKg: number | null
  heightCm: number | null
  bloodPressure: string | null
  temperatureCelsius: number | null
  pulsePerMinute: number | null
  oxygenSaturation: number | null
  doctor: { uuid: string; name: string } | null
  prescription: {
    uuid: string
    prescriptionNumber: string | null
    status: PrescriptionStatus
    details: { uuid: string; medicineName: string; qty: number; frequency: string | null; duration: string | null; notes: string | null }[]
  } | null
  patient: ExaminationPatient
}

/** A doctor the queue can be split by. */
export interface QueueDoctor {
  uuid: string
  name: string
  /** The signed-in user is this doctor. */
  isMe: boolean
}

export interface ExaminationQueueResponse {
  date: string
  counts: Record<VisitStatus, number>
  /** Waiting patients whose vitals are already recorded. */
  triaged: number
  doctors: QueueDoctor[]
  items: ExaminationResponse[]
}

/** One prescription line that matches one of the patient's recorded allergies. */
export type { AllergyConflict } from '@utils/allergyCheck'

type P = { examination_uuid: string }
export interface CheckInRequest extends Request { body: CheckInInput }
export interface ExaminationRequest extends Request { params: P }
export interface TriageRequest extends Request { params: P; body: TriageInput }
export interface StartExamRequest extends Request { params: P; body: StartExamInput }
export interface SaveExamRequest extends Request { params: P; body: SaveExamInput }
export interface CompleteExamRequest extends Request { params: P; body: CompleteExamInput }
export interface CancelExamRequest extends Request { params: P; body: CancelExamInput }
