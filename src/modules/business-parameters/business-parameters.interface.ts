import { Request } from 'express'
import { ParamsDictionary } from 'express-serve-static-core'

// ── Query/Param/Body Types ────────────────────────────

export interface BusinessParameterQueryParams {
  search?: string
  pharmacyUuid?: string
  sortBy?: 'key' | 'createdAt'
  sortOrder?: 'asc' | 'desc'
  page?: string
  limit?: string
}

export interface BusinessParameterUuidParam extends ParamsDictionary {
  business_parameter_uuid: string
}

export interface UpdateBusinessParameterBody {
  value: string
  description?: string
}

// ── Typed Request Aliases ─────────────────────────────

export type GetBusinessParametersRequest = Request<
  {},
  {},
  {},
  BusinessParameterQueryParams
>

export type GetBusinessParameterRequest = Request<
  BusinessParameterUuidParam,
  {}, {}, {}
>

export type UpdateBusinessParameterRequest = Request<
  BusinessParameterUuidParam,
  {},
  UpdateBusinessParameterBody,
  {}
>

// ── Response Types ────────────────────────────────────

export interface BusinessParameterResponse {
  uuid: string
  key: string
  value: string
  description: string | null
  createdAt: Date
  updatedAt: Date
}