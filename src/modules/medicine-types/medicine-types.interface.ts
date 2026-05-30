import { Request } from 'express'
import { ParamsDictionary } from 'express-serve-static-core'
import { RecordStatus } from '@prisma/client'

// ── Query/Param/Body Types ────────────────────────────

export interface MedicineTypeQueryParams {
  search?: string
  status?: RecordStatus
  isGlobal?: string
  sortBy?: 'name' | 'createdAt'
  sortOrder?: 'asc' | 'desc'
  page?: string
  limit?: string
}

export interface MedicineTypeUuidParam extends ParamsDictionary {
  medicine_type_uuid: string
}

export interface CreateMedicineTypeBody {
  name: string
  status: RecordStatus
  pharmacyUuid?: string   // ← PLATFORM_ADMIN only, optional
}

export interface UpdateMedicineTypeBody {
  name?: string
  status?: RecordStatus
}

// ── Typed Request Aliases ─────────────────────────────

export type GetMedicineTypesRequest = Request<
  {},
  {},
  {},
  MedicineTypeQueryParams
>

export type GetMedicineTypeRequest = Request<
  MedicineTypeUuidParam,
  {}, {}, {}
>

export type CreateMedicineTypeRequest = Request<
  {},
  {},
  CreateMedicineTypeBody,
  {}
>

export type UpdateMedicineTypeRequest = Request<
  MedicineTypeUuidParam,
  {},
  UpdateMedicineTypeBody,
  {}
>

export type DeleteMedicineTypeRequest = Request<
  MedicineTypeUuidParam,
  {}, {}, {}
>

// ── Response Types ────────────────────────────────────

export interface MedicineTypeResponse {
  uuid: string
  name: string
  isGlobal: boolean
  status: RecordStatus
  createdAt: Date
  updatedAt: Date
}