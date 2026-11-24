import { Request } from 'express'
import { OrderLetterKind, RecordStatus } from '@prisma/client'
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

export interface MedicineIngredientBody {
  name: string
  strength?: string | null
}

export interface CreateMedicineBody {
  /** The full name; required only for a custom name. */
  name?: string
  baseName?: string
  variant?: string | null
  isCustomName?: boolean
  orderLetterKind?: OrderLetterKind | null
  medicineShapeUuid: string
  medicineTypeUuid: string
  medicineClassUuid: string
  unit: string
  ingredients: (string | MedicineIngredientBody)[]
}

export type UpdateMedicineBody = Partial<CreateMedicineBody> & { status?: RecordStatus }

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
  strength: string | null
}

export interface MedicineShapeResponse {
  uuid: string
  name: string
}

export interface MedicineTypeResponse {
  uuid: string
  name: string
  orderLetterKind: OrderLetterKind
}

export interface MedicineClassResponse {
  uuid: string
  name: string
}

export interface MedicineResponse {
  uuid: string
  /** The name shown everywhere (built, or typed when isCustomName). */
  name: string
  baseName: string | null
  variant: string | null
  isCustomName: boolean
  /** The ingredients' strengths as shown in the name ("500/50 mg"). */
  strength: string
  /** Its own order letter kind, or null when it follows the type. */
  orderLetterKind: OrderLetterKind | null
  /** The order letter it actually goes on. */
  effectiveOrderLetterKind: OrderLetterKind
  unit: string
  barcode: string | null
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
  /** The order letter it goes on (its own, else its type's). */
  orderLetterKind: OrderLetterKind
}