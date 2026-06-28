import { Request } from 'express'
import { PrescriptionStatus, PrescriptionDetailStatus } from '@prisma/client'
import { ParamsDictionary } from 'express-serve-static-core'

export interface PrescriptionUuidParam extends ParamsDictionary {
  prescription_uuid: string
}

export interface PrescriptionQueryParams {
  search?: string
  status?: PrescriptionStatus
  doctorUuid?: string
  customerUuid?: string
  dateFrom?: string
  dateTo?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: string
  limit?: string
}

export interface AvailablePrescriptionItem {
  uuid: string
  prescriptionNumber: string | null
  prescribedAt: Date
  status: PrescriptionStatus
  customer: { uuid: string; name: string }
  doctor: { uuid: string; name: string } | null
}

export interface AvailablePrescriptionsQueryParams {
  customerUuid?: string
}

export type ListPrescriptionsRequest = Request<{}, {}, {}, PrescriptionQueryParams>
export type AvailablePrescriptionsRequest = Request<{}, {}, {}, AvailablePrescriptionsQueryParams>
export type GetPrescriptionRequest = Request<PrescriptionUuidParam, {}, {}, {}>
export type CreatePrescriptionRequest = Request<{}, {}, any, {}>
export type UpdatePrescriptionRequest = Request<PrescriptionUuidParam, {}, any, {}>
export type DeletePrescriptionRequest = Request<PrescriptionUuidParam, {}, {}, {}>
export type DispensePrescriptionRequest = Request<PrescriptionUuidParam, {}, any, {}>
export type CancelPrescriptionRequest = Request<PrescriptionUuidParam, {}, {}, {}>

export interface PrescriptionDetailResponse {
  uuid: string
  medicineName: string
  frequency: string | null
  duration: string | null
  qty: number
  dispensedQty: number
  notes: string | null
  status: PrescriptionDetailStatus
  medicine: { uuid: string; name: string; unit: string } | null
}

export interface PrescriptionResponse {
  uuid: string
  prescriptionNumber: string | null
  prescribedAt: Date
  notes: string | null
  status: PrescriptionStatus
  createdAt: Date
  updatedAt: Date
  customer: { uuid: string; name: string }
  doctor: { uuid: string; name: string; licenseNumber: string | null; clinicName: string | null } | null
  sale: { uuid: string; saleNumber: string } | null
  details: PrescriptionDetailResponse[]
}

export interface PrescriptionListItem {
  uuid: string
  prescriptionNumber: string | null
  prescribedAt: Date
  status: PrescriptionStatus
  createdAt: Date
  customer: { uuid: string; name: string }
  doctor: { uuid: string; name: string; licenseNumber: string | null } | null
}
