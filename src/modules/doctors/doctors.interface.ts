import { Request } from 'express'
import { RecordStatus } from '@prisma/client'
import { ParamsDictionary } from 'express-serve-static-core'

export interface DoctorUuidParam extends ParamsDictionary {
  doctor_uuid: string
}

export interface DoctorQueryParams {
  search?: string
  status?: RecordStatus
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: string
  limit?: string
}

export type ListDoctorsRequest = Request<{}, {}, {}, DoctorQueryParams>
export type GetDoctorRequest = Request<DoctorUuidParam, {}, {}, {}>
export type CreateDoctorRequest = Request<{}, {}, any, {}>
export type UpdateDoctorRequest = Request<DoctorUuidParam, {}, any, {}>
export type DeleteDoctorRequest = Request<DoctorUuidParam, {}, {}, {}>

export interface DoctorResponse {
  uuid: string
  name: string
  licenseNumber: string | null
  specialty: string | null
  clinicName: string | null
  phone: string | null
  status: RecordStatus
  user: { uuid: string; name: string; email: string } | null
  createdAt: Date
  updatedAt: Date
}

export interface DoctorDropdownItem {
  uuid: string
  name: string
  licenseNumber: string | null
  clinicName: string | null
}
