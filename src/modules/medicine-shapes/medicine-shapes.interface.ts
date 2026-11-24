import { Request } from 'express'
import { ParamsDictionary } from 'express-serve-static-core'
import { RecordStatus } from '@prisma/client'

// ── Query/Param/Body Types ────────────────────────────

export interface MedicineShapeQueryParams {
  search?: string
  status?: RecordStatus
  sortBy?: 'name' | 'createdAt'
  sortOrder?: 'asc' | 'desc'
  page?: string
  limit?: string
}

export interface MedicineShapeUuidParam extends ParamsDictionary {
  medicine_shape_uuid: string
}

export interface CreateMedicineShapeBody {
  name: string
  status: RecordStatus
}

export interface UpdateMedicineShapeBody {
  name?: string
  status?: RecordStatus
}

// ── Typed Request Aliases ─────────────────────────────

export type GetMedicineShapesRequest = Request<
  {},
  {},
  {},
  MedicineShapeQueryParams
>

export type GetMedicineShapeRequest = Request<
  MedicineShapeUuidParam,
  {}, {}, {}
>

export type CreateMedicineShapeRequest = Request<
  {},
  {},
  CreateMedicineShapeBody,
  {}
>

export type UpdateMedicineShapeRequest = Request<
  MedicineShapeUuidParam,
  {},
  UpdateMedicineShapeBody,
  {}
>

export type DeleteMedicineShapeRequest = Request<
  MedicineShapeUuidParam,
  {}, {}, {}
>

// ── Response Types ────────────────────────────────────

export interface MedicineShapeResponse {
  uuid: string
  name: string
  status: RecordStatus
  medicineCount: number
  createdAt: Date
  updatedAt: Date
}

export interface MedicineShapeDropdownItem {
  uuid: string
  name: string
}