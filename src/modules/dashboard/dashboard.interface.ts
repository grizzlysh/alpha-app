import { Request } from 'express'

// ── Query/Param Types ─────────────────────────────

export interface AdvancedDashboardQueryParams {
  days?: string
}

export type GetDashboardRequest = Request<{}, {}, {}, {}>
export type GetAdvancedDashboardRequest = Request<{}, {}, {}, AdvancedDashboardQueryParams>

// ── Section 1: Daily Operations ───────────────────

export interface KpiDelta {
  today: number
  yesterday: number
  delta: number
  deltaPercent: number | null
}

export interface RecentTransaction {
  uuid: string
  saleNumber: string
  customerName: string
  totalAmount: number
  soldAt: Date
  isRx: boolean
}

export interface DailyOpsResponse {
  revenue: KpiDelta
  transactionCount: KpiDelta
  avgTransactionValue: KpiDelta
  otcVsRx: {
    otcCount: number
    rxCount: number
    otcRevenue: number
    rxRevenue: number
  }
  recentTransactions: RecentTransaction[]
}

// ── Section 2: Sales Trend ────────────────────────

export interface SalesTrendDay {
  date: string
  revenue: number
  transactionCount: number
}

export interface SalesTrendResponse {
  period: number
  data: SalesTrendDay[]
}

// ── Section 3: Inventory Alerts ───────────────────

export type ExpiryTier = 'red' | 'amber' | 'yellow'

export interface RestockItem {
  uuid: string
  medicineName: string
  totalPieces: number
  reorderLevel: number
  isOutOfStock: boolean
}

export interface ExpiringBatch {
  uuid: string
  batchNumber: string
  medicineName: string
  expiryDate: Date
  daysUntilExpiry: number
  quantityPieces: number
  tier: ExpiryTier
}

export interface InventoryAlertsResponse {
  restockNeeded: RestockItem[]     // out-of-stock + below reorder level, sorted worst first
  expiringSoon: ExpiringBatch[]
}

// ── Section 4: Top Products ───────────────────────

export interface TopProductItem {
  medicineUuid: string
  medicineName: string
  totalQty: number
  totalRevenue: number
}

export interface TopProductsResponse {
  byQuantity: TopProductItem[]
  byRevenue: TopProductItem[]
}

// ── Section 5: Purchasing Status ──────────────────

export interface OpenPurchaseOrderItem {
  uuid: string
  orderNumber: string
  distributorName: string
  orderedAt: Date
  itemCount: number
}

export interface UnpaidInvoiceByDistributor {
  distributorUuid: string
  distributorName: string
  invoiceCount: number
  totalOutstanding: number
  oldestDueDate: Date | null
}

export interface UnpaidInvoiceSummary {
  totalCount: number
  totalOutstanding: number
  byDistributor: UnpaidInvoiceByDistributor[]
}

// ── Section 6: Compliance & Licenses ─────────────

export type LicenseStatus = 'valid' | 'expiring_soon' | 'expired'

export interface LicenseItem {
  uuid: string
  licenseNumber: string
  validUntil: Date
  daysUntilExpiry: number
  status: LicenseStatus
}

export interface PracticeLicenseItem {
  userName: string
  roleType: string
  license: LicenseItem
}

export interface ComplianceResponse {
  businessLicenses: LicenseItem[]
  practiceLicenses: PracticeLicenseItem[]
}

// ── Section 7: Inventory Asset ────────────────────

export interface InventoryAssetResponse {
  totalAsset: number
  prevQuarterEndAsset: number
  prevQuarterEndDate: string   // ISO date string, e.g. "2026-03-31"
  delta: number
  deltaPercent: number
}

// ── Section 8: Revenue & Profit ──────────────────

export interface RevenueProfitMonth {
  year: number
  month: number
  label: string
  revenue: number        // grand total including PPN
  grossProfit: number
  marginPercent: number | null
}

export interface RevenueProfitMtdMetric {
  value: number
  prevValue: number
  delta: number
  deltaPercent: number | null
}

export interface RevenueProfitResponse {
  last6Months: RevenueProfitMonth[]
  mtd: {
    revenue: RevenueProfitMtdMetric & { transactionCount: number }
    grossProfit: RevenueProfitMtdMetric & { marginPercent: number | null }
  }
}

// ── Section 9: Purchase Spend ─────────────────────

export interface PurchaseSpendMonth {
  year: number
  month: number
  label: string
  spend: number
  invoiceCount: number
}

export interface PurchaseSpendResponse {
  last6Months: PurchaseSpendMonth[]
  mtd: {
    value: number
    prevValue: number
    delta: number
    deltaPercent: number | null
    invoiceCount: number
  }
}

// ── Section 11: Slow Movers ───────────────────────

export interface SlowMoverItem {
  medicineUuid: string
  medicineName: string
  totalPieces: number
  lastMovementAt: Date | null
  daysSinceLastMovement: number | null  // null = never sold
  estimatedValue: number
}

export interface SlowMoversResponse {
  threshold: number   // days used as cutoff
  items: SlowMoverItem[]
}

// ── Section 12: Payment Schedule ─────────────────

export interface ScheduledPaymentItem {
  invoiceUuid: string
  invoiceNumber: string
  distributorName: string
  dueDate: Date | null
  outstanding: number
  isOverdue: boolean
  daysUntilDue: number | null  // negative = overdue
}

export interface PaymentScheduleResponse {
  upcoming: ScheduledPaymentItem[]
  overdue: ScheduledPaymentItem[]
  totalUpcoming: number
  totalOverdue: number
}

// ── Section 13: Credit Sales Outstanding ─────────

export interface CreditSaleItem {
  saleUuid: string
  saleNumber: string
  customerName: string
  soldAt: Date
  grandTotal: number
  paidAmount: number
  outstanding: number
  daysSinceSale: number
}

export interface CreditSalesOutstandingResponse {
  items: CreditSaleItem[]
  totalOutstanding: number
  totalCount: number
}

// ── Section 14: Stock Runway ──────────────────────

export type StockRunwayStatus = 'critical' | 'low' | 'adequate' | 'overstocked'

export interface StockRunwayItem {
  medicineUuid: string
  medicineName: string
  currentPieces: number
  avgDailySales: number        // pieces/day over last 30 days
  daysRemaining: number | null // null when avgDailySales = 0
  status: StockRunwayStatus
}

export interface StockRunwayResponse {
  items: StockRunwayItem[]
}

// ── Dashboard Responses ───────────────────────────

export interface DashboardResponse {
  dailyOps: DailyOpsResponse
  inventoryAlerts: InventoryAlertsResponse
  topProducts: TopProductsResponse
  inventoryAsset: InventoryAssetResponse
  slowMovers: SlowMoversResponse
  stockRunway: StockRunwayResponse
}

export interface AdvancedDashboardResponse {
  salesTrend: SalesTrendResponse
  openPurchaseOrders: OpenPurchaseOrderItem[]
  unpaidInvoices: UnpaidInvoiceSummary
  compliance: ComplianceResponse
  revenueProfit: RevenueProfitResponse
  purchaseSpend: PurchaseSpendResponse
  paymentSchedule: PaymentScheduleResponse
  creditSalesOutstanding: CreditSalesOutstandingResponse
}
