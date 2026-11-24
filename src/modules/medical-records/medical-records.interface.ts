import { Request } from 'express'
import { UpdateMedicalRecordInput, CreateAllergyInput, UpdateAllergyInput, CreateVisitInput, UpdateVisitInput } from './medical-records.validation'

export interface MedicalRecordResponse {
  uuid: string
  number: string
  bloodType: string | null
  emergencyContactName: string | null
  emergencyContactPhone: string | null
  customer: {
    uuid: string
    name: string
    phone: string | null
  }
  allergies: AllergyResponse[]
  createdAt: Date
  updatedAt: Date
}

export interface AllergyResponse {
  uuid: string
  allergenName: string
  allergenType: string
  reaction: string | null
  severity: string
  notes: string | null
  createdAt: Date
}

export interface MedicalVisitResponse {
  uuid: string
  visitDate: Date
  chiefComplaint: string | null
  diagnosis: string | null
  notes: string | null
  weightKg: number | null
  heightCm: number | null
  bloodPressure: string | null
  temperatureCelsius: number | null
  pulsePerMinute: number | null
  prescription: { uuid: string; prescriptionNumber: string | null; status: string } | null
  doctor: { uuid: string; name: string } | null
  createdAt: Date
  updatedAt: Date
}

export interface GetMedicalRecordRequest extends Request {
  params: { customer_uuid: string }
}

export interface UpdateMedicalRecordRequest extends Request {
  params: { customer_uuid: string }
  body: UpdateMedicalRecordInput
}

export interface CreateAllergyRequest extends Request {
  params: { customer_uuid: string }
  body: CreateAllergyInput
}

export interface UpdateAllergyRequest extends Request {
  params: { customer_uuid: string; allergy_uuid: string }
  body: UpdateAllergyInput
}

export interface DeleteAllergyRequest extends Request {
  params: { customer_uuid: string; allergy_uuid: string }
}

export type GetVisitsRequest = Request<{ customer_uuid: string }, {}, {}, any>

export interface GetVisitRequest extends Request {
  params: { customer_uuid: string; visit_uuid: string }
}

export interface CreateVisitRequest extends Request {
  params: { customer_uuid: string }
  body: CreateVisitInput
}

export interface UpdateVisitRequest extends Request {
  params: { customer_uuid: string; visit_uuid: string }
  body: UpdateVisitInput
}

export interface DeleteVisitRequest extends Request {
  params: { customer_uuid: string; visit_uuid: string }
}
