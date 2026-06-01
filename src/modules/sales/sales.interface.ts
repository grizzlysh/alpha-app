import { Request } from 'express'
import { ParamsDictionary } from 'express-serve-static-core'
import { SaleStatus, SaleType, PaymentStatus, PaymentMethod } from '@prisma/client'

// ── Query/Param/Body Types ────────────────────────────

export interface SaleQueryParams {
  search?: string
  status?: SaleStatus
  saleType?: SaleType
  paymentStatus?: PaymentStatus
  customerUuid?: string
  dateFrom?: string
  dateTo?: string
  sortBy?: 'saleNumber' | 'soldAt' | 'totalAmount'
  sortOrder?: 'asc' | 'desc'
  page?: string
  limit?: string
}

export interface SaleUuidParam extends ParamsDictionary {
  sale_uuid: string
}

export interface CreateSaleDetailBody {
  stockDetailUuid: string
  quantityPieces: number
  isFefoOverride?: boolean
}

export interface CreateSaleBody {
  customerUuid?: string
  saleType?: SaleType
  description?: string
  details: CreateSaleDetailBody[]
}

export interface CancelSaleBody {
  description: string
}

export interface AddPaymentBody {
  amount: number
  paymentMethod: PaymentMethod
  paymentDate: string
  description?: string
}

// ── Typed Request Aliases ─────────────────────────────

export type GetSalesRequest = Request<
  {},
  {},
  {},
  SaleQueryParams
>

export type GetSaleRequest = Request<
  SaleUuidParam,
  {}, {}, {}
>

export type CreateSaleRequest = Request<
  {},
  {},
  CreateSaleBody,
  {}
>

export type CancelSaleRequest = Request<
  SaleUuidParam,
  {},
  CancelSaleBody,
  {}
>

export type AddPaymentRequest = Request<
  SaleUuidParam,
  {},
  AddPaymentBody,
  {}
>

// ── Response Types ────────────────────────────────────

export interface SaleDetailResponse {
  uuid: string
  quantityPieces: number
  quantityBox: number
  sellingPrice: number
  discount: number
  totalAmount: number
  isFefoOverride: boolean
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

export interface SalePaymentHistoryResponse {
  uuid: string
  amount: number
  paymentMethod: PaymentMethod
  paymentDate: Date
  description: string | null
}

export interface SalePaymentResponse {
  uuid: string
  totalAmount: number
  paidAmount: number
  paymentStatus: PaymentStatus
  history: SalePaymentHistoryResponse[]
}

export interface SaleResponse {
  uuid: string
  saleNumber: string
  saleType: SaleType
  status: SaleStatus
  totalAmount: number
  paidAmount: number
  taxPercentage: number
  taxAmount: number
  dueDate: Date | null
  description: string | null
  soldAt: Date
  createdAt: Date
  customer: {
    uuid: string
    name: string
    isWalkIn: boolean
  }
  details: SaleDetailResponse[]
  payment: SalePaymentResponse | null
}