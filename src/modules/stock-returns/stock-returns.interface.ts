import { Request } from 'express'
import { ParamsDictionary } from 'express-serve-static-core'
import { StockReturnStatus } from '@prisma/client'

// ── Query/Param/Body Types ────────────────────────────

export interface StockReturnQueryParams {
  search?: string
  status?: StockReturnStatus
  distributorUuid?: string
  dateFrom?: string
  dateTo?: string
  sortBy?: 'returnNumber' | 'createdAt' | 'returnedAt'
  sortOrder?: 'asc' | 'desc'
  page?: string
  limit?: string
}

export interface StockReturnUuidParam extends ParamsDictionary {
  stock_return_uuid: string
}

export interface CreateStockReturnDetailBody {
  stockDetailUuid: string
  quantityPieces: number
  reason?: string
}

export interface CreateStockReturnBody {
  distributorUuid: string
  signedByUuid?: string
  description?: string
  details: CreateStockReturnDetailBody[]
}

export interface UpdateStockReturnBody {
  distributorUuid?: string
  signedByUuid?: string
  description?: string
  details?: CreateStockReturnDetailBody[]
}

export interface CancelStockReturnBody {
  description: string
}

// ── Typed Request Aliases ─────────────────────────────

export type GetStockReturnsRequest = Request<
  {},
  {},
  {},
  StockReturnQueryParams
>

export type GetStockReturnRequest = Request<
  StockReturnUuidParam,
  {}, {}, {}
>

export type CreateStockReturnRequest = Request<
  {},
  {},
  CreateStockReturnBody,
  {}
>

export type UpdateStockReturnRequest = Request<
  StockReturnUuidParam,
  {},
  UpdateStockReturnBody,
  {}
>

export type CompleteStockReturnRequest = Request<
  StockReturnUuidParam,
  {}, {}, {}
>

export type CancelStockReturnRequest = Request<
  StockReturnUuidParam,
  {},
  CancelStockReturnBody,
  {}
>

export type DeleteStockReturnRequest = Request<
  StockReturnUuidParam,
  {}, {}, {}
>

// ── Response Types ────────────────────────────────────

export interface StockReturnDetailResponse {
  uuid: string
  quantityPieces: number
  quantityBox: number
  reason: string | null
  medicine: {
    uuid: string
    name: string
    unit: string
  }
  stockDetail: {
    uuid: string
    batchNumber: string
    expiryDate: Date
    invoiceDetail: {
      uuid: string
      invoice: {
        uuid: string
        invoiceNumber: string
      }
    }
  }
}

export interface StockReturnResponse {
  uuid: string
  returnNumber: string
  status: StockReturnStatus
  description: string | null
  cancellationReason: string | null
  returnedAt: Date | null
  createdAt: Date
  updatedAt: Date
  distributor: {
    uuid: string
    name: string
  }
  signedBy: {
    uuid: string
    name: string
    position: {
      name: string
      signAuthority: string
    }
  } | null
  details: StockReturnDetailResponse[]
}