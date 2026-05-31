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
  code?: string           // auto-generated if not provided
  category: PharmacyCategory
  permitNumber: string
  ownerUuid: string
  phone: string
  address: string
  email?: string
}

export interface UpdatePharmacyBody {
  name?: string
  code?: string
  category?: PharmacyCategory
  permitNumber?: string
  phone?: string
  address?: string
  email?: string
  status?: RecordStatus
}

export interface UpdatePharmacyOwnerBody {
  ownerUuid: string
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

export type UpdatePharmacyOwnerRequest = Request<
  PharmacyUuidParam,
  {},
  UpdatePharmacyOwnerBody,
  {}
>

export type DeletePharmacyRequest = Request<
  PharmacyUuidParam,
  {}, {}, {}
>

// ── Response Types ────────────────────────────────────

export interface PharmacyOwnerResponse {
  uuid: string
  name: string
  email: string
}

export interface PharmacyResponse {
  uuid: string
  name: string
  code: string
  category: PharmacyCategory
  permitNumber: string | null
  phone: string
  address: string
  email: string | null
  status: RecordStatus
  owner: PharmacyOwnerResponse
  createdAt: Date
  updatedAt: Date
}