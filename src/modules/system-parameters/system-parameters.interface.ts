import { Request } from 'express'
import { ParamsDictionary } from 'express-serve-static-core'

// ── Query/Param/Body Types ────────────────────────────

export interface SystemParameterQueryParams {
  search?: string
  sortBy?: 'key' | 'createdAt'
  sortOrder?: 'asc' | 'desc'
  page?: string
  limit?: string
}

export interface SystemParameterUuidParam extends ParamsDictionary {
  system_parameter_uuid: string
}

export interface UpdateSystemParameterBody {
  value: string
  description?: string
}

// ── Typed Request Aliases ─────────────────────────────

export type GetSystemParametersRequest = Request<
  {},
  {},
  {},
  SystemParameterQueryParams
>

export type GetSystemParameterRequest = Request<
  SystemParameterUuidParam,
  {}, {}, {}
>

export type UpdateSystemParameterRequest = Request<
  SystemParameterUuidParam,
  {},
  UpdateSystemParameterBody,
  {}
>

// ── Response Types ────────────────────────────────────

export interface SystemParameterResponse {
  uuid: string
  key: string
  value: string
  description: string | null
  createdAt: Date
  updatedAt: Date
}