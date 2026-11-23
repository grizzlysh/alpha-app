import { OrderLetterKind } from '@prisma/client'
import { Request } from 'express'
import { ParamsDictionary } from 'express-serve-static-core'

// ── Query/Param/Body Types ────────────────────────────

export interface StockDetailQueryParams {
  search?: string
}

export interface StockCatalogQueryParams {
  search?: string
  medicineTypeUuid?: string
  page?: string
  limit?: string
}

export interface StockQueryParams {
  search?: string
  isLowStock?: string
  isExpiringSoon?: string
  sortBy?: 'name' | 'totalPieces' | 'updatedAt'
  sortOrder?: 'asc' | 'desc'
  page?: string
  limit?: string
}

export interface StockMovementQueryParams {
  medicineUuid?: string
  type?: string
  reason?: string
  dateFrom?: string
  dateTo?: string
  sortOrder?: 'asc' | 'desc'
  page?: string
  limit?: string
}

export interface StockUuidParam extends ParamsDictionary {
  stock_uuid: string
}

export interface StockDetailUuidParam extends ParamsDictionary {
  stock_detail_uuid: string
}

export interface MedicineUuidParam extends ParamsDictionary {
  medicine_uuid: string
}

export interface UpdatePriceBody {
  sellingPrice: number | null
}

export interface UpdateReorderLevelBody {
  reorderLevel: number
}

export interface AdjustStockBody {
  quantity: number
  signedByUuid: string
  description: string
}

// ── Typed Request Aliases ─────────────────────────────

export type GetStockDetailsRequest = Request<
  {},
  {},
  {},
  StockDetailQueryParams
>

export type GetStockCatalogRequest = Request<
  {},
  {},
  {},
  StockCatalogQueryParams
>

export type GetStocksRequest = Request<
  {},
  {},
  {},
  StockQueryParams
>

export type GetStockRequest = Request<
  StockUuidParam,
  {}, {}, {}
>

export type GetStockMovementsRequest = Request<
  {},
  {},
  {},
  StockMovementQueryParams
>

export type UpdatePriceRequest = Request<
  StockUuidParam,
  {},
  UpdatePriceBody,
  {}
>

export type UpdateReorderLevelRequest = Request<
  StockUuidParam,
  {},
  UpdateReorderLevelBody,
  {}
>

export type AdjustStockRequest = Request<
  StockDetailUuidParam,
  {},
  AdjustStockBody,
  {}
>

export type GetCrossPharmacyStockRequest = Request<
  MedicineUuidParam,
  {}, {}, {}
>

// ── Response Types ────────────────────────────────────

export interface StockDetailSearchResponse {
  /** On a barcode scan: what the code was (a batch, a medicine, or one item of a batch). */
  scanMatch?: 'BATCH' | 'MEDICINE' | 'ITEM'
  uuid: string
  barcode: string | null
  batchNumber: string
  expiryDate: Date
  quantityPieces: number
  availablePieces: number
  quantityBox: number
  quantityPerBox: number
  distributor: { uuid: string; name: string }
  stock: {
    uuid: string
    effectiveSellingPrice: number
  }
  medicine: {
    uuid: string
    name: string
    unit: string
    /** Present on the scan / search endpoint. */
    barcode?: string | null
    shape: { name: string }
    orderLetterKind: OrderLetterKind | null
    type: { name: string; requiredPrescription: boolean; orderLetterKind: OrderLetterKind }
  }
}

export interface StockDetailResponse {
  uuid: string
  batchNumber: string
  barcode: string | null
  expiryDate: Date
  quantityPieces: number
  quantityBox: number
  quantityPerBox: number
  distributor: {
    uuid: string
    name: string
  }
}

export interface StockResponse {
  uuid: string
  totalPieces: number
  reorderLevel: number
  basePrice: number
  calculatedPrice: number
  sellingPrice: number | null
  isManualPrice: boolean
  effectiveSellingPrice: number
  isLowStock: boolean
  isCriticalStock: boolean
  medicine: {
    uuid: string
    name: string
    unit: string
    shape: { name: string }
    orderLetterKind: OrderLetterKind | null
    type: { name: string; requiredPrescription: boolean; orderLetterKind: OrderLetterKind }
    medicineClass: { name: string }
  }
  details: StockDetailResponse[]
  createdAt: Date
  updatedAt: Date
}

export interface StockAlertResponse {
  lowStock: StockResponse[]
  expiringSoon: {
    uuid: string
    batchNumber: string
    expiryDate: Date
    quantityPieces: number
    daysUntilExpiry: number
    medicine: {
      uuid: string
      name: string
      unit: string
    }
    stock: {
      uuid: string
    }
  }[]
}

export interface StockMovementResponse {
  uuid: string
  type: string
  reason: string
  quantity: number
  quantityBefore: number
  quantityAfter: number
  description: string | null
  createdAt: Date
  medicine: {
    uuid: string
    name: string
  }
  stockDetail: {
    uuid: string
    batchNumber: string
  }
  invoiceDetail: {
    uuid: string
    invoice: { invoiceNumber: string }
  } | null
  saleDetail: {
    uuid: string
    sale: { uuid: string; saleNumber: string }
  } | null
  stockReturnDetail: {
    uuid: string
    stockReturn: { uuid: string; returnNumber: string }
  } | null
  stockDisposalDetail: {
    uuid: string
    stockDisposal: { uuid: string; disposalNumber: string }
  } | null
}

export interface CrossPharmacyStockResponse {
  pharmacy: {
    uuid: string
    name: string
    code: string
  }
  totalPieces: number
  effectiveSellingPrice: number
  isLowStock: boolean
  isCriticalStock: boolean
  details: StockDetailResponse[]
}

interface StockCardMedicine {
  uuid: string
  name: string
  unit: string
  barcode: string | null
  shape: string
  type: string
  isControlled: boolean
  /** Effective order letter kind; narcotics and psychotropics go in the locked cabinet. */
  orderLetterKind: OrderLetterKind
  requiredPrescription: boolean
  therapeuticClass: string
}

/** Everything a printed batch, item or medicine label needs. */
export interface BatchLabelResponse {
  pharmacy: { name: string; code: string }
  medicine: StockCardMedicine
  batch: {
    uuid: string
    batchNumber: string
    barcode: string
    expiryDate: Date
    quantityPieces: number
    quantityPerBox: number
    distributor: string
    location: string | null
  }
  reorderLevel: number
  /** Stock of the medicine across all its batches (for the medicine label). */
  medicineTotalPieces: number
  sellingPrice: number
}

/** One day on a medicine's stock card: everything in and out that day, all batches together. */
export interface MedicineStockCardDay {
  /** yyyy-MM-dd in the pharmacy's timezone. */
  date: string
  in: number
  out: number
  /** Stock at the end of the day. */
  balance: number
  /** Invoice, return and disposal numbers of the day. */
  documents: string[]
  /** Sale lines (counted, not listed) and manual adjustments of the day. */
  sales: number
  adjustments: number
}

export interface MedicineStockCardResponse {
  pharmacy: { name: string; code: string }
  medicine: StockCardMedicine
  reorderLevel: number
  totalPieces: number
  /** Largest box size among the batches in stock (1 when unboxed). */
  quantityPerBox: number
  sellingPrice: number
  /** Batches in stock today, earliest expiry first. */
  batches: { batchNumber: string; expiryDate: Date; quantityPieces: number; location: string | null }[]
  period: { from: string; to: string }
  openingBalance: number
  closingBalance: number
  /** Movements after the period's end (so the closing balance differs from today's stock). */
  movementsAfterPeriod: number
  days: MedicineStockCardDay[]
}
