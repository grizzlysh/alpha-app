import { Request } from 'express'
import { ParamsDictionary } from 'express-serve-static-core'

// ── Request Types ─────────────────────────────────────────────

type Q = Record<string, any>

export type GetSalesSummaryRequest = Request<ParamsDictionary, {}, {}, Q>
export type GetSalesListRequest = Request<ParamsDictionary, {}, {}, Q>
export type GetSalesExportRequest = Request<ParamsDictionary, {}, {}, Q>

export type GetPurchaseSummaryRequest = Request<ParamsDictionary, {}, {}, Q>
export type GetPurchaseListRequest = Request<ParamsDictionary, {}, {}, Q>
export type GetPurchaseExportRequest = Request<ParamsDictionary, {}, {}, Q>

export type GetInventorySummaryRequest = Request<ParamsDictionary, {}, {}, Q>
export type GetInventoryListRequest = Request<ParamsDictionary, {}, {}, Q>
export type GetInventoryExportRequest = Request<ParamsDictionary, {}, {}, Q>

export type GetStockMovementSummaryRequest = Request<ParamsDictionary, {}, {}, Q>
export type GetStockMovementListRequest = Request<ParamsDictionary, {}, {}, Q>
export type GetStockMovementExportRequest = Request<ParamsDictionary, {}, {}, Q>

export type GetDisposalSummaryRequest = Request<ParamsDictionary, {}, {}, Q>
export type GetDisposalListRequest = Request<ParamsDictionary, {}, {}, Q>
export type GetDisposalExportRequest = Request<ParamsDictionary, {}, {}, Q>

export type GetReturnSummaryRequest = Request<ParamsDictionary, {}, {}, Q>
export type GetReturnListRequest = Request<ParamsDictionary, {}, {}, Q>
export type GetReturnExportRequest = Request<ParamsDictionary, {}, {}, Q>

// ── Response Types ────────────────────────────────────────────

// ── Sales ────────────────────────────────────────────────────

export interface SalesPaymentBreakdown {
  method: string
  count: number
  amount: number
}

export interface SalesTopMedicine {
  medicineUuid: string
  medicineName: string
  totalQuantityPieces: number
  totalRevenue: number
}

export interface SalesDailyRevenue {
  date: string
  revenue: number
  count: number
}

export interface SalesSummary {
  totalRevenue: number
  totalSales: number
  averageOrderValue: number
  paymentBreakdown: SalesPaymentBreakdown[]
}

export interface SalesExportRow {
  saleNumber: string
  soldAt: string
  customerName: string
  saleType: string
  status: string
  totalAmount: number
  discountPercentage: number
  discountAmount: number
  ppnAmount: number
  grandTotal: number
  paidAmount: number
  paymentStatus: string
}

// ── Purchases ────────────────────────────────────────────────

export interface PurchaseByDistributor {
  distributorUuid: string
  distributorName: string
  invoiceCount: number
  totalAmount: number
  paidAmount: number
  unpaidAmount: number
}

export interface PurchaseInvoiceRow {
  invoiceUuid: string
  invoiceNumber: string
  invoiceDate: Date
  distributorName: string
  purchaseOrderNumber: string | null
  totalAmount: number
  paidAmount: number
  paymentStatus: string
}

export interface PurchaseSummary {
  totalInvoices: number
  totalAmount: number
  paidAmount: number
  unpaidAmount: number
}

// ── Inventory ────────────────────────────────────────────────

export interface InventoryStockLevel {
  medicineUuid: string
  medicineName: string
  unit: string
  totalPieces: number
  reorderLevel: number
  isLowStock: boolean
  basePrice: number
  sellingPrice: number
}

export interface InventoryExpiryAlert {
  medicineUuid: string
  medicineName: string
  batchNumber: string
  expiryDate: Date
  daysUntilExpiry: number
  quantityPieces: number
  distributorName: string
}

export interface InventorySummary {
  totalMedicines: number
  totalStockValue: number
  lowStockCount: number
  expiredCount: number
  expiringSoonCount: number
}

// ── Stock Movements ──────────────────────────────────────────

export interface StockMovementRow {
  movementUuid: string
  createdAt: Date
  medicineName: string
  medicineUuid: string
  type: string
  reason: string
  quantity: number
  quantityBefore: number
  quantityAfter: number
  batchNumber: string
  description: string | null
  referenceNumber: string | null
}

export interface StockMovementSummary {
  totalMovements: number
  totalInQty: number
  totalOutQty: number
}

// ── Disposals ────────────────────────────────────────────────

export interface DisposalByReason {
  reason: string
  count: number
  totalQuantityPieces: number
}

export interface DisposalDetailRow {
  disposalUuid: string
  disposalNumber: string
  disposedAt: Date | null
  medicineName: string
  batchNumber: string
  quantityPieces: number
  reason: string
  status: string
}

export interface DisposalSummary {
  totalDisposals: number
  totalItems: number
  totalQuantityPieces: number
}

// ── Returns ──────────────────────────────────────────────────

export interface ReturnByDistributor {
  distributorUuid: string
  distributorName: string
  returnCount: number
  totalQuantityPieces: number
}

export interface ReturnDetailRow {
  returnUuid: string
  returnNumber: string
  returnedAt: Date | null
  distributorName: string
  medicineName: string
  batchNumber: string
  quantityPieces: number
  reason: string | null
  status: string
}

export interface ReturnSummary {
  totalReturns: number
  totalItems: number
  totalQuantityPieces: number
}
