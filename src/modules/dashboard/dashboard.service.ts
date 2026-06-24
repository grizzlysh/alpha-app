import { SaleStatus, SaleType, PurchaseOrderStatus, RecordStatus, PaymentStatus, StockMovementType, Prisma } from '@prisma/client'
import { prisma } from '@config/db'
import { Decimal } from '@prisma/client/runtime/library'
import {
  DashboardResponse,
  AdvancedDashboardResponse,
  KpiDelta,
  LicenseStatus,
  ExpiryTier,
  UnpaidInvoiceSummary,
} from './dashboard.interface'
import { AdvancedDashboardQueryInput } from './dashboard.validation'

// ── Helpers ───────────────────────────────────────

function dayBounds(date: Date): { start: Date; end: Date } {
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)
  const end = new Date(date)
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

function toNum(val: Decimal | null | undefined): number {
  return val ? parseFloat(val.toString()) : 0
}

function kpiDelta(today: number, yesterday: number): KpiDelta {
  const delta = today - yesterday
  const deltaPercent = yesterday === 0 ? null : Math.round((delta / yesterday) * 10000) / 100
  return { today, yesterday, delta, deltaPercent }
}

function licenseStatus(validUntil: Date): { daysUntilExpiry: number; status: LicenseStatus } {
  const daysUntilExpiry = Math.ceil((validUntil.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  let status: LicenseStatus = 'valid'
  if (daysUntilExpiry < 0) status = 'expired'
  else if (daysUntilExpiry <= 30) status = 'expiring_soon'
  return { daysUntilExpiry, status }
}

function expiryTier(daysUntilExpiry: number): ExpiryTier {
  if (daysUntilExpiry <= 7) return 'red'
  if (daysUntilExpiry <= 30) return 'amber'
  return 'yellow'
}

// Returns the last moment of the quarter that ended before `now`.
// Jun → Mar 31 | Sep → Jun 30 | Dec → Sep 30 | Mar → Dec 31 prev year
function prevQuarterEnd(now: Date): Date {
  const m = now.getMonth() // 0-based
  const y = now.getFullYear()
  if (m < 3) return new Date(y - 1, 11, 31, 23, 59, 59, 999)  // Q1 → prev Dec 31
  if (m < 6) return new Date(y, 2,  31, 23, 59, 59, 999)       // Q2 → Mar 31
  if (m < 9) return new Date(y, 5,  30, 23, 59, 59, 999)       // Q3 → Jun 30
  return         new Date(y, 8,  30, 23, 59, 59, 999)           // Q4 → Sep 30
}

// ── Section 1: Daily Operations ───────────────────

async function getDailyOps(pharmacyId: number) {
  const now = new Date()
  const today = dayBounds(now)

  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const yest = dayBounds(yesterday)

  const completedFilter = (start: Date, end: Date) => ({
    pharmacyId,
    status: SaleStatus.COMPLETED,
    deletedAt: null,
    soldAt: { gte: start, lte: end },
  })

  const [todayAgg, yesterdayAgg, todayList, recentList] = await Promise.all([
    prisma.sale.aggregate({
      where: completedFilter(today.start, today.end),
      _sum: { grandTotal: true },
      _count: { id: true },
    }),
    prisma.sale.aggregate({
      where: completedFilter(yest.start, yest.end),
      _sum: { grandTotal: true },
      _count: { id: true },
    }),
    prisma.sale.findMany({
      where: completedFilter(today.start, today.end),
      select: { prescriptionId: true, grandTotal: true },
    }),
    prisma.sale.findMany({
      where: { pharmacyId, status: SaleStatus.COMPLETED, deletedAt: null },
      select: {
        uuid: true,
        saleNumber: true,
        grandTotal: true,
        soldAt: true,
        prescriptionId: true,
        customer: { select: { name: true } },
      },
      orderBy: { soldAt: 'desc' },
      take: 5,
    }),
  ])

  const todayRevenue = toNum(todayAgg._sum.grandTotal)
  const yesterdayRevenue = toNum(yesterdayAgg._sum.grandTotal)
  const todayCount = todayAgg._count.id
  const yesterdayCount = yesterdayAgg._count.id
  const todayAvg = todayCount > 0 ? todayRevenue / todayCount : 0
  const yesterdayAvg = yesterdayCount > 0 ? yesterdayRevenue / yesterdayCount : 0

  const otcSales = todayList.filter((s) => s.prescriptionId === null)
  const rxSales = todayList.filter((s) => s.prescriptionId !== null)

  return {
    revenue: kpiDelta(todayRevenue, yesterdayRevenue),
    transactionCount: kpiDelta(todayCount, yesterdayCount),
    avgTransactionValue: kpiDelta(todayAvg, yesterdayAvg),
    otcVsRx: {
      otcCount: otcSales.length,
      rxCount: rxSales.length,
      otcRevenue: otcSales.reduce((sum, s) => sum + toNum(s.grandTotal), 0),
      rxRevenue: rxSales.reduce((sum, s) => sum + toNum(s.grandTotal), 0),
    },
    recentTransactions: recentList.map((s) => ({
      uuid: s.uuid,
      saleNumber: s.saleNumber,
      customerName: s.customer.name,
      totalAmount: toNum(s.grandTotal),
      soldAt: s.soldAt,
      isRx: s.prescriptionId !== null,
    })),
  }
}

// ── Section 3: Inventory Alerts ───────────────────

async function getInventoryAlerts(pharmacyId: number) {
  const now = new Date()
  const in90Days = new Date(now)
  in90Days.setDate(in90Days.getDate() + 90)

  const [stocks, expiringSoonDetails] = await Promise.all([
    prisma.stock.findMany({
      where: { pharmacyId },
      select: {
        uuid: true,
        totalPieces: true,
        reorderLevel: true,
        medicine: { select: { name: true } },
      },
    }),
    prisma.stockDetail.findMany({
      where: {
        stock: { pharmacyId },
        quantityPieces: { gt: 0 },
        expiryDate: { gt: now, lte: in90Days },
      },
      select: {
        uuid: true,
        batchNumber: true,
        expiryDate: true,
        quantityPieces: true,
        stock: { select: { medicine: { select: { name: true } } } },
      },
      orderBy: { expiryDate: 'asc' },
    }),
  ])

  // out-of-stock + below reorder, sorted: out-of-stock first, then by (totalPieces / reorderLevel) ascending
  const restockNeeded = stocks
    .filter((s) => s.totalPieces === 0 || (s.reorderLevel > 0 && s.totalPieces <= s.reorderLevel))
    .map((s) => ({
      uuid: s.uuid,
      medicineName: s.medicine.name,
      totalPieces: s.totalPieces,
      reorderLevel: s.reorderLevel,
      isOutOfStock: s.totalPieces === 0,
    }))
    .sort((a, b) => {
      if (a.isOutOfStock !== b.isOutOfStock) return a.isOutOfStock ? -1 : 1
      const ratioA = a.reorderLevel > 0 ? a.totalPieces / a.reorderLevel : 0
      const ratioB = b.reorderLevel > 0 ? b.totalPieces / b.reorderLevel : 0
      return ratioA - ratioB
    })

  const expiringSoon = expiringSoonDetails.map((d) => {
    const daysUntilExpiry = Math.ceil((d.expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return {
      uuid: d.uuid,
      batchNumber: d.batchNumber,
      medicineName: d.stock.medicine.name,
      expiryDate: d.expiryDate,
      daysUntilExpiry,
      quantityPieces: d.quantityPieces,
      tier: expiryTier(daysUntilExpiry),
    }
  })

  return { restockNeeded, expiringSoon }
}

// ── Section 4: Top Products ───────────────────────

async function getTopProducts(pharmacyId: number) {
  const since = new Date()
  since.setDate(since.getDate() - 30)

  const grouped = await prisma.saleDetail.groupBy({
    by: ['medicineId'],
    where: {
      sale: {
        pharmacyId,
        status: SaleStatus.COMPLETED,
        deletedAt: null,
        soldAt: { gte: since },
      },
    },
    _sum: { quantityPieces: true, totalAmount: true },
    orderBy: { _sum: { quantityPieces: 'desc' } },
    take: 10,
  })

  if (grouped.length === 0) return { byQuantity: [], byRevenue: [] }

  const medicines = await prisma.medicine.findMany({
    where: { id: { in: grouped.map((g) => g.medicineId) } },
    select: { id: true, uuid: true, name: true },
  })
  const medicineMap = new Map(medicines.map((m) => [m.id, m]))

  const items = grouped.map((g) => ({
    medicineUuid: medicineMap.get(g.medicineId)?.uuid ?? '',
    medicineName: medicineMap.get(g.medicineId)?.name ?? '',
    totalQty: g._sum.quantityPieces ?? 0,
    totalRevenue: toNum(g._sum.totalAmount),
  }))

  const byQuantity = [...items].sort((a, b) => b.totalQty - a.totalQty).slice(0, 5)
  const byRevenue = [...items].sort((a, b) => b.totalRevenue - a.totalRevenue).slice(0, 5)

  return { byQuantity, byRevenue }
}

// ── Section 7: Inventory Asset ───────────────────

async function getInventoryAsset(pharmacyId: number) {
  const now = new Date()
  const pqEnd = prevQuarterEnd(now)

  // Current asset: active batches not yet expired
  const currentDetails = await prisma.stockDetail.findMany({
    where: { stock: { pharmacyId }, quantityPieces: { gt: 0 }, expiryDate: { gt: now } },
    select: {
      quantityPieces: true,
      invoiceDetail: { select: { price: true, quantityPerBox: true } },
    },
  })

  const totalAsset = currentDetails.reduce((sum, d) => {
    return sum + d.quantityPieces * (toNum(d.invoiceDetail.price) / d.invoiceDetail.quantityPerBox)
  }, 0)

  // Previous quarter-end asset: reconstruct each batch's quantity at pqEnd via the
  // last stock movement recorded on or before that date.
  type PrevQRow = { qty_at_date: number; price_per_piece: number }
  const prevRows = await prisma.$queryRaw<PrevQRow[]>`
    SELECT
      CAST(COALESCE(
        (SELECT sm.quantity_after
         FROM inv_stock_movements sm
         WHERE sm.stock_detail_id = sd.id
           AND sm.created_at <= ${pqEnd}
         ORDER BY sm.created_at DESC
         LIMIT 1),
        0
      ) AS float) AS qty_at_date,
      CAST(id.price AS float) / id.quantity_per_box AS price_per_piece
    FROM inv_stock_details sd
    JOIN trx_invoice_details id ON id.id = sd.invoice_detail_id
    JOIN inv_stocks s            ON s.id  = sd.stock_id
    WHERE s.pharmacy_id = ${pharmacyId}
      AND sd.expiry_date > ${pqEnd}
  `

  const prevQuarterEndAsset = prevRows.reduce(
    (sum, r) => sum + r.qty_at_date * r.price_per_piece,
    0
  )

  const delta = totalAsset - prevQuarterEndAsset
  const deltaPercent =
    prevQuarterEndAsset === 0
      ? 0
      : Math.round((delta / prevQuarterEndAsset) * 10000) / 100

  return {
    totalAsset: Math.round(totalAsset * 100) / 100,
    prevQuarterEndAsset: Math.round(prevQuarterEndAsset * 100) / 100,
    prevQuarterEndDate: pqEnd.toISOString().slice(0, 10),
    delta: Math.round(delta * 100) / 100,
    deltaPercent,
  }
}

// ── Section 2: Sales Trend ────────────────────────

async function getSalesTrend(pharmacyId: number, days: number) {
  const since = new Date()
  since.setDate(since.getDate() - days)
  since.setHours(0, 0, 0, 0)

  type RawRow = { date: Date; revenue: Decimal; transaction_count: bigint }

  const rows = await prisma.$queryRaw<RawRow[]>`
    SELECT
      DATE(sold_at) AS date,
      SUM(grand_total) AS revenue,
      COUNT(*) AS transaction_count
    FROM trx_sales
    WHERE
      pharmacy_id = ${pharmacyId}
      AND status = 'COMPLETED'
      AND deleted_at IS NULL
      AND sold_at >= ${since}
    GROUP BY DATE(sold_at)
    ORDER BY DATE(sold_at) ASC
  `

  return {
    period: days,
    data: rows.map((r) => ({
      date: r.date.toISOString().slice(0, 10),
      revenue: toNum(r.revenue),
      transactionCount: Number(r.transaction_count),
    })),
  }
}

// ── Section 5: Purchasing Status ─────────────────

async function getOpenPurchaseOrders(pharmacyId: number) {
  const orders = await prisma.purchaseOrder.findMany({
    where: {
      pharmacyId,
      status: PurchaseOrderStatus.SENT,
      deletedAt: null,
    },
    select: {
      uuid: true,
      orderNumber: true,
      orderedAt: true,
      distributor: { select: { name: true } },
      _count: { select: { details: true } },
    },
    orderBy: { orderedAt: 'asc' },
  })

  return orders.map((o) => ({
    uuid: o.uuid,
    orderNumber: o.orderNumber,
    distributorName: o.distributor.name,
    orderedAt: o.orderedAt,
    itemCount: o._count.details,
  }))
}

// ── Section 5b: Unpaid Invoices ───────────────────

async function getUnpaidInvoices(pharmacyId: number): Promise<UnpaidInvoiceSummary> {
  const invoices = await prisma.invoice.findMany({
    where: {
      pharmacyId,
      deletedAt: null,
      paymentStatus: { in: [PaymentStatus.UNPAID, PaymentStatus.PARTIAL] },
    },
    select: {
      grandTotal: true,
      paidAmount: true,
      dueDate: true,
      distributor: { select: { uuid: true, name: true } },
    },
  })

  const byDistributorMap = new Map<string, {
    distributorUuid: string
    distributorName: string
    invoiceCount: number
    totalOutstanding: number
    oldestDueDate: Date | null
  }>()

  for (const inv of invoices) {
    const outstanding = toNum(inv.grandTotal) - toNum(inv.paidAmount)
    const key = inv.distributor.uuid
    const existing = byDistributorMap.get(key)
    if (existing) {
      existing.invoiceCount += 1
      existing.totalOutstanding += outstanding
      if (inv.dueDate && (!existing.oldestDueDate || inv.dueDate < existing.oldestDueDate)) {
        existing.oldestDueDate = inv.dueDate
      }
    } else {
      byDistributorMap.set(key, {
        distributorUuid: inv.distributor.uuid,
        distributorName: inv.distributor.name,
        invoiceCount: 1,
        totalOutstanding: outstanding,
        oldestDueDate: inv.dueDate,
      })
    }
  }

  const byDistributor = [...byDistributorMap.values()].sort(
    (a, b) => b.totalOutstanding - a.totalOutstanding
  )

  return {
    totalCount: invoices.length,
    totalOutstanding: byDistributor.reduce((sum, d) => sum + d.totalOutstanding, 0),
    byDistributor,
  }
}

// ── Section 6: Compliance & Licenses ─────────────

async function getCompliance(pharmacyId: number) {
  const [businessLicenses, practiceLicenses] = await Promise.all([
    prisma.businessLicense.findMany({
      where: { pharmacyId, deletedAt: null, status: RecordStatus.ACTIVE },
      select: { uuid: true, licenseNumber: true, validUntil: true },
      orderBy: { validUntil: 'asc' },
    }),
    prisma.practiceLicense.findMany({
      where: {
        deletedAt: null,
        status: RecordStatus.ACTIVE,
        placement: { pharmacyId, status: RecordStatus.ACTIVE, leftAt: null, deletedAt: null },
      },
      select: {
        uuid: true,
        licenseNumber: true,
        validUntil: true,
        placement: {
          select: {
            user: { select: { name: true } },
            role: { select: { type: true } },
          },
        },
      },
      orderBy: { validUntil: 'asc' },
    }),
  ])

  return {
    businessLicenses: businessLicenses.map((l) => {
      const { daysUntilExpiry, status } = licenseStatus(l.validUntil)
      return { uuid: l.uuid, licenseNumber: l.licenseNumber, validUntil: l.validUntil, daysUntilExpiry, status }
    }),
    practiceLicenses: practiceLicenses.map((l) => {
      const { daysUntilExpiry, status } = licenseStatus(l.validUntil)
      return {
        userName: l.placement.user.name,
        roleType: l.placement.role.type,
        license: { uuid: l.uuid, licenseNumber: l.licenseNumber, validUntil: l.validUntil, daysUntilExpiry, status },
      }
    }),
  }
}

// ── Section 8: Revenue & Profit ──────────────────

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const mkDelta = (val: number, prev: number) => ({
  value: val,
  prevValue: prev,
  delta: Math.round((val - prev) * 100) / 100,
  deltaPercent: prev === 0 ? null : Math.round(((val - prev) / prev) * 10000) / 100,
})

async function getRevenueProfit(pharmacyId: number) {
  const now   = new Date()
  const since = new Date(now.getFullYear(), now.getMonth() - 5, 1, 0, 0, 0, 0)

  const mtdStart    = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
  const prevStart   = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0)
  const prevSameDay = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate(), 23, 59, 59, 999)

  type GpMonthRow = { year: number; month: number; revenue: Decimal; cogs: Decimal }
  type GpRow      = { revenue: Decimal; cogs: Decimal }

  const gpQuery = (from: Date, to?: Date) => prisma.$queryRaw<GpRow[]>`
    WITH cogs_per_sale AS (
      SELECT sd.sale_id,
             SUM(sd.quantity_pieces * (id.final_price::float / id.quantity_per_box)) AS cogs
      FROM trx_sale_details    sd
      JOIN inv_stock_details   std ON std.id = sd.stock_detail_id
      JOIN trx_invoice_details id  ON id.id  = std.invoice_detail_id
      GROUP BY sd.sale_id
    )
    SELECT
      COALESCE(SUM(s.grand_total), 0) AS revenue,
      COALESCE(SUM(c.cogs),        0) AS cogs
    FROM trx_sales s
    LEFT JOIN cogs_per_sale c ON c.sale_id = s.id
    WHERE s.pharmacy_id = ${pharmacyId}
      AND s.status      = 'COMPLETED'
      AND s.deleted_at  IS NULL
      AND s.sold_at    >= ${from}
      ${to ? Prisma.sql`AND s.sold_at <= ${to}` : Prisma.empty}
  `

  const [gpMonthRows, revMtdAgg, revPrevAgg, gpMtdRows, gpPrevRows] = await Promise.all([
    prisma.$queryRaw<GpMonthRow[]>`
      WITH cogs_per_sale AS (
        SELECT sd.sale_id,
               SUM(sd.quantity_pieces * (id.final_price::float / id.quantity_per_box)) AS cogs
        FROM trx_sale_details    sd
        JOIN inv_stock_details   std ON std.id = sd.stock_detail_id
        JOIN trx_invoice_details id  ON id.id  = std.invoice_detail_id
        GROUP BY sd.sale_id
      )
      SELECT
        EXTRACT(YEAR  FROM s.sold_at)::int AS year,
        EXTRACT(MONTH FROM s.sold_at)::int AS month,
        COALESCE(SUM(s.grand_total), 0)    AS revenue,
        COALESCE(SUM(c.cogs),        0)    AS cogs
      FROM trx_sales s
      LEFT JOIN cogs_per_sale c ON c.sale_id = s.id
      WHERE s.pharmacy_id = ${pharmacyId}
        AND s.status      = 'COMPLETED'
        AND s.deleted_at  IS NULL
        AND s.sold_at    >= ${since}
      GROUP BY year, month
      ORDER BY year, month
    `,
    prisma.sale.aggregate({
      where: { pharmacyId, status: SaleStatus.COMPLETED, deletedAt: null, soldAt: { gte: mtdStart } },
      _sum: { grandTotal: true }, _count: { id: true },
    }),
    prisma.sale.aggregate({
      where: { pharmacyId, status: SaleStatus.COMPLETED, deletedAt: null, soldAt: { gte: prevStart, lte: prevSameDay } },
      _sum: { grandTotal: true }, _count: { id: true },
    }),
    gpQuery(mtdStart),
    gpQuery(prevStart, prevSameDay),
  ])

  const last6Months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    const y = d.getFullYear()
    const m = d.getMonth() + 1
    const row       = gpMonthRows.find((r) => r.year === y && r.month === m)
    const revenue   = toNum(row?.revenue)
    const grossProfit = Math.round((revenue - toNum(row?.cogs)) * 100) / 100
    return {
      year: y, month: m,
      label: `${MONTH_LABELS[m - 1]} ${y}`,
      revenue,
      grossProfit,
      marginPercent: revenue === 0 ? null : Math.round((grossProfit / revenue) * 10000) / 100,
    }
  })

  const mtdRev  = toNum(revMtdAgg._sum.grandTotal)
  const prevRev = toNum(revPrevAgg._sum.grandTotal)
  const mtdGp   = Math.round((toNum(gpMtdRows[0]?.revenue) - toNum(gpMtdRows[0]?.cogs)) * 100) / 100
  const prevGp  = Math.round((toNum(gpPrevRows[0]?.revenue) - toNum(gpPrevRows[0]?.cogs)) * 100) / 100

  return {
    last6Months,
    mtd: {
      revenue:     { ...mkDelta(mtdRev, prevRev), transactionCount: revMtdAgg._count.id },
      grossProfit: { ...mkDelta(mtdGp, prevGp), marginPercent: mtdRev === 0 ? null : Math.round((mtdGp / mtdRev) * 10000) / 100 },
    },
  }
}

// ── Section 9: Purchase Spend ─────────────────────

async function getPurchaseSpend(pharmacyId: number) {
  const now   = new Date()
  const since = new Date(now.getFullYear(), now.getMonth() - 5, 1, 0, 0, 0, 0)

  const mtdStart    = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
  const prevStart   = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0)
  const prevSameDay = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate(), 23, 59, 59, 999)

  type SpendMonthRow = { year: number; month: number; spend: Decimal; invoice_count: bigint }

  const [spendMonthRows, mtdAgg, prevAgg] = await Promise.all([
    prisma.$queryRaw<SpendMonthRow[]>`
      SELECT
        EXTRACT(YEAR  FROM invoice_date)::int AS year,
        EXTRACT(MONTH FROM invoice_date)::int AS month,
        COALESCE(SUM(grand_total), 0)         AS spend,
        COUNT(*)                              AS invoice_count
      FROM trx_invoices
      WHERE pharmacy_id  = ${pharmacyId}
        AND deleted_at   IS NULL
        AND invoice_date >= ${since}
      GROUP BY year, month
      ORDER BY year, month
    `,
    prisma.invoice.aggregate({
      where: { pharmacyId, deletedAt: null, invoiceDate: { gte: mtdStart } },
      _sum: { grandTotal: true }, _count: { id: true },
    }),
    prisma.invoice.aggregate({
      where: { pharmacyId, deletedAt: null, invoiceDate: { gte: prevStart, lte: prevSameDay } },
      _sum: { grandTotal: true }, _count: { id: true },
    }),
  ])

  const last6Months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    const y = d.getFullYear()
    const m = d.getMonth() + 1
    const row = spendMonthRows.find((r) => r.year === y && r.month === m)
    return {
      year: y, month: m,
      label: `${MONTH_LABELS[m - 1]} ${y}`,
      spend: row ? toNum(row.spend) : 0,
      invoiceCount: row ? Number(row.invoice_count) : 0,
    }
  })

  const mtdSpend  = toNum(mtdAgg._sum.grandTotal)
  const prevSpend = toNum(prevAgg._sum.grandTotal)

  return {
    last6Months,
    mtd: { ...mkDelta(mtdSpend, prevSpend), invoiceCount: mtdAgg._count.id },
  }
}

// ── Section 11: Slow Movers ───────────────────────

async function getSlowMovers(pharmacyId: number, thresholdDays = 30) {
  const now    = new Date()
  const cutoff = new Date(now)
  cutoff.setDate(cutoff.getDate() - thresholdDays)

  const [stocks, lastOutMovements] = await Promise.all([
    prisma.stock.findMany({
      where: { pharmacyId, totalPieces: { gt: 0 } },
      select: {
        medicineId: true,
        totalPieces: true,
        medicine: { select: { uuid: true, name: true } },
        details: {
          where: { quantityPieces: { gt: 0 } },
          select: { quantityPieces: true, invoiceDetail: { select: { finalPrice: true, quantityPerBox: true } } },
        },
      },
    }),
    prisma.stockMovement.groupBy({
      by: ['medicineId'],
      where: { pharmacyId, type: StockMovementType.OUT },
      _max: { createdAt: true },
    }),
  ])

  const lastOutMap = new Map(lastOutMovements.map((m) => [m.medicineId, m._max.createdAt]))

  const items = stocks
    .filter((s) => {
      const lastOut = lastOutMap.get(s.medicineId)
      return !lastOut || lastOut < cutoff
    })
    .map((s) => {
      const lastMovementAt    = lastOutMap.get(s.medicineId) ?? null
      const daysSince         = lastMovementAt
        ? Math.floor((now.getTime() - lastMovementAt.getTime()) / 86_400_000)
        : null
      const estimatedValue    = s.details.reduce((sum, d) => {
        return sum + d.quantityPieces * (toNum(d.invoiceDetail.finalPrice) / d.invoiceDetail.quantityPerBox)
      }, 0)
      return {
        medicineUuid: s.medicine.uuid,
        medicineName: s.medicine.name,
        totalPieces: s.totalPieces,
        lastMovementAt,
        daysSinceLastMovement: daysSince,
        estimatedValue: Math.round(estimatedValue * 100) / 100,
      }
    })
    .sort((a, b) => {
      if (!a.lastMovementAt && b.lastMovementAt) return -1
      if (a.lastMovementAt && !b.lastMovementAt) return 1
      return (b.daysSinceLastMovement ?? 0) - (a.daysSinceLastMovement ?? 0)
    })

  return { threshold: thresholdDays, items }
}

// ── Section 12: Payment Schedule ─────────────────

async function getPaymentSchedule(pharmacyId: number) {
  const now = new Date()

  const invoices = await prisma.invoice.findMany({
    where: {
      pharmacyId,
      deletedAt: null,
      paymentStatus: { in: [PaymentStatus.UNPAID, PaymentStatus.PARTIAL] },
    },
    select: {
      uuid: true,
      invoiceNumber: true,
      grandTotal: true,
      paidAmount: true,
      dueDate: true,
      distributor: { select: { name: true } },
    },
    orderBy: { dueDate: 'asc' },
  })

  const mapped = invoices.map((inv) => {
    const outstanding = toNum(inv.grandTotal) - toNum(inv.paidAmount)
    const isOverdue   = inv.dueDate ? inv.dueDate < now : false
    const daysUntilDue = inv.dueDate
      ? Math.ceil((inv.dueDate.getTime() - now.getTime()) / 86_400_000)
      : null
    return {
      invoiceUuid: inv.uuid,
      invoiceNumber: inv.invoiceNumber,
      distributorName: inv.distributor.name,
      dueDate: inv.dueDate,
      outstanding,
      isOverdue,
      daysUntilDue,
    }
  })

  const overdue  = mapped.filter((i) => i.isOverdue)
  const upcoming = mapped.filter((i) => !i.isOverdue)

  return {
    upcoming,
    overdue,
    totalUpcoming: upcoming.reduce((s, i) => s + i.outstanding, 0),
    totalOverdue:  overdue.reduce((s, i) => s + i.outstanding, 0),
  }
}

// ── Section 13: Credit Sales Outstanding ─────────

async function getCreditSalesOutstanding(pharmacyId: number) {
  const now = new Date()

  const sales = await prisma.sale.findMany({
    where: {
      pharmacyId,
      status: SaleStatus.COMPLETED,
      deletedAt: null,
      saleType: SaleType.CREDIT,
      payment: { paymentStatus: { in: [PaymentStatus.UNPAID, PaymentStatus.PARTIAL] } },
    },
    select: {
      uuid: true,
      saleNumber: true,
      grandTotal: true,
      paidAmount: true,
      soldAt: true,
      customer: { select: { name: true } },
    },
    orderBy: { soldAt: 'asc' },
  })

  const items = sales.map((s) => {
    const paidAmount  = toNum(s.paidAmount)
    const outstanding = toNum(s.grandTotal) - paidAmount
    return {
      saleUuid: s.uuid,
      saleNumber: s.saleNumber,
      customerName: s.customer.name,
      soldAt: s.soldAt,
      grandTotal: toNum(s.grandTotal),
      paidAmount,
      outstanding,
      daysSinceSale: Math.floor((now.getTime() - s.soldAt.getTime()) / 86_400_000),
    }
  })

  return {
    items,
    totalOutstanding: items.reduce((s, i) => s + i.outstanding, 0),
    totalCount: items.length,
  }
}

// ── Section 14: Stock Runway ──────────────────────

async function getStockRunway(pharmacyId: number) {
  const since30 = new Date()
  since30.setDate(since30.getDate() - 30)

  const [stocks, velocity] = await Promise.all([
    prisma.stock.findMany({
      where: { pharmacyId },
      select: { medicineId: true, totalPieces: true, medicine: { select: { uuid: true, name: true } } },
    }),
    prisma.saleDetail.groupBy({
      by: ['medicineId'],
      where: {
        sale: { pharmacyId, status: SaleStatus.COMPLETED, deletedAt: null, soldAt: { gte: since30 } },
      },
      _sum: { quantityPieces: true },
    }),
  ])

  const velocityMap = new Map(velocity.map((v) => [v.medicineId, v._sum.quantityPieces ?? 0]))

  const items = stocks.map((s) => {
    const sold30      = velocityMap.get(s.medicineId) ?? 0
    const avgDaily    = Math.round((sold30 / 30) * 100) / 100
    const daysRemaining = avgDaily === 0 ? null : Math.floor(s.totalPieces / avgDaily)

    let status: 'critical' | 'low' | 'adequate' | 'overstocked'
    if (avgDaily === 0) {
      status = s.totalPieces > 0 ? 'overstocked' : 'adequate'
    } else if (daysRemaining !== null && daysRemaining <= 7) {
      status = 'critical'
    } else if (daysRemaining !== null && daysRemaining <= 14) {
      status = 'low'
    } else if (daysRemaining !== null && daysRemaining <= 60) {
      status = 'adequate'
    } else {
      status = 'overstocked'
    }

    return {
      medicineUuid: s.medicine.uuid,
      medicineName: s.medicine.name,
      currentPieces: s.totalPieces,
      avgDailySales: avgDaily,
      daysRemaining,
      status,
    }
  })

  items.sort((a, b) => {
    if (a.daysRemaining === null && b.daysRemaining === null) return 0
    if (a.daysRemaining === null) return 1
    if (b.daysRemaining === null) return -1
    return a.daysRemaining - b.daysRemaining
  })

  return { items }
}

// ── Exported Services ─────────────────────────────

export const getDashboard = async (pharmacyId: number): Promise<DashboardResponse> => {
  const [dailyOps, inventoryAlerts, topProducts, inventoryAsset, slowMovers, stockRunway] = await Promise.all([
    getDailyOps(pharmacyId),
    getInventoryAlerts(pharmacyId),
    getTopProducts(pharmacyId),
    getInventoryAsset(pharmacyId),
    getSlowMovers(pharmacyId),
    getStockRunway(pharmacyId),
  ])

  return { dailyOps, inventoryAlerts, topProducts, inventoryAsset, slowMovers, stockRunway }
}

export const getAdvancedDashboard = async (
  pharmacyId: number,
  query: AdvancedDashboardQueryInput
): Promise<AdvancedDashboardResponse> => {
  const [
    salesTrend, openPurchaseOrders, unpaidInvoices, compliance,
    revenueProfit, purchaseSpend, paymentSchedule, creditSalesOutstanding,
  ] = await Promise.all([
    getSalesTrend(pharmacyId, query.days),
    getOpenPurchaseOrders(pharmacyId),
    getUnpaidInvoices(pharmacyId),
    getCompliance(pharmacyId),
    getRevenueProfit(pharmacyId),
    getPurchaseSpend(pharmacyId),
    getPaymentSchedule(pharmacyId),
    getCreditSalesOutstanding(pharmacyId),
  ])

  return {
    salesTrend, openPurchaseOrders, unpaidInvoices, compliance,
    revenueProfit, purchaseSpend, paymentSchedule, creditSalesOutstanding,
  }
}
