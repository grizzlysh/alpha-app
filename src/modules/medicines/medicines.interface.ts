import { RecordStatus } from '@prisma/client'
import { Request } from 'express'

// ── Request Types ─────────────────────────────────────

export interface CreateMedicineRequest {
  name: string
  shapeId: number
  typeId: number
  medicineClassId: number
  unit: string
  ingredients: string[]
}

export interface UpdateMedicineRequest {
  name?: string
  shapeId?: number
  typeId?: number
  medicineClassId?: number
  unit?: string
  ingredients?: string[]
  status?: RecordStatus
}

export interface GetMedicineRequest extends Request {
  params : {
    medicine_uuid: string
  }
}

export interface GetMedicineByUuidRequest extends Request {
  params : {
    medicine_uuid: string
  }
}

export interface UpdateMedicineRequest extends Request {
  params : {
    medicine_uuid: string
  }
}

export interface DeleteMedicineRequest extends Request {
  params : {
    medicine_uuid: string
  }
}

export interface GetMedicinesRequest extends Request{
  query: {
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
}

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