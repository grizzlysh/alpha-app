import { Request } from 'express'
import { ParamsDictionary } from 'express-serve-static-core'
import { RecordStatus, PharmacyCategory } from '@prisma/client'

// ── Query/Param/Body Types ────────────────────────────

export interface PharmacyQueryParams {
  search?: string
  status?: RecordStatus
  category?: PharmacyCategory
  sortBy?: 'name' | 'code' | 'createdAt'
  sortOrder?: 'asc' | 'desc'
  page?: string
  limit?: string
}

export interface PharmacyUuidParam extends ParamsDictionary {
  pharmacy_uuid: string
}

export interface CreatePharmacyBody {
  name: string
  code: string
  category: PharmacyCategory
  phone: string
  address: string
  location: string
  email?: string
}

export interface UpdatePharmacyBody {
  name?: string
  code?: string
  category?: PharmacyCategory
  phone?: string
  address?: string
  location?: string
  email?: string
  status?: RecordStatus
}

// ── Typed Request Aliases ─────────────────────────────

export type GetPharmaciesRequest = Request<
  {},
  {},
  {},
  PharmacyQueryParams
>

export type GetPharmacyRequest = Request<
  PharmacyUuidParam,
  {}, {}, {}
>

export type CreatePharmacyRequest = Request<
  {},
  {},
  CreatePharmacyBody,
  {}
>

export type UpdatePharmacyRequest = Request<
  PharmacyUuidParam,
  {},
  UpdatePharmacyBody,
  {}
>

export type DeletePharmacyRequest = Request<
  PharmacyUuidParam,
  {}, {}, {}
>

// ── Business License Params/Types ─────────────────────

export interface BusinessLicenseUuidParam extends ParamsDictionary {
  pharmacy_uuid: string
  license_uuid: string
}

export interface BusinessLicenseQueryParams {
  status?: RecordStatus
  sortBy?: 'licenseNumber' | 'validFrom' | 'validUntil' | 'createdAt'
  sortOrder?: 'asc' | 'desc'
  page?: string
  limit?: string
}

export interface CreateBusinessLicenseBody {
  licenseNumber: string
  validFrom: string
  validUntil: string
}

export interface UpdateBusinessLicenseBody {
  licenseNumber?: string
  validFrom?: string
  validUntil?: string
  status?: RecordStatus
}

export type GetBusinessLicensesRequest = Request<PharmacyUuidParam, {}, {}, BusinessLicenseQueryParams>
export type GetBusinessLicenseRequest = Request<BusinessLicenseUuidParam, {}, {}, {}>
export type CreateBusinessLicenseRequest = Request<PharmacyUuidParam, {}, CreateBusinessLicenseBody, {}>
export type UpdateBusinessLicenseRequest = Request<BusinessLicenseUuidParam, {}, UpdateBusinessLicenseBody, {}>
export type DeleteBusinessLicenseRequest = Request<BusinessLicenseUuidParam, {}, {}, {}>

// ── Response Types ────────────────────────────────────

export interface BusinessLicenseItem {
  uuid: string
  pharmacyUuid: string
  licenseNumber: string
  validFrom: Date
  validUntil: Date
  status: RecordStatus
  createdAt: Date
  updatedAt: Date
}

export interface PharmacyDdlItem {
  uuid: string
  name: string
  code: string
}

export interface ActiveBusinessLicense {
  uuid: string
  licenseNumber: string
  validFrom: Date
  validUntil: Date
  status: RecordStatus
}

export interface PharmacistInCharge {
  placementUuid: string
  user: { uuid: string; name: string }
  activeLicense: ActiveBusinessLicense | null
}

export interface PharmacyResponse {
  uuid: string
  name: string
  code: string
  category: PharmacyCategory
  phone: string
  address: string
  location: string
  email: string | null
  status: RecordStatus
  activeLicense: ActiveBusinessLicense | null
  pharmacistInCharge: PharmacistInCharge | null
  createdAt: Date
  updatedAt: Date
}