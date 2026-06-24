import { Request } from 'express'
import { RecordStatus } from '@prisma/client'
import { ParamsDictionary } from 'express-serve-static-core'

// ── Params ────────────────────────────────────────────────

export interface CabinetUuidParam extends ParamsDictionary {
  cabinet_uuid: string
}

export interface ShelfUuidParam extends ParamsDictionary {
  shelf_uuid: string
}

export interface CabinetShelfParam extends ParamsDictionary {
  cabinet_uuid: string
  shelf_uuid: string
}

export interface CabinetShelfBinParam extends ParamsDictionary {
  cabinet_uuid: string
  shelf_uuid: string
  bin_uuid: string
}

// ── Query ─────────────────────────────────────────────────

export interface StorageQueryParams {
  search?: string
  status?: RecordStatus
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: string
  limit?: string
}

// ── Request aliases ───────────────────────────────────────

export type ListCabinetsRequest = Request<{}, {}, {}, StorageQueryParams>
export type GetCabinetRequest = Request<CabinetUuidParam, {}, {}, {}>
export type CreateCabinetRequest = Request<{}, {}, any, {}>
export type UpdateCabinetRequest = Request<CabinetUuidParam, {}, any, {}>
export type DeleteCabinetRequest = Request<CabinetUuidParam, {}, {}, {}>

export type ListShelvesRequest = Request<CabinetUuidParam, {}, {}, StorageQueryParams>
export type GetShelfRequest = Request<ShelfUuidParam, {}, {}, {}>
export type CreateShelfRequest = Request<CabinetUuidParam, {}, any, {}>
export type UpdateShelfRequest = Request<ShelfUuidParam, {}, any, {}>
export type DeleteShelfRequest = Request<ShelfUuidParam, {}, {}, {}>

export type ListBinsRequest = Request<CabinetShelfParam, {}, {}, StorageQueryParams>
export type GetBinRequest = Request<CabinetShelfBinParam, {}, {}, {}>
export type CreateBinRequest = Request<CabinetShelfParam, {}, any, {}>
export type UpdateBinRequest = Request<CabinetShelfBinParam, {}, any, {}>
export type DeleteBinRequest = Request<CabinetShelfBinParam, {}, {}, {}>

// ── Response types ────────────────────────────────────────

export interface CabinetResponse {
  uuid: string
  name: string
  code: string
  description: string | null
  status: RecordStatus
  createdAt: Date
  updatedAt: Date
}

export interface ShelfResponse {
  uuid: string
  name: string
  code: string
  level: number | null
  description: string | null
  status: RecordStatus
  createdAt: Date
  updatedAt: Date
}

export interface BinResponse {
  uuid: string
  name: string
  code: string
  description: string | null
  status: RecordStatus
  createdAt: Date
  updatedAt: Date
}

