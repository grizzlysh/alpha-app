import { Request } from 'express'
import { ParamsDictionary } from 'express-serve-static-core'
import {
  SalesReportInput,
  PurchaseReportInput,
  StockMovementReportInput,
  DisposalReportInput,
  ReturnReportInput,
} from './reports.validation'

// ── Request Types ─────────────────────────────────────────────

export type GetSalesReportRequest = Request<ParamsDictionary, {}, {}, SalesReportInput>
export type GetPurchaseReportRequest = Request<ParamsDictionary, {}, {}, PurchaseReportInput>
export type GetInventoryReportRequest = Request<ParamsDictionary, {}, {}, { expiryDays?: string }>
export type GetStockMovementReportRequest = Request<ParamsDictionary, {}, {}, StockMovementReportInput>
export type GetDisposalReportRequest = Request<ParamsDictionary, {}, {}, DisposalReportInput>
export type GetReturnReportRequest = Request<ParamsDictionary, {}, {}, ReturnReportInput>

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

export interface SalesReport {
  summary: SalesSummary
  topMedicines: SalesTopMedicine[]
  dailyRevenue: SalesDailyRevenue[]
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

export interface PurchaseReport {
  summary: PurchaseSummary
  byDistributor: PurchaseByDistributor[]
  invoiceList: PurchaseInvoiceRow[]
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

export interface InventoryReport {
  summary: InventorySummary
  stockLevels: InventoryStockLevel[]
  lowStock: InventoryStockLevel[]
  expiringSoon: InventoryExpiryAlert[]
  expired: InventoryExpiryAlert[]
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

export interface StockMovementReport {
  summary: StockMovementSummary
  movements: StockMovementRow[]
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

export interface DisposalReport {
  summary: DisposalSummary
  byReason: DisposalByReason[]
  disposals: DisposalDetailRow[]
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

export interface ReturnReport {
  summary: ReturnSummary
  byDistributor: ReturnByDistributor[]
  returns: ReturnDetailRow[]
}
