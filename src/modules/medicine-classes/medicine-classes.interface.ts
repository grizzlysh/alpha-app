import { Request } from 'express'
import { ParamsDictionary } from 'express-serve-static-core'
import { RecordStatus } from '@prisma/client'

// ── Query/Param/Body Types ────────────────────────────

export interface MedicineClassQueryParams {
  search?: string
  status?: RecordStatus
  sortBy?: 'name' | 'createdAt'
  sortOrder?: 'asc' | 'desc'
  page?: string
  limit?: string
}

export interface MedicineClassUuidParam extends ParamsDictionary {
  medicine_class_uuid: string
}

export interface CreateMedicineClassBody {
  name: string
  status: RecordStatus
}

export interface UpdateMedicineClassBody {
  name?: string
  status?: RecordStatus
}

// ── Typed Request Aliases ─────────────────────────────

export type GetMedicineClassesRequest = Request<
  {},
  {},
  {},
  MedicineClassQueryParams
>

export type GetMedicineClassRequest = Request<
  MedicineClassUuidParam,
  {}, {}, {}
>

export type CreateMedicineClassRequest = Request<
  {},
  {},
  CreateMedicineClassBody,
  {}
>

export type UpdateMedicineClassRequest = Request<
  MedicineClassUuidParam,
  {},
  UpdateMedicineClassBody,
  {}
>

export type DeleteMedicineClassRequest = Request<
  MedicineClassUuidParam,
  {}, {}, {}
>

// ── Response Types ────────────────────────────────────

export interface MedicineClassResponse {
  uuid: string
  name: string
  status: RecordStatus
  medicineCount: number
  createdAt: Date
  updatedAt: Date
}

export interface MedicineClassDropdownItem {
  uuid: string
  name: string
}