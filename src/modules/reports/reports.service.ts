import { DateTime } from 'luxon'
import { Prisma } from '@prisma/client'
import { prisma } from '@config/db'
import { getOrSet } from '@utils/cache'
import { PaginationMeta } from '@interfaces/common.interface'
import {
  SalesSummaryInput,
  SalesListInput,
  SalesExportInput,
  PurchaseSummaryInput,
  PurchaseListInput,
  PurchaseExportInput,
  InventorySummaryInput,
  InventoryListInput,
  InventoryExportInput,
  StockMovementSummaryInput,
  StockMovementListInput,
  StockMovementExportInput,
  DisposalSummaryInput,
  DisposalListInput,
  DisposalExportInput,
  ReturnSummaryInput,
  ReturnListInput,
  ReturnExportInput,
} from './reports.validation'
import {
  SalesSummary,
  SalesExportRow,
  PurchaseSummary,
  PurchaseByDistributor,
  PurchaseInvoiceRow,
  InventorySummary,
  InventoryStockLevel,
  InventoryExpiryAlert,
  StockMovementSummary,
  StockMovementRow,
  DisposalSummary,
  DisposalByReason,
  DisposalDetailRow,
  ReturnSummary,
  ReturnByDistributor,
  ReturnDetailRow,
} from './reports.interface'

const CACHE_TTL = 300

function resolveDateRange(
  period?: string,
  dateFrom?: string,
  dateTo?: string
): { from?: Date; to?: Date } {
  if (period === 'monthly') {
    return {
      from: DateTime.now().startOf('month').toJSDate(),
      to: DateTime.now().endOf('month').toJSDate(),
    }
  }
  return {
    from: dateFrom ? new Date(dateFrom) : undefined,
    to: dateTo ? new Date(dateTo) : undefined,
  }
}

function buildDateFilter(from?: Date, to?: Date) {
  if (!from && !to) return {}
  return {
    ...(from && { gte: from }),
    ...(to && { lte: to }),
  }
}

function toNum(d: { toString(): string } | null | undefined): number {
  if (d == null) return 0
  return parseFloat(d.toString())
}

// ── Sales ─────────────────────────────────────────────────────

export const getSalesSummary = async (
  pharmacyId: number,
  query: SalesSummaryInput
): Promise<{
  summary: SalesSummary
  topMedicines: { medicineUuid: string; medicineName: string; totalQuantityPieces: number; totalRevenue: number }[]
  dailyRevenue: { date: string; revenue: number; count: number }[]
}> => {
  const fn = () => fetchSalesSummary(pharmacyId, query)
  if (!query.period && !query.dateFrom && !query.dateTo) {
    return getOrSet(`report:${pharmacyId}:sales:summary:all`, CACHE_TTL, fn)
  }
  return fn()
}

const fetchSalesSummary = async (
  pharmacyId: number,
  query: SalesSummaryInput
) => {
  const { from, to } = resolveDateRange(query.period, query.dateFrom, query.dateTo)
  const dateFilter = buildDateFilter(from, to)
  const saleWhere = { pharmacyId, deletedAt: null, status: 'COMPLETED' as const, ...(Object.keys(dateFilter).length && { soldAt: dateFilter }) }

  const [saleTotals, paymentGroups, topMedicineGroups] = await Promise.all([
    prisma.sale.aggregate({
      where: saleWhere,
      _count: { _all: true },
      _sum: { grandTotal: true },
    }),
    prisma.salePaymentHistory.groupBy({
      by: ['paymentMethod'],
      where: { salePayment: { sale: saleWhere } },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.saleDetail.groupBy({
      by: ['medicineId'],
      where: { sale: saleWhere },
      _sum: { totalAmount: true, quantityPieces: true },
      orderBy: { _sum: { totalAmount: 'desc' } },
      take: 10,
    }),
  ])

  const fromDate = from ?? new Date('2000-01-01')
  const toDate = to ?? new Date('2100-01-01')

  const dailyRows = await prisma.$queryRaw<{ date: string; revenue: string; count: string }[]>(
    Prisma.sql`
      SELECT
        DATE(sold_at)::text AS date,
        SUM(grand_total)::text AS revenue,
        COUNT(*)::text AS count
      FROM trx_sales
      WHERE pharmacy_id = ${pharmacyId}
        AND deleted_at IS NULL
        AND status = 'COMPLETED'
        AND sold_at >= ${fromDate}
        AND sold_at <= ${toDate}
      GROUP BY DATE(sold_at)
      ORDER BY date ASC
    `
  )

  const medicineIds = topMedicineGroups.map((g) => g.medicineId)
  const medicines = medicineIds.length
    ? await prisma.medicine.findMany({
        where: { id: { in: medicineIds } },
        select: { id: true, uuid: true, name: true },
      })
    : []
  const medicineMap = new Map(medicines.map((m) => [m.id, m]))

  const totalRevenue = toNum(saleTotals._sum.grandTotal)
  const totalSales = saleTotals._count._all

  return {
    summary: {
      totalRevenue,
      totalSales,
      averageOrderValue: totalSales > 0 ? totalRevenue / totalSales : 0,
      paymentBreakdown: paymentGroups.map((g) => ({
        method: g.paymentMethod,
        count: g._count._all,
        amount: toNum(g._sum.amount),
      })),
    },
    topMedicines: topMedicineGroups.map((g) => ({
      medicineUuid: medicineMap.get(g.medicineId)?.uuid ?? '',
      medicineName: medicineMap.get(g.medicineId)?.name ?? '',
      totalQuantityPieces: g._sum.quantityPieces ?? 0,
      totalRevenue: toNum(g._sum.totalAmount),
    })),
    dailyRevenue: dailyRows.map((r) => ({
      date: r.date,
      revenue: parseFloat(r.revenue),
      count: parseInt(r.count, 10),
    })),
  }
}

export const getSalesList = async (
  pharmacyId: number,
  query: SalesListInput
): Promise<{ data: SalesExportRow[]; meta: PaginationMeta }> => {
  const { page, limit, ...filters } = query
  const { from, to } = resolveDateRange(filters.period, filters.dateFrom, filters.dateTo)
  const dateFilter = buildDateFilter(from, to)
  const where = { pharmacyId, deletedAt: null, status: 'COMPLETED' as const, ...(Object.keys(dateFilter).length && { soldAt: dateFilter }) }
  const skip = (page - 1) * limit

  const [sales, total] = await Promise.all([
    prisma.sale.findMany({
      where,
      skip,
      take: limit,
      select: {
        saleNumber: true,
        soldAt: true,
        saleType: true,
        status: true,
        totalAmount: true,
        discountPercentage: true,
        discountAmount: true,
        ppnAmount: true,
        grandTotal: true,
        paidAmount: true,
        customer: { select: { name: true } },
        payment: { select: { paymentStatus: true } },
      },
      orderBy: { soldAt: 'desc' },
    }),
    prisma.sale.count({ where }),
  ])

  return {
    data: sales.map((s) => ({
      saleNumber: s.saleNumber,
      soldAt: DateTime.fromJSDate(s.soldAt).toFormat('yyyy-MM-dd HH:mm'),
      customerName: s.customer.name,
      saleType: s.saleType,
      status: s.status,
      totalAmount: toNum(s.totalAmount),
      discountPercentage: toNum(s.discountPercentage),
      discountAmount: toNum(s.discountAmount),
      ppnAmount: toNum(s.ppnAmount),
      grandTotal: toNum(s.grandTotal),
      paidAmount: toNum(s.paidAmount),
      paymentStatus: s.payment?.paymentStatus ?? '-',
    })),
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  }
}

export const getSalesExport = async (
  pharmacyId: number,
  query: SalesExportInput
): Promise<SalesExportRow[]> => {
  const { from, to } = resolveDateRange(query.period, query.dateFrom, query.dateTo)
  const dateFilter = buildDateFilter(from, to)
  const where = { pharmacyId, deletedAt: null, status: 'COMPLETED' as const, ...(Object.keys(dateFilter).length && { soldAt: dateFilter }) }

  const sales = await prisma.sale.findMany({
    where,
    select: {
      saleNumber: true,
      soldAt: true,
      saleType: true,
      status: true,
      totalAmount: true,
      discountPercentage: true,
      discountAmount: true,
      ppnAmount: true,
      grandTotal: true,
      paidAmount: true,
      customer: { select: { name: true } },
      payment: { select: { paymentStatus: true } },
    },
    orderBy: { soldAt: 'desc' },
  })

  return sales.map((s) => ({
    saleNumber: s.saleNumber,
    soldAt: DateTime.fromJSDate(s.soldAt).toFormat('yyyy-MM-dd HH:mm'),
    customerName: s.customer.name,
    saleType: s.saleType,
    status: s.status,
    totalAmount: toNum(s.totalAmount),
    discountPercentage: toNum(s.discountPercentage),
    discountAmount: toNum(s.discountAmount),
    ppnAmount: toNum(s.ppnAmount),
    grandTotal: toNum(s.grandTotal),
    paidAmount: toNum(s.paidAmount),
    paymentStatus: s.payment?.paymentStatus ?? '-',
  }))
}

// ── Purchases ─────────────────────────────────────────────────

async function resolveDistributorId(pharmacyId: number, uuid?: string): Promise<number | undefined> {
  if (!uuid) return undefined
  const d = await prisma.distributor.findFirst({ where: { uuid, pharmacyId }, select: { id: true } })
  return d?.id
}

function buildInvoiceWhere(pharmacyId: number, distributorId?: number, dateFilter?: object) {
  return {
    pharmacyId,
    deletedAt: null,
    ...(distributorId && { distributorId }),
    ...(dateFilter && Object.keys(dateFilter).length && { invoiceDate: dateFilter }),
  }
}

const invoiceSelect = {
  uuid: true,
  invoiceNumber: true,
  invoiceDate: true,
  grandTotal: true,
  paidAmount: true,
  paymentStatus: true,
  distributor: { select: { name: true } },
  purchaseOrder: { select: { orderNumber: true } },
} as const

function formatInvoiceRow(inv: {
  uuid: string
  invoiceNumber: string
  invoiceDate: Date
  grandTotal: { toString(): string }
  paidAmount: { toString(): string }
  paymentStatus: string
  distributor: { name: string }
  purchaseOrder: { orderNumber: string } | null
}): PurchaseInvoiceRow {
  return {
    invoiceUuid: inv.uuid,
    invoiceNumber: inv.invoiceNumber,
    invoiceDate: inv.invoiceDate,
    distributorName: inv.distributor.name,
    purchaseOrderNumber: inv.purchaseOrder?.orderNumber ?? null,
    totalAmount: toNum(inv.grandTotal),
    paidAmount: toNum(inv.paidAmount),
    paymentStatus: inv.paymentStatus,
  }
}

export const getPurchaseSummary = async (
  pharmacyId: number,
  query: PurchaseSummaryInput
): Promise<{ summary: PurchaseSummary; byDistributor: PurchaseByDistributor[] }> => {
  const { from, to } = resolveDateRange(query.period, query.dateFrom, query.dateTo)
  const distributorId = await resolveDistributorId(pharmacyId, query.distributorUuid)
  const dateFilter = buildDateFilter(from, to)
  const where = buildInvoiceWhere(pharmacyId, distributorId, dateFilter)

  const [totals, byDistributorGroups] = await Promise.all([
    prisma.invoice.aggregate({
      where,
      _count: { _all: true },
      _sum: { grandTotal: true, paidAmount: true },
    }),
    prisma.invoice.groupBy({
      by: ['distributorId'],
      where,
      _count: { _all: true },
      _sum: { grandTotal: true, paidAmount: true },
    }),
  ])

  const distIds = byDistributorGroups.map((g) => g.distributorId)
  const distributors = distIds.length
    ? await prisma.distributor.findMany({
        where: { id: { in: distIds } },
        select: { id: true, uuid: true, name: true },
      })
    : []
  const distMap = new Map(distributors.map((d) => [d.id, d]))

  const totalAmount = toNum(totals._sum.grandTotal)
  const paidAmount = toNum(totals._sum.paidAmount)

  return {
    summary: {
      totalInvoices: totals._count._all,
      totalAmount,
      paidAmount,
      unpaidAmount: totalAmount - paidAmount,
    },
    byDistributor: byDistributorGroups.map((g) => {
      const total = toNum(g._sum.grandTotal)
      const paid = toNum(g._sum.paidAmount)
      return {
        distributorUuid: distMap.get(g.distributorId)?.uuid ?? '',
        distributorName: distMap.get(g.distributorId)?.name ?? '',
        invoiceCount: g._count._all,
        totalAmount: total,
        paidAmount: paid,
        unpaidAmount: total - paid,
      }
    }),
  }
}

export const getPurchaseList = async (
  pharmacyId: number,
  query: PurchaseListInput
): Promise<{ data: PurchaseInvoiceRow[]; meta: PaginationMeta }> => {
  const { page, limit, ...filters } = query
  const { from, to } = resolveDateRange(filters.period, filters.dateFrom, filters.dateTo)
  const distributorId = await resolveDistributorId(pharmacyId, filters.distributorUuid)
  const dateFilter = buildDateFilter(from, to)
  const where = buildInvoiceWhere(pharmacyId, distributorId, dateFilter)
  const skip = (page - 1) * limit

  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({ where, skip, take: limit, select: invoiceSelect, orderBy: { invoiceDate: 'desc' } }),
    prisma.invoice.count({ where }),
  ])

  return {
    data: invoices.map(formatInvoiceRow),
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  }
}

export const getPurchaseExport = async (
  pharmacyId: number,
  query: PurchaseExportInput
): Promise<PurchaseInvoiceRow[]> => {
  const { from, to } = resolveDateRange(query.period, query.dateFrom, query.dateTo)
  const distributorId = await resolveDistributorId(pharmacyId, query.distributorUuid)
  const dateFilter = buildDateFilter(from, to)
  const where = buildInvoiceWhere(pharmacyId, distributorId, dateFilter)

  const invoices = await prisma.invoice.findMany({ where, select: invoiceSelect, orderBy: { invoiceDate: 'desc' } })
  return invoices.map(formatInvoiceRow)
}

// ── Inventory ─────────────────────────────────────────────────

export const getInventorySummary = async (
  pharmacyId: number,
  query: InventorySummaryInput
): Promise<InventorySummary> => {
  return getOrSet(`report:${pharmacyId}:inventory:summary:${query.expiryDays}`, CACHE_TTL, () =>
    fetchInventorySummary(pharmacyId, query)
  )
}

const fetchInventorySummary = async (
  pharmacyId: number,
  query: InventorySummaryInput
): Promise<InventorySummary> => {
  const expiryThreshold = DateTime.now().plus({ days: query.expiryDays }).toJSDate()
  const now = new Date()

  const [stockCount, totalValueAgg, lowStockCount, expiredCount, expiringSoonCount] = await Promise.all([
    prisma.stock.count({ where: { pharmacyId } }),
    prisma.$queryRaw<{ total: string }[]>(
      Prisma.sql`
        SELECT SUM(
          total_pieces * CASE WHEN is_manual_price AND selling_price IS NOT NULL
            THEN selling_price ELSE calculated_price END
        )::text AS total
        FROM inv_stocks
        WHERE pharmacy_id = ${pharmacyId}
      `
    ),
    prisma.$queryRaw<{ count: string }[]>(
      Prisma.sql`
        SELECT COUNT(*)::text AS count
        FROM inv_stocks
        WHERE pharmacy_id = ${pharmacyId}
          AND total_pieces <= reorder_level
      `
    ),
    prisma.stockDetail.count({
      where: {
        stock: { pharmacyId },
        expiryDate: { lt: now },
        quantityPieces: { gt: 0 },
      },
    }),
    prisma.stockDetail.count({
      where: {
        stock: { pharmacyId },
        expiryDate: { gte: now, lte: expiryThreshold },
        quantityPieces: { gt: 0 },
      },
    }),
  ])

  return {
    totalMedicines: stockCount,
    totalStockValue: parseFloat(totalValueAgg[0]?.total ?? '0'),
    lowStockCount: parseInt(lowStockCount[0]?.count ?? '0', 10),
    expiredCount,
    expiringSoonCount,
  }
}

export const getInventoryList = async (
  pharmacyId: number,
  query: InventoryListInput
): Promise<{ data: InventoryStockLevel[]; meta: PaginationMeta }> => {
  const { page, limit, expiryDays: _expiryDays, isLowStock } = query
  const skip = (page - 1) * limit

  let where: Prisma.StockWhereInput = { pharmacyId }
  if (isLowStock === true) {
    const lowStockIds = await prisma.$queryRaw<{ id: number }[]>(
      Prisma.sql`SELECT id FROM inv_stocks WHERE pharmacy_id = ${pharmacyId} AND total_pieces <= reorder_level`
    )
    where = { ...where, id: { in: lowStockIds.map((r) => r.id) } }
  }

  const [stocks, total] = await Promise.all([
    prisma.stock.findMany({
      where,
      skip,
      take: limit,
      select: {
        totalPieces: true,
        reorderLevel: true,
        basePrice: true,
        calculatedPrice: true,
        sellingPrice: true,
        isManualPrice: true,
        medicine: { select: { uuid: true, name: true, unit: true } },
      },
      orderBy: { medicine: { name: 'asc' } },
    }),
    prisma.stock.count({ where }),
  ])

  return {
    data: stocks.map((s) => {
      const effectivePrice = s.isManualPrice && s.sellingPrice ? toNum(s.sellingPrice) : toNum(s.calculatedPrice)
      return {
        medicineUuid: s.medicine.uuid,
        medicineName: s.medicine.name,
        unit: s.medicine.unit,
        totalPieces: s.totalPieces,
        reorderLevel: s.reorderLevel,
        isLowStock: s.totalPieces <= s.reorderLevel,
        basePrice: toNum(s.basePrice),
        sellingPrice: effectivePrice,
      }
    }),
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  }
}

export const getInventoryExport = async (
  pharmacyId: number,
  query: InventoryExportInput
): Promise<InventoryStockLevel[]> => {
  const { isLowStock } = query
  let where: Prisma.StockWhereInput = { pharmacyId }
  if (isLowStock === true) {
    const lowStockIds = await prisma.$queryRaw<{ id: number }[]>(
      Prisma.sql`SELECT id FROM inv_stocks WHERE pharmacy_id = ${pharmacyId} AND total_pieces <= reorder_level`
    )
    where = { ...where, id: { in: lowStockIds.map((r) => r.id) } }
  }

  const stocks = await prisma.stock.findMany({
    where,
    select: {
      totalPieces: true,
      reorderLevel: true,
      basePrice: true,
      calculatedPrice: true,
      sellingPrice: true,
      isManualPrice: true,
      medicine: { select: { uuid: true, name: true, unit: true } },
    },
    orderBy: { medicine: { name: 'asc' } },
  })

  return stocks.map((s) => {
    const effectivePrice = s.isManualPrice && s.sellingPrice ? toNum(s.sellingPrice) : toNum(s.calculatedPrice)
    return {
      medicineUuid: s.medicine.uuid,
      medicineName: s.medicine.name,
      unit: s.medicine.unit,
      totalPieces: s.totalPieces,
      reorderLevel: s.reorderLevel,
      isLowStock: s.totalPieces <= s.reorderLevel,
      basePrice: toNum(s.basePrice),
      sellingPrice: effectivePrice,
    }
  })
}

export const getInventoryExpiryAlerts = async (
  pharmacyId: number,
  query: InventorySummaryInput
): Promise<{ expiringSoon: InventoryExpiryAlert[]; expired: InventoryExpiryAlert[] }> => {
  const expiryThreshold = DateTime.now().plus({ days: query.expiryDays }).toJSDate()
  const now = new Date()

  const details = await prisma.stockDetail.findMany({
    where: {
      stock: { pharmacyId },
      expiryDate: { lte: expiryThreshold },
      quantityPieces: { gt: 0 },
    },
    select: {
      batchNumber: true,
      expiryDate: true,
      quantityPieces: true,
      distributor: { select: { name: true } },
      stock: { select: { medicine: { select: { uuid: true, name: true } } } },
    },
    orderBy: { expiryDate: 'asc' },
  })

  const expiringSoon: InventoryExpiryAlert[] = []
  const expired: InventoryExpiryAlert[] = []

  for (const d of details) {
    const daysUntilExpiry = Math.ceil((d.expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    const alert: InventoryExpiryAlert = {
      medicineUuid: d.stock.medicine.uuid,
      medicineName: d.stock.medicine.name,
      batchNumber: d.batchNumber,
      expiryDate: d.expiryDate,
      daysUntilExpiry,
      quantityPieces: d.quantityPieces,
      distributorName: d.distributor.name,
    }
    if (d.expiryDate <= now) expired.push(alert)
    else expiringSoon.push(alert)
  }

  return { expiringSoon, expired }
}

// ── Stock Movements ───────────────────────────────────────────

async function resolveMedicineId(pharmacyId: number, uuid?: string): Promise<number | undefined> {
  if (!uuid) return undefined
  const m = await prisma.medicine.findFirst({ where: { uuid, pharmacyId }, select: { id: true } })
  return m?.id
}

function buildMovementWhere(
  pharmacyId: number,
  medicineId?: number,
  type?: string,
  reason?: string,
  dateFilter?: object
) {
  return {
    pharmacyId,
    ...(medicineId && { medicineId }),
    ...(type && { type: type as any }),
    ...(reason && { reason: reason as any }),
    ...(dateFilter && Object.keys(dateFilter).length && { createdAt: dateFilter }),
  }
}

const movementSelect = {
  uuid: true,
  createdAt: true,
  type: true,
  reason: true,
  quantity: true,
  quantityBefore: true,
  quantityAfter: true,
  description: true,
  medicine: { select: { uuid: true, name: true } },
  stockDetail: { select: { batchNumber: true } },
  invoiceDetail: { select: { invoice: { select: { invoiceNumber: true } } } },
  saleDetail: { select: { sale: { select: { saleNumber: true } } } },
  stockReturnDetail: { select: { stockReturn: { select: { returnNumber: true } } } },
  stockDisposalDetail: { select: { stockDisposal: { select: { disposalNumber: true } } } },
} as const

function formatMovementRow(m: {
  uuid: string
  createdAt: Date
  type: string
  reason: string
  quantity: number
  quantityBefore: number
  quantityAfter: number
  description: string | null
  medicine: { uuid: string; name: string }
  stockDetail: { batchNumber: string }
  invoiceDetail: { invoice: { invoiceNumber: string } } | null
  saleDetail: { sale: { saleNumber: string } } | null
  stockReturnDetail: { stockReturn: { returnNumber: string } } | null
  stockDisposalDetail: { stockDisposal: { disposalNumber: string } } | null
}): StockMovementRow {
  return {
    movementUuid: m.uuid,
    createdAt: m.createdAt,
    medicineName: m.medicine.name,
    medicineUuid: m.medicine.uuid,
    type: m.type,
    reason: m.reason,
    quantity: m.quantity,
    quantityBefore: m.quantityBefore,
    quantityAfter: m.quantityAfter,
    batchNumber: m.stockDetail.batchNumber,
    description: m.description ?? null,
    referenceNumber:
      m.invoiceDetail?.invoice?.invoiceNumber ??
      m.saleDetail?.sale?.saleNumber ??
      m.stockReturnDetail?.stockReturn?.returnNumber ??
      m.stockDisposalDetail?.stockDisposal?.disposalNumber ??
      null,
  }
}

export const getStockMovementSummary = async (
  pharmacyId: number,
  query: StockMovementSummaryInput
): Promise<StockMovementSummary> => {
  const { from, to } = resolveDateRange(query.period, query.dateFrom, query.dateTo)
  const medicineId = await resolveMedicineId(pharmacyId, query.medicineUuid)
  const dateFilter = buildDateFilter(from, to)
  const where = buildMovementWhere(pharmacyId, medicineId, query.type, query.reason, dateFilter)

  const byType = await prisma.stockMovement.groupBy({
    by: ['type'],
    where,
    _sum: { quantity: true },
    _count: { _all: true },
  })

  const total = byType.reduce((s, g) => s + g._count._all, 0)
  const inGroup = byType.find((g) => g.type === 'IN')
  const outGroup = byType.find((g) => g.type === 'OUT')

  return {
    totalMovements: total,
    totalInQty: inGroup?._sum.quantity ?? 0,
    totalOutQty: outGroup?._sum.quantity ?? 0,
  }
}

export const getStockMovementList = async (
  pharmacyId: number,
  query: StockMovementListInput
): Promise<{ data: StockMovementRow[]; meta: PaginationMeta }> => {
  const { page, limit, ...filters } = query
  const { from, to } = resolveDateRange(filters.period, filters.dateFrom, filters.dateTo)
  const medicineId = await resolveMedicineId(pharmacyId, filters.medicineUuid)
  const dateFilter = buildDateFilter(from, to)
  const where = buildMovementWhere(pharmacyId, medicineId, filters.type, filters.reason, dateFilter)
  const skip = (page - 1) * limit

  const [movements, total] = await Promise.all([
    prisma.stockMovement.findMany({ where, skip, take: limit, select: movementSelect, orderBy: { createdAt: 'desc' } }),
    prisma.stockMovement.count({ where }),
  ])

  return {
    data: movements.map(formatMovementRow),
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  }
}

export const getStockMovementExport = async (
  pharmacyId: number,
  query: StockMovementExportInput
): Promise<StockMovementRow[]> => {
  const { from, to } = resolveDateRange(query.period, query.dateFrom, query.dateTo)
  const medicineId = await resolveMedicineId(pharmacyId, query.medicineUuid)
  const dateFilter = buildDateFilter(from, to)
  const where = buildMovementWhere(pharmacyId, medicineId, query.type, query.reason, dateFilter)

  const movements = await prisma.stockMovement.findMany({ where, select: movementSelect, orderBy: { createdAt: 'desc' } })
  return movements.map(formatMovementRow)
}

// ── Disposals ─────────────────────────────────────────────────

function buildDisposalDetailWhere(pharmacyId: number, dateFilter?: object) {
  return {
    stockDisposal: {
      pharmacyId,
      deletedAt: null,
      ...(dateFilter && Object.keys(dateFilter).length && { disposedAt: dateFilter }),
    },
  }
}

const disposalDetailSelect = {
  quantityPieces: true,
  reason: true,
  stockDisposal: { select: { uuid: true, disposalNumber: true, status: true, disposedAt: true } },
  medicine: { select: { name: true } },
  stockDetail: { select: { batchNumber: true } },
} as const

function formatDisposalRow(d: {
  quantityPieces: number
  reason: string
  stockDisposal: { uuid: string; disposalNumber: string; status: string; disposedAt: Date | null }
  medicine: { name: string }
  stockDetail: { batchNumber: string }
}): DisposalDetailRow {
  return {
    disposalUuid: d.stockDisposal.uuid,
    disposalNumber: d.stockDisposal.disposalNumber,
    disposedAt: d.stockDisposal.disposedAt,
    medicineName: d.medicine.name,
    batchNumber: d.stockDetail.batchNumber,
    quantityPieces: d.quantityPieces,
    reason: d.reason,
    status: d.stockDisposal.status,
  }
}

export const getDisposalSummary = async (
  pharmacyId: number,
  query: DisposalSummaryInput
): Promise<{ summary: DisposalSummary; byReason: DisposalByReason[] }> => {
  const { from, to } = resolveDateRange(query.period, query.dateFrom, query.dateTo)
  const dateFilter = buildDateFilter(from, to)
  const where = buildDisposalDetailWhere(pharmacyId, dateFilter)

  const [totals, byReason, uniqueDisposals] = await Promise.all([
    prisma.stockDisposalDetail.aggregate({
      where,
      _count: { _all: true },
      _sum: { quantityPieces: true },
    }),
    prisma.stockDisposalDetail.groupBy({
      by: ['reason'],
      where,
      _count: { _all: true },
      _sum: { quantityPieces: true },
    }),
    prisma.stockDisposalDetail.findMany({
      where,
      distinct: ['stockDisposalId'],
      select: { stockDisposalId: true },
    }),
  ])

  return {
    summary: {
      totalDisposals: uniqueDisposals.length,
      totalItems: totals._count._all,
      totalQuantityPieces: totals._sum.quantityPieces ?? 0,
    },
    byReason: byReason.map((g) => ({
      reason: g.reason,
      count: g._count._all,
      totalQuantityPieces: g._sum.quantityPieces ?? 0,
    })),
  }
}

export const getDisposalList = async (
  pharmacyId: number,
  query: DisposalListInput
): Promise<{ data: DisposalDetailRow[]; meta: PaginationMeta }> => {
  const { page, limit, ...filters } = query
  const { from, to } = resolveDateRange(filters.period, filters.dateFrom, filters.dateTo)
  const dateFilter = buildDateFilter(from, to)
  const where = buildDisposalDetailWhere(pharmacyId, dateFilter)
  const skip = (page - 1) * limit

  const [details, total] = await Promise.all([
    prisma.stockDisposalDetail.findMany({
      where,
      skip,
      take: limit,
      select: disposalDetailSelect,
      orderBy: { stockDisposal: { disposedAt: 'desc' } },
    }),
    prisma.stockDisposalDetail.count({ where }),
  ])

  return {
    data: details.map(formatDisposalRow),
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  }
}

export const getDisposalExport = async (
  pharmacyId: number,
  query: DisposalExportInput
): Promise<DisposalDetailRow[]> => {
  const { from, to } = resolveDateRange(query.period, query.dateFrom, query.dateTo)
  const dateFilter = buildDateFilter(from, to)
  const where = buildDisposalDetailWhere(pharmacyId, dateFilter)

  const details = await prisma.stockDisposalDetail.findMany({
    where,
    select: disposalDetailSelect,
    orderBy: { stockDisposal: { disposedAt: 'desc' } },
  })
  return details.map(formatDisposalRow)
}

// ── Returns ───────────────────────────────────────────────────

function buildReturnDetailWhere(pharmacyId: number, distributorId?: number, dateFilter?: object) {
  return {
    stockReturn: {
      pharmacyId,
      deletedAt: null,
      ...(distributorId && { distributorId }),
      ...(dateFilter && Object.keys(dateFilter).length && { returnedAt: dateFilter }),
    },
  }
}

const returnDetailSelect = {
  quantityPieces: true,
  reason: true,
  stockReturn: {
    select: {
      uuid: true,
      returnNumber: true,
      status: true,
      returnedAt: true,
      distributor: { select: { uuid: true, name: true } },
    },
  },
  medicine: { select: { name: true } },
  stockDetail: { select: { batchNumber: true } },
} as const

function formatReturnRow(d: {
  quantityPieces: number
  reason: string | null
  stockReturn: {
    uuid: string
    returnNumber: string
    status: string
    returnedAt: Date | null
    distributor: { uuid: string; name: string }
  }
  medicine: { name: string }
  stockDetail: { batchNumber: string }
}): ReturnDetailRow {
  return {
    returnUuid: d.stockReturn.uuid,
    returnNumber: d.stockReturn.returnNumber,
    returnedAt: d.stockReturn.returnedAt,
    distributorName: d.stockReturn.distributor.name,
    medicineName: d.medicine.name,
    batchNumber: d.stockDetail.batchNumber,
    quantityPieces: d.quantityPieces,
    reason: d.reason ?? null,
    status: d.stockReturn.status,
  }
}

export const getReturnSummary = async (
  pharmacyId: number,
  query: ReturnSummaryInput
): Promise<{ summary: ReturnSummary; byDistributor: ReturnByDistributor[] }> => {
  const { from, to } = resolveDateRange(query.period, query.dateFrom, query.dateTo)
  const distributorId = await resolveDistributorId(pharmacyId, query.distributorUuid)
  const dateFilter = buildDateFilter(from, to)
  const where = buildReturnDetailWhere(pharmacyId, distributorId, dateFilter)

  const details = await prisma.stockReturnDetail.findMany({
    where,
    select: {
      quantityPieces: true,
      stockReturn: { select: { uuid: true, distributor: { select: { uuid: true, name: true } } } },
    },
  })

  const distMap = new Map<string, { name: string; returnIds: Set<string>; totalQuantityPieces: number }>()
  for (const d of details) {
    const key = d.stockReturn.distributor.uuid
    const existing = distMap.get(key) ?? { name: d.stockReturn.distributor.name, returnIds: new Set<string>(), totalQuantityPieces: 0 }
    existing.returnIds.add(d.stockReturn.uuid)
    existing.totalQuantityPieces += d.quantityPieces
    distMap.set(key, existing)
  }

  const returnIds = new Set(details.map((d) => d.stockReturn.uuid))

  return {
    summary: {
      totalReturns: returnIds.size,
      totalItems: details.length,
      totalQuantityPieces: details.reduce((s, d) => s + d.quantityPieces, 0),
    },
    byDistributor: Array.from(distMap.entries()).map(([distributorUuid, v]) => ({
      distributorUuid,
      distributorName: v.name,
      returnCount: v.returnIds.size,
      totalQuantityPieces: v.totalQuantityPieces,
    })),
  }
}

export const getReturnList = async (
  pharmacyId: number,
  query: ReturnListInput
): Promise<{ data: ReturnDetailRow[]; meta: PaginationMeta }> => {
  const { page, limit, ...filters } = query
  const { from, to } = resolveDateRange(filters.period, filters.dateFrom, filters.dateTo)
  const distributorId = await resolveDistributorId(pharmacyId, filters.distributorUuid)
  const dateFilter = buildDateFilter(from, to)
  const where = buildReturnDetailWhere(pharmacyId, distributorId, dateFilter)
  const skip = (page - 1) * limit

  const [details, total] = await Promise.all([
    prisma.stockReturnDetail.findMany({
      where,
      skip,
      take: limit,
      select: returnDetailSelect,
      orderBy: { stockReturn: { returnedAt: 'desc' } },
    }),
    prisma.stockReturnDetail.count({ where }),
  ])

  return {
    data: details.map(formatReturnRow),
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  }
}

export const getReturnExport = async (
  pharmacyId: number,
  query: ReturnExportInput
): Promise<ReturnDetailRow[]> => {
  const { from, to } = resolveDateRange(query.period, query.dateFrom, query.dateTo)
  const distributorId = await resolveDistributorId(pharmacyId, query.distributorUuid)
  const dateFilter = buildDateFilter(from, to)
  const where = buildReturnDetailWhere(pharmacyId, distributorId, dateFilter)

  const details = await prisma.stockReturnDetail.findMany({
    where,
    select: returnDetailSelect,
    orderBy: { stockReturn: { returnedAt: 'desc' } },
  })
  return details.map(formatReturnRow)
}
