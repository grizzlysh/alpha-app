import { Request } from 'express'
import { ParamsDictionary } from 'express-serve-static-core'
import { StockDisposalStatus, DisposalReason } from '@prisma/client'

// ── Query/Param/Body Types ────────────────────────────

export interface StockDisposalQueryParams {
  search?: string
  status?: StockDisposalStatus
  dateFrom?: string
  dateTo?: string
  sortBy?: 'disposalNumber' | 'createdAt' | 'disposedAt'
  sortOrder?: 'asc' | 'desc'
  page?: string
  limit?: string
}

export interface StockDisposalUuidParam extends ParamsDictionary {
  stock_disposal_uuid: string
}

export interface CreateStockDisposalDetailBody {
  stockDetailUuid: string
  quantityPieces: number
  reason: DisposalReason
}

export interface CreateStockDisposalBody {
  signedByUuid?: string
  description?: string
  details: CreateStockDisposalDetailBody[]
}

export interface UpdateStockDisposalBody {
  signedByUuid?: string
  description?: string
  details?: CreateStockDisposalDetailBody[]
}

export interface CancelStockDisposalBody {
  description: string
}

// ── Typed Request Aliases ─────────────────────────────

export type GetStockDisposalsRequest = Request<
  {},
  {},
  {},
  StockDisposalQueryParams
>

export type GetStockDisposalRequest = Request<
  StockDisposalUuidParam,
  {}, {}, {}
>

export type CreateStockDisposalRequest = Request<
  {},
  {},
  CreateStockDisposalBody,
  {}
>

export type UpdateStockDisposalRequest = Request<
  StockDisposalUuidParam,
  {},
  UpdateStockDisposalBody,
  {}
>

export type CompleteStockDisposalRequest = Request<
  StockDisposalUuidParam,
  {}, {}, {}
>

export type CancelStockDisposalRequest = Request<
  StockDisposalUuidParam,
  {},
  CancelStockDisposalBody,
  {}
>

export type DeleteStockDisposalRequest = Request<
  StockDisposalUuidParam,
  {}, {}, {}
>

// ── Response Types ────────────────────────────────────

export interface StockDisposalDetailResponse {
  uuid: string
  quantityPieces: number
  quantityBox: number
  reason: DisposalReason
  medicine: {
    uuid: string
    name: string
    unit: string
  }
  stockDetail: {
    uuid: string
    batchNumber: string
    expiryDate: Date
  }
}

export interface StockDisposalResponse {
  uuid: string
  disposalNumber: string
  status: StockDisposalStatus
  description: string | null
  cancellationReason: string | null
  disposedAt: Date | null
  createdAt: Date
  updatedAt: Date
  signedBy: {
    uuid: string
    name: string
  } | null
  details: StockDisposalDetailResponse[]
}