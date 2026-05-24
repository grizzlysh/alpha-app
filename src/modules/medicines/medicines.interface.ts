import { Request } from 'express'
import { RecordStatus } from '@prisma/client'
import { ParamsDictionary } from 'express-serve-static-core'

// ── Query/Param/Body Types ────────────────────────────

export interface MedicineQueryParams {
  search?: string
  shapeId?: string
  typeId?: string
  medicineClassId?: string
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
  shapeId: number
  typeId: number
  medicineClassId: number
  unit: string
  ingredients: string[]
}

export interface UpdateMedicineBody {
  name?: string
  shapeId?: number
  typeId?: number
  medicineClassId?: number
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
  shape: MedicineShapeResponse
  type: MedicineTypeResponse
  medicineClass: MedicineClassResponse
  ingredients: MedicineIngredientResponse[]
  createdAt: Date
  updatedAt: Date
}