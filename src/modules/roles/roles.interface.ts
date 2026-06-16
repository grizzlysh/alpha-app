import { Request } from 'express'
import { ParamsDictionary } from 'express-serve-static-core'
import { AppRole, RecordStatus } from '@prisma/client'
import { PermissionResponse } from '@modules/permissions/permissions.interface'

// ── Query/Param/Body Types ────────────────────────────

export interface RoleQueryParams {
  search?: string
  status?: RecordStatus
  isGlobal?: string
  sortBy?: 'name' | 'createdAt'
  sortOrder?: 'asc' | 'desc'
  page?: string
  limit?: string
}

export interface RoleUuidParam extends ParamsDictionary {
  role_uuid: string
}

export interface CreateRoleBody {
  name: string
  type: AppRole
  requiresLicense?: boolean
  pharmacyUuid?: string   // PLATFORM_ADMIN only, null = global
}

export interface UpdateRoleBody {
  name?: string
  requiresLicense?: boolean
  status?: RecordStatus
}

export interface SetRolePermissionsBody {
  permissionUuids: string[]
}

// ── Typed Request Aliases ─────────────────────────────

export type GetRolesRequest = Request<
  {},
  {},
  {},
  RoleQueryParams
>

export type GetRoleRequest = Request<
  RoleUuidParam,
  {}, {}, {}
>

export type CreateRoleRequest = Request<
  {},
  {},
  CreateRoleBody,
  {}
>

export type UpdateRoleRequest = Request<
  RoleUuidParam,
  {},
  UpdateRoleBody,
  {}
>

export type SetRolePermissionsRequest = Request<
  RoleUuidParam,
  {},
  SetRolePermissionsBody,
  {}
>

export type DeleteRoleRequest = Request<
  RoleUuidParam,
  {}, {}, {}
>

// ── Response Types ────────────────────────────────────

export interface RoleResponse {
  uuid: string
  name: string
  type: AppRole
  isGlobal: boolean
  requiresLicense: boolean
  status: RecordStatus
  permissionCount: number
  createdAt: Date
  updatedAt: Date
}

export interface RoleDetailResponse extends RoleResponse {
  permissions: PermissionResponse[]
}

export interface RoleDdlItem {
  uuid: string
  name: string
  type: AppRole
  isGlobal: boolean
  requiresLicense: boolean
}