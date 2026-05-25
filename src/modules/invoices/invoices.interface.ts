import { Request } from 'express'
import { ParamsDictionary } from 'express-serve-static-core'
import { PaymentStatus } from '@prisma/client'

// ── Query/Param/Body Types ────────────────────────────

export interface InvoiceQueryParams {
  search?: string
  paymentStatus?: PaymentStatus
  distributorUuid?: string
  purchaseOrderUuid?: string
  dateFrom?: string
  dateTo?: string
  sortBy?: 'invoiceDate' | 'createdAt' | 'totalAmount'
  sortOrder?: 'asc' | 'desc'
  page?: string
  limit?: string
}

export interface InvoiceUuidParam extends ParamsDictionary {
  invoice_uuid: string
}

export interface CreateInvoiceDetailBody {
  medicineUuid: string
  batchNumber: string
  expiryDate: string
  quantityBox: number
  quantityPerBox: number
  quantityPieces: number
  price: number
  discountPercentage?: number
}

export interface CreateInvoiceBody {
  distributorUuid: string
  purchaseOrderUuid?: string
  signedByUuid?: string
  invoiceNumber: string
  invoiceDate: string
  dueDate?: string
  description?: string
  details: CreateInvoiceDetailBody[]
}

// ── Typed Request Aliases ─────────────────────────────

export type GetInvoicesRequest = Request<
  {},
  {},
  {},
  InvoiceQueryParams
>

export type GetInvoiceRequest = Request<
  InvoiceUuidParam,
  {}, {}, {}
>

export type CreateInvoiceRequest = Request<
  {},
  {},
  CreateInvoiceBody,
  {}
>

export type DeleteInvoiceRequest = Request<
  InvoiceUuidParam,
  {}, {}, {}
>

// ── Response Types ────────────────────────────────────

export interface InvoiceDetailResponse {
  uuid: string
  batchNumber: string
  expiryDate: Date
  quantityBox: number
  quantityPerBox: number
  quantityPieces: number
  price: number
  discountPercentage: number
  discountAmount: number
  finalPrice: number
  totalAmount: number
  medicine: {
    uuid: string
    name: string
    unit: string
  }
}

export interface InvoiceResponse {
  uuid: string
  invoiceNumber: string
  invoiceDate: Date
  dueDate: Date | null
  totalAmount: number
  paidAmount: number
  paymentStatus: PaymentStatus
  description: string | null
  createdAt: Date
  distributor: {
    uuid: string
    name: string
  }
  purchaseOrder: {
    uuid: string
    orderNumber: string
  } | null
  signedBy: {
    uuid: string
    name: string
    position: {
      name: string
      signAuthority: string
    }
  } | null
  details: InvoiceDetailResponse[]
}