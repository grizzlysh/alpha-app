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
    type: { name: string; requiredPrescription: boolean }
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
    type: { name: string; requiredPrescription: boolean }
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

/** One line of a batch's stock card: a movement with its document and balance. */
export interface StockCardLine {
  date: Date
  type: 'IN' | 'OUT'
  reason: string
  /** Invoice / sale / return / disposal number; null for adjustments. */
  documentNumber: string | null
  /** Distributor, customer or the adjustment note. */
  party: string | null
  quantity: number
  balance: number
}

/** Everything a printed stock card or batch label needs. */
export interface StockCardResponse {
  pharmacy: { name: string; code: string }
  medicine: {
    uuid: string
    name: string
    unit: string
    barcode: string | null
    shape: string
    type: string
    isControlled: boolean
    requiredPrescription: boolean
    therapeuticClass: string
  }
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
  sellingPrice: number
  /** Balance before the first recorded movement (stock brought in before movements were logged). */
  openingBalance: number
  lines: StockCardLine[]
}
