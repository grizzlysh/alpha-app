import { Request } from 'express'
import { ParamsDictionary } from 'express-serve-static-core'

// ── Query/Param/Body Types ────────────────────────────

export interface PermissionQueryParams {
  search?: string
  module?: string
  sortBy?: 'name' | 'module' | 'createdAt'
  sortOrder?: 'asc' | 'desc'
  page?: string
  limit?: string
}

export interface PermissionUuidParam extends ParamsDictionary {
  permission_uuid: string
}

// ── Typed Request Aliases ─────────────────────────────

export type GetPermissionsRequest = Request<
  {},
  {},
  {},
  PermissionQueryParams
>

export type GetPermissionRequest = Request<
  PermissionUuidParam,
  {}, {}, {}
>

// ── Response Types ────────────────────────────────────

export interface PermissionResponse {
  uuid: string
  name: string
  module: string
  description: string | null
}

export interface PermissionGroupedResponse {
  module: string
  permissions: PermissionResponse[]
}