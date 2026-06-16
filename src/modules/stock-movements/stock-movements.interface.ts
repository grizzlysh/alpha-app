import { Request } from 'express'
import { ParamsDictionary } from 'express-serve-static-core'

// ── Request Types ─────────────────────────────────────────────

export type GetStockMovementsRequest = Request<
  ParamsDictionary,
  {},
  {},
  {
    medicineUuid?: string
    type?: string
    reason?: string
    dateFrom?: string
    dateTo?: string
    sortOrder?: string
    page?: string
    limit?: string
  }
>
export type GetStockMovementRequest = Request<{ stock_movement_uuid: string }>

// ── Response Types ────────────────────────────────────────────

export interface StockMovementReference {
  uuid: string
  number: string
}

export interface StockMovementListItem {
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
    unit: string
  }
  stockDetail: {
    uuid: string
    batchNumber: string
  }
  reference: StockMovementReference | null
}

export interface StockMovementDetail extends StockMovementListItem {
  stock: { uuid: string }
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
  createdByUser: { name: string } | null
}
