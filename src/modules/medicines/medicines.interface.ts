import { Request } from 'express'
import { RecordStatus } from '@prisma/client'
import { ParamsDictionary } from 'express-serve-static-core'

// ── Query/Param/Body Types ────────────────────────────

export interface MedicineQueryParams {
  search?: string
  medicineShapeUuid?: string
  medicineTypeUuid?: string
  medicineClassUuid?: string
  status?: RecordStatus
  sortBy?: 'name' | 'createdAt'
  sortOrder?: 'asc' | 'desc'
  page?: string
  limit?: string
}

export interface MedicineUuidParam extends ParamsDictionary {
  medicine_uuid: string
}

export interface CreateMedicineBody {
  name: string
  medicineShapeUuid: string
  medicineTypeUuid: string
  medicineClassUuid: string
  unit: string
  ingredients: string[]
}

export interface UpdateMedicineBody {
  name?: string
  medicineShapeUuid?: string
  medicineTypeUuid?: string
  medicineClassUuid?: string
  unit?: string
  ingredients?: string[]
  status?: RecordStatus
}

// ── Typed Request Aliases ─────────────────────────────

export type GetMedicinesRequest = Request<
  {},
  {},
  {},
  MedicineQueryParams
>

export type GetMedicineRequest = Request<
  MedicineUuidParam,
  {}, {}, {}
>

export type CreateMedicineRequest = Request<
  {},
  {},
  CreateMedicineBody,
  {}
>

export type UpdateMedicineRequest = Request<
  MedicineUuidParam,
  {},
  UpdateMedicineBody,
  {}
>

export type DeleteMedicineRequest = Request<
  MedicineUuidParam,
  {}, {}, {}
>

// ── Response Types ────────────────────────────────────

export interface MedicineIngredientResponse {
  uuid: string
  name: string
}

export interface MedicineShapeResponse {
  uuid: string
  name: string
}

export interface MedicineTypeResponse {
  uuid: string
  name: string
}

export interface MedicineClassResponse {
  uuid: string
  name: string
}

export interface MedicineResponse {
  uuid: string
  name: string
  unit: string
  status: RecordStatus
  medicineShape: MedicineShapeResponse
  medicineType: MedicineTypeResponse
  medicineClass: MedicineClassResponse
  ingredients: MedicineIngredientResponse[]
  createdAt: Date
  updatedAt: Date
}

export interface MedicineDropdownItem {
  uuid: string
  name: string
  unit: string
}