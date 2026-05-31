import { Request } from 'express'
import { RecordStatus } from '@prisma/client'
import { ParamsDictionary } from 'express-serve-static-core'
// ── Query/Param/Body Types ────────────────────────────

export interface DistributorQueryParams {
  search?: string
  status?: RecordStatus
  sortBy?: 'name' | 'createdAt'
  sortOrder?: 'asc' | 'desc'
  page?: string
  limit?: string
}

export interface DistributorUuidParam extends ParamsDictionary {
  distributor_uuid: string
}

export interface CreateDistributorBody {
  name: string
  phone: string
  email?: string
  address?: string
  contactPerson?: string
  permitNumber?: string
  description?: string
}

export interface UpdateDistributorBody {
  name?: string
  phone?: string
  email?: string
  address?: string
  contactPerson?: string
  permitNumber?: string
  description?: string
  status?: RecordStatus
}

// ── Typed Request Aliases ─────────────────────────────

export type GetDistributorsRequest = Request<
  {},
  {},
  {},
  DistributorQueryParams
>

export type GetDistributorRequest = Request<
  DistributorUuidParam,
  {}, {}, {}
>

export type CreateDistributorRequest = Request<
  {},
  {},
  CreateDistributorBody,
  {}
>

export type UpdateDistributorRequest = Request<
  DistributorUuidParam,
  {},
  UpdateDistributorBody,
  {}
>

export type DeleteDistributorRequest = Request<
  DistributorUuidParam,
  {}, {}, {}
>

// ── Response Types ────────────────────────────────────

export interface DistributorResponse {
  uuid: string
  name: string
  phone: string
  email: string | null
  address: string | null
  contactPerson: string | null
  permitNumber: string | null
  description: string | null
  status: RecordStatus
  createdAt: Date
  updatedAt: Date
}

export interface DistributorDropdownItem {
  uuid: string
  name: string
}