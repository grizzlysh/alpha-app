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

export interface SalePaymentHistoryUuidParam extends ParamsDictionary {
  sale_uuid: string
  history_uuid: string
}

export interface CreateSaleDetailBody {
  stockDetailUuid: string
  quantityPieces: number
  sellingPrice: number
  originalPrice: number
  discountPercentage?: number
  discountAmount?: number
  isFefoOverride?: boolean
}

export interface CreateSalePaymentBody {
  paymentMethod: PaymentMethod
  description?: string
}

export interface CreateSaleBody {
  customerUuid?: string
  saleType?: SaleType
  discountPercentage?: number
  discountAmount?: number
  ppnPercentage?: number
  ppnAmount?: number
  totalAmount: number
  grandTotal: number
  paidAmount?: number
  description?: string
  isPending?: boolean
  details: CreateSaleDetailBody[]
  payment?: CreateSalePaymentBody
}

export interface CancelSaleBody {
  description: string
}

export interface AddPaymentBody {
  paidAmount: number
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

export interface UpdateSaleBody {
  customerUuid?: string
  saleType?: SaleType
  discountPercentage?: number
  discountAmount?: number
  ppnPercentage?: number
  ppnAmount?: number
  totalAmount: number
  grandTotal: number
  description?: string
  details: CreateSaleDetailBody[]
}

export type CompleteSaleRequest = Request<
  SaleUuidParam,
  {},
  CreateSaleBody,
  {}
>

export type UpdateSaleRequest = Request<
  SaleUuidParam,
  {},
  UpdateSaleBody,
  {}
>

export type GetSalePaymentRequest = Request<
  SaleUuidParam,
  {}, {}, {}
>

export type AddPaymentRequest = Request<
  SaleUuidParam,
  {},
  AddPaymentBody,
  {}
>

export interface UpdateSalePaymentHistoryBody {
  paymentMethod?: PaymentMethod
  paymentDate?: string
  description?: string
}

export type UpdateSalePaymentHistoryRequest = Request<
  SalePaymentHistoryUuidParam,
  {},
  UpdateSalePaymentHistoryBody,
  {}
>

export type DeleteSalePaymentHistoryRequest = Request<
  SalePaymentHistoryUuidParam,
  {}, {}, {}
>

// ── Response Types ────────────────────────────────────

export interface SaleDetailResponse {
  uuid: string
  quantityPieces: number
  quantityBox: number
  sellingPrice: number
  originalPrice: number
  discountPercentage: number
  discountAmount: number
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
  discountPercentage: number
  discountAmount: number
  ppnPercentage: number
  ppnAmount: number
  grandTotal: number
  paidAmount: number
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