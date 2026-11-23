import { Request } from 'express'
import { ParamsDictionary } from 'express-serve-static-core'
import { OrderLetterKind, PurchaseOrderStatus } from '@prisma/client'

// ── Query/Param/Body Types ────────────────────────────

export interface PurchaseOrderQueryParams {
  search?: string
  status?: PurchaseOrderStatus
  distributorUuid?: string
  dateFrom?: string
  dateTo?: string
  sortBy?: 'orderNumber' | 'orderedAt' | 'createdAt'
  sortOrder?: 'asc' | 'desc'
  page?: string
  limit?: string
}

export interface PurchaseOrderUuidParam extends ParamsDictionary {
  purchase_order_uuid: string
}

export interface CreatePurchaseOrderBody {
  distributorUuid: string
  signedByUuid?: string
  description?: string
  details: CreatePurchaseOrderDetailBody[]
}

export interface CreatePurchaseOrderDetailBody {
  medicineUuid: string
  quantity: number
  unit: string
  description?: string
}

export interface UpdatePurchaseOrderBody {
  distributorUuid?: string
  signedByUuid?: string
  description?: string
  details?: CreatePurchaseOrderDetailBody[]
}

export interface CancelPurchaseOrderBody {
  cancellationReason: string
}

// ── Typed Request Aliases ─────────────────────────────

export type GetPurchaseOrdersRequest = Request<
  {},
  {},
  {},
  PurchaseOrderQueryParams
>

export type GetPurchaseOrderRequest = Request<
  PurchaseOrderUuidParam,
  {}, {}, {}
>

export type CreatePurchaseOrderRequest = Request<
  {},
  {},
  CreatePurchaseOrderBody,
  {}
>

export type UpdatePurchaseOrderRequest = Request<
  PurchaseOrderUuidParam,
  {},
  UpdatePurchaseOrderBody,
  {}
>

export type SubmitPurchaseOrderRequest = Request<
  PurchaseOrderUuidParam,
  {}, {}, {}
>

export type CompletePurchaseOrderRequest = Request<
  PurchaseOrderUuidParam,
  {}, {}, {}
>

export type CancelPurchaseOrderRequest = Request<
  PurchaseOrderUuidParam,
  {},
  CancelPurchaseOrderBody,
  {}
>

export type DeletePurchaseOrderRequest = Request<
  PurchaseOrderUuidParam,
  {}, {}, {}
>

// ── Response Types ────────────────────────────────────

export interface PurchaseOrderDetailResponse {
  uuid: string
  medicine: {
    uuid: string
    name: string
    unit: string
    /** For special order letters: active ingredients with strength, and the shape. */
    shape: { name: string }
    ingredients: { name: string; strength: string | null }[]
  }
  quantity: number
  unit: string
  description: string | null
}

export interface PurchaseOrderResponse {
  uuid: string
  orderNumber: string
  /** Which surat pesanan this is (from its items). */
  kind: OrderLetterKind
  status: PurchaseOrderStatus
  description: string | null
  cancellationReason: string | null
  orderedAt: Date
  createdAt: Date
  updatedAt: Date
  distributor: {
    uuid: string
    name: string
  }
  signedBy: {
    uuid: string
    name: string
  } | null
  details: PurchaseOrderDetailResponse[]
}

export interface PurchaseOrderPrintResponse {
  orderNumber: string
  orderedAt: Date
  kind: OrderLetterKind
  distributor: {
    name: string
    address: string | null
    phone: string
    permitNumber: string | null
  }
  pharmacy: {
    name: string
    address: string
    location: string
    phone: string
    businessLicenseNumber: string | null
  }
  headPharmacist: {
    name: string
    practiceLicenseNumber: string | null
  } | null
}

export interface PurchaseOrderDropdownItem {
  uuid: string
  orderNumber: string
  status: PurchaseOrderStatus
  distributorName: string
}