import { Request } from 'express'
import { ParamsDictionary } from 'express-serve-static-core'
import { PaymentMethod, PaymentStatus } from '@prisma/client'

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

export interface InvoicePaymentHistoryUuidParam extends ParamsDictionary {
  invoice_uuid: string
  history_uuid: string
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
  dueDate: string
  receiveDate: string
  ppnPercentage?: number
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

export interface AddInvoicePaymentBody {
  amount: number
  paymentMethod: PaymentMethod
  paymentDate: string
  description?: string
}

export type DeleteInvoiceRequest = Request<
  InvoiceUuidParam,
  {}, {}, {}
>

export type GetInvoicePaymentRequest = Request<
  InvoiceUuidParam,
  {}, {}, {}
>

export type AddInvoicePaymentRequest = Request<
  InvoiceUuidParam,
  {},
  AddInvoicePaymentBody,
  {}
>

export interface UpdatePaymentHistoryBody {
  paymentMethod?: PaymentMethod
  paymentDate?: string
  description?: string
}

export type UpdatePaymentHistoryRequest = Request<
  InvoicePaymentHistoryUuidParam,
  {},
  UpdatePaymentHistoryBody,
  {}
>

export type DeletePaymentHistoryRequest = Request<
  InvoicePaymentHistoryUuidParam,
  {}, {}, {}
>

// ── Response Types ────────────────────────────────────

export interface InvoicePaymentHistoryResponse {
  uuid: string
  amount: number
  paymentMethod: PaymentMethod
  paymentDate: Date
  description: string | null
}

export interface InvoicePaymentResponse {
  uuid: string
  totalAmount: number
  paidAmount: number
  paymentStatus: PaymentStatus
  history: InvoicePaymentHistoryResponse[]
}

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
  receiveDate: Date | null
  totalAmount: number
  discountPercentage: number
  discountAmount: number
  ppnPercentage: number
  ppnAmount: number
  grandTotal: number
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
  } | null
  details: InvoiceDetailResponse[]
  payment: InvoicePaymentResponse | null
}