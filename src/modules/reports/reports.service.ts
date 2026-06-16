import { DateTime } from 'luxon'
import { prisma } from '@config/db'
import { getOrSet } from '@utils/cache'
import {
  SalesReportInput,
  PurchaseReportInput,
  InventoryReportInput,
  StockMovementReportInput,
  DisposalReportInput,
  ReturnReportInput,
} from './reports.validation'
import {
  SalesReport,
  SalesExportRow,
  PurchaseReport,
  PurchaseInvoiceRow,
  InventoryReport,
  InventoryStockLevel,
  InventoryExpiryAlert,
  StockMovementReport,
  StockMovementRow,
  DisposalReport,
  DisposalDetailRow,
  ReturnReport,
  ReturnDetailRow,
} from './reports.interface'

const CACHE_TTL = 300 // 5 minutes

function hasDateFilter(query: { period?: string; dateFrom?: string; dateTo?: string }): boolean {
  return !!(query.period || query.dateFrom || query.dateTo)
}

// ── Helpers ───────────────────────────────────────────────────

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

function toNum(d: { toString(): string }): number {
  return parseFloat(d.toString())
}

// ── Sales Report ──────────────────────────────────────────────

export const getSalesReport = async (
  pharmacyId: number,
  query: SalesReportInput
): Promise<SalesReport> => {
  if (!hasDateFilter(query)) {
    return getOrSet(`report:${pharmacyId}:sales:all`, CACHE_TTL, () => fetchSalesReport(pharmacyId, query))
  }
  return fetchSalesReport(pharmacyId, query)
}

const fetchSalesReport = async (
  pharmacyId: number,
  query: SalesReportInput
): Promise<SalesReport> => {
  const { from, to } = resolveDateRange(query.period, query.dateFrom, query.dateTo)

  const dateFilter = {
    ...(from && { gte: from }),
    ...(to && { lte: to }),
  }

  const sales = await prisma.sale.findMany({
    where: {
      pharmacyId,
      deletedAt: null,
      status: 'COMPLETED',
      ...(Object.keys(dateFilter).length && { soldAt: dateFilter }),
    },
    select: {
      uuid: true,
      soldAt: true,
      totalAmount: true,
      taxAmount: true,
      paidAmount: true,
      payment: {
        select: {
          paymentStatus: true,
          history: {
            select: { paymentMethod: true, amount: true },
          },
        },
      },
    },
  })

  const saleDetails = await prisma.saleDetail.findMany({
    where: {
      sale: {
        pharmacyId,
        deletedAt: null,
        status: 'COMPLETED',
        ...(Object.keys(dateFilter).length && { soldAt: dateFilter }),
      },
    },
    select: {
      quantityPieces: true,
      totalAmount: true,
      medicine: { select: { uuid: true, name: true } },
    },
  })

  // Payment breakdown from payment history
  const paymentMap = new Map<string, { count: number; amount: number }>()
  for (const sale of sales) {
    for (const h of sale.payment?.history ?? []) {
      const key = h.paymentMethod
      const existing = paymentMap.get(key) ?? { count: 0, amount: 0 }
      paymentMap.set(key, {
        count: existing.count + 1,
        amount: existing.amount + toNum(h.amount),
      })
    }
  }

  // Top medicines by revenue
  const medicineMap = new Map<
    string,
    { medicineName: string; totalQuantityPieces: number; totalRevenue: number }
  >()
  for (const d of saleDetails) {
    const key = d.medicine.uuid
    const existing = medicineMap.get(key) ?? {
      medicineName: d.medicine.name,
      totalQuantityPieces: 0,
      totalRevenue: 0,
    }
    medicineMap.set(key, {
      medicineName: existing.medicineName,
      totalQuantityPieces: existing.totalQuantityPieces + d.quantityPieces,
      totalRevenue: existing.totalRevenue + toNum(d.totalAmount),
    })
  }

  // Daily revenue
  const dailyMap = new Map<string, { revenue: number; count: number }>()
  for (const sale of sales) {
    const date = DateTime.fromJSDate(sale.soldAt).toISODate()!
    const existing = dailyMap.get(date) ?? { revenue: 0, count: 0 }
    dailyMap.set(date, {
      revenue: existing.revenue + toNum(sale.totalAmount),
      count: existing.count + 1,
    })
  }

  const totalRevenue = sales.reduce((sum, s) => sum + toNum(s.totalAmount), 0)

  return {
    summary: {
      totalRevenue,
      totalSales: sales.length,
      averageOrderValue: sales.length > 0 ? totalRevenue / sales.length : 0,
      paymentBreakdown: Array.from(paymentMap.entries()).map(([method, v]) => ({
        method,
        count: v.count,
        amount: v.amount,
      })),
    },
    topMedicines: Array.from(medicineMap.entries())
      .map(([medicineUuid, v]) => ({ medicineUuid, ...v }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 10),
    dailyRevenue: Array.from(dailyMap.entries())
      .map(([date, v]) => ({ date, ...v }))
      .sort((a, b) => a.date.localeCompare(b.date)),
  }
}

export const getSalesExportRows = async (
  pharmacyId: number,
  query: SalesReportInput
): Promise<SalesExportRow[]> => {
  const { from, to } = resolveDateRange(query.period, query.dateFrom, query.dateTo)

  const dateFilter = {
    ...(from && { gte: from }),
    ...(to && { lte: to }),
  }

  const sales = await prisma.sale.findMany({
    where: {
      pharmacyId,
      deletedAt: null,
      ...(Object.keys(dateFilter).length && { soldAt: dateFilter }),
    },
    select: {
      saleNumber: true,
      soldAt: true,
      saleType: true,
      status: true,
      totalAmount: true,
      taxAmount: true,
      paidAmount: true,
      customer: { select: { name: true } },
      payment: { select: { paymentStatus: true } },
    },
    orderBy: { soldAt: 'asc' },
  })

  return sales.map((s) => ({
    saleNumber: s.saleNumber,
    soldAt: DateTime.fromJSDate(s.soldAt).toFormat('yyyy-MM-dd HH:mm'),
    customerName: s.customer.name,
    saleType: s.saleType,
    status: s.status,
    totalAmount: toNum(s.totalAmount),
    taxAmount: toNum(s.taxAmount),
    paidAmount: toNum(s.paidAmount),
    paymentStatus: s.payment?.paymentStatus ?? '-',
  }))
}

// ── Purchase Report ───────────────────────────────────────────

export const getPurchaseReport = async (
  pharmacyId: number,
  query: PurchaseReportInput
): Promise<PurchaseReport> => {
  if (!hasDateFilter(query)) {
    const key = `report:${pharmacyId}:purchases:${query.distributorUuid ?? 'all'}`
    return getOrSet(key, CACHE_TTL, () => fetchPurchaseReport(pharmacyId, query))
  }
  return fetchPurchaseReport(pharmacyId, query)
}

const fetchPurchaseReport = async (
  pharmacyId: number,
  query: PurchaseReportInput
): Promise<PurchaseReport> => {
  const { from, to } = resolveDateRange(query.period, query.dateFrom, query.dateTo)

  const dateFilter = {
    ...(from && { gte: from }),
    ...(to && { lte: to }),
  }

  let distributorId: number | undefined
  if (query.distributorUuid) {
    const d = await prisma.distributor.findFirst({
      where: { uuid: query.distributorUuid, pharmacyId },
      select: { id: true },
    })
    distributorId = d?.id
  }

  const invoices = await prisma.invoice.findMany({
    where: {
      pharmacyId,
      deletedAt: null,
      ...(distributorId && { distributorId }),
      ...(Object.keys(dateFilter).length && { invoiceDate: dateFilter }),
    },
    select: {
      uuid: true,
      invoiceNumber: true,
      invoiceDate: true,
      grandTotal: true,
      paidAmount: true,
      paymentStatus: true,
      distributor: { select: { uuid: true, name: true } },
      purchaseOrder: { select: { orderNumber: true } },
    },
    orderBy: { invoiceDate: 'asc' },
  })

  const distributorMap = new Map<
    string,
    {
      distributorName: string
      invoiceCount: number
      totalAmount: number
      paidAmount: number
    }
  >()

  for (const inv of invoices) {
    const key = inv.distributor.uuid
    const existing = distributorMap.get(key) ?? {
      distributorName: inv.distributor.name,
      invoiceCount: 0,
      totalAmount: 0,
      paidAmount: 0,
    }
    distributorMap.set(key, {
      distributorName: existing.distributorName,
      invoiceCount: existing.invoiceCount + 1,
      totalAmount: existing.totalAmount + toNum(inv.grandTotal),
      paidAmount: existing.paidAmount + toNum(inv.paidAmount),
    })
  }

  const totalAmount = invoices.reduce((sum, i) => sum + toNum(i.grandTotal), 0)
  const paidAmount = invoices.reduce((sum, i) => sum + toNum(i.paidAmount), 0)

  const invoiceList: PurchaseInvoiceRow[] = invoices.map((inv) => ({
    invoiceUuid: inv.uuid,
    invoiceNumber: inv.invoiceNumber,
    invoiceDate: inv.invoiceDate,
    distributorName: inv.distributor.name,
    purchaseOrderNumber: inv.purchaseOrder?.orderNumber ?? null,
    totalAmount: toNum(inv.grandTotal),
    paidAmount: toNum(inv.paidAmount),
    paymentStatus: inv.paymentStatus,
  }))

  return {
    summary: {
      totalInvoices: invoices.length,
      totalAmount,
      paidAmount,
      unpaidAmount: totalAmount - paidAmount,
    },
    byDistributor: Array.from(distributorMap.entries()).map(([distributorUuid, v]) => ({
      distributorUuid,
      ...v,
      unpaidAmount: v.totalAmount - v.paidAmount,
    })),
    invoiceList,
  }
}

// ── Inventory Report ──────────────────────────────────────────

export const getInventoryReport = async (
  pharmacyId: number,
  query: InventoryReportInput
): Promise<InventoryReport> => {
  const key = `report:${pharmacyId}:inventory:${query.expiryDays}`
  return getOrSet(key, CACHE_TTL, () => fetchInventoryReport(pharmacyId, query))
}

const fetchInventoryReport = async (
  pharmacyId: number,
  query: InventoryReportInput
): Promise<InventoryReport> => {
  const expiryThreshold = DateTime.now().plus({ days: query.expiryDays }).toJSDate()
  const now = new Date()

  const stocks = await prisma.stock.findMany({
    where: { pharmacyId },
    select: {
      totalPieces: true,
      reorderLevel: true,
      basePrice: true,
      calculatedPrice: true,
      sellingPrice: true,
      isManualPrice: true,
      medicine: { select: { uuid: true, name: true, unit: true } },
      details: {
        where: { quantityPieces: { gt: 0 } },
        select: {
          batchNumber: true,
          expiryDate: true,
          quantityPieces: true,
          distributor: { select: { name: true } },
        },
      },
    },
    orderBy: { medicine: { name: 'asc' } },
  })

  const stockLevels: InventoryStockLevel[] = stocks.map((s) => {
    const effectivePrice = s.isManualPrice && s.sellingPrice
      ? toNum(s.sellingPrice)
      : toNum(s.calculatedPrice)
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

  const lowStock = stockLevels.filter((s) => s.isLowStock)

  const expiringSoon: InventoryExpiryAlert[] = []
  const expired: InventoryExpiryAlert[] = []

  for (const stock of stocks) {
    for (const detail of stock.details) {
      const daysUntilExpiry = Math.ceil(
        (detail.expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      )
      const alert: InventoryExpiryAlert = {
        medicineUuid: stock.medicine.uuid,
        medicineName: stock.medicine.name,
        batchNumber: detail.batchNumber,
        expiryDate: detail.expiryDate,
        daysUntilExpiry,
        quantityPieces: detail.quantityPieces,
        distributorName: detail.distributor.name,
      }
      if (detail.expiryDate <= now) {
        expired.push(alert)
      } else if (detail.expiryDate <= expiryThreshold) {
        expiringSoon.push(alert)
      }
    }
  }

  expiringSoon.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry)
  expired.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry)

  const totalStockValue = stocks.reduce((sum, s) => {
    const price = s.isManualPrice && s.sellingPrice
      ? toNum(s.sellingPrice)
      : toNum(s.calculatedPrice)
    return sum + price * s.totalPieces
  }, 0)

  return {
    summary: {
      totalMedicines: stocks.length,
      totalStockValue,
      lowStockCount: lowStock.length,
      expiredCount: expired.length,
      expiringSoonCount: expiringSoon.length,
    },
    stockLevels,
    lowStock,
    expiringSoon,
    expired,
  }
}

// ── Stock Movement Report ─────────────────────────────────────

export const getStockMovementReport = async (
  pharmacyId: number,
  query: StockMovementReportInput
): Promise<StockMovementReport> => {
  const { from, to } = resolveDateRange(query.period, query.dateFrom, query.dateTo)

  const dateFilter = {
    ...(from && { gte: from }),
    ...(to && { lte: to }),
  }

  let medicineId: number | undefined
  if (query.medicineUuid) {
    const m = await prisma.medicine.findFirst({
      where: { uuid: query.medicineUuid, pharmacyId },
      select: { id: true },
    })
    medicineId = m?.id
  }

  const movements = await prisma.stockMovement.findMany({
    where: {
      pharmacyId,
      ...(medicineId && { medicineId }),
      ...(query.type && { type: query.type }),
      ...(query.reason && { reason: query.reason }),
      ...(Object.keys(dateFilter).length && { createdAt: dateFilter }),
    },
    select: {
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
      invoiceDetail: {
        select: { invoice: { select: { invoiceNumber: true } } },
      },
      saleDetail: {
        select: { sale: { select: { saleNumber: true } } },
      },
      stockReturnDetail: {
        select: { stockReturn: { select: { returnNumber: true } } },
      },
      stockDisposalDetail: {
        select: { stockDisposal: { select: { disposalNumber: true } } },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  const rows: StockMovementRow[] = movements.map((m) => {
    const referenceNumber =
      m.invoiceDetail?.invoice?.invoiceNumber ??
      m.saleDetail?.sale?.saleNumber ??
      m.stockReturnDetail?.stockReturn?.returnNumber ??
      m.stockDisposalDetail?.stockDisposal?.disposalNumber ??
      null

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
      referenceNumber,
    }
  })

  return {
    summary: {
      totalMovements: rows.length,
      totalInQty: rows.filter((r) => r.type === 'IN').reduce((s, r) => s + r.quantity, 0),
      totalOutQty: rows.filter((r) => r.type === 'OUT').reduce((s, r) => s + r.quantity, 0),
    },
    movements: rows,
  }
}

// ── Disposal Report ───────────────────────────────────────────

export const getDisposalReport = async (
  pharmacyId: number,
  query: DisposalReportInput
): Promise<DisposalReport> => {
  if (!hasDateFilter(query)) {
    return getOrSet(`report:${pharmacyId}:disposals:all`, CACHE_TTL, () => fetchDisposalReport(pharmacyId, query))
  }
  return fetchDisposalReport(pharmacyId, query)
}

const fetchDisposalReport = async (
  pharmacyId: number,
  query: DisposalReportInput
): Promise<DisposalReport> => {
  const { from, to } = resolveDateRange(query.period, query.dateFrom, query.dateTo)

  const dateFilter = {
    ...(from && { gte: from }),
    ...(to && { lte: to }),
  }

  const details = await prisma.stockDisposalDetail.findMany({
    where: {
      stockDisposal: {
        pharmacyId,
        deletedAt: null,
        ...(Object.keys(dateFilter).length && { disposedAt: dateFilter }),
      },
    },
    select: {
      quantityPieces: true,
      reason: true,
      stockDisposal: {
        select: {
          uuid: true,
          disposalNumber: true,
          status: true,
          disposedAt: true,
        },
      },
      medicine: { select: { name: true } },
      stockDetail: { select: { batchNumber: true } },
    },
    orderBy: { stockDisposal: { disposedAt: 'asc' } },
  })

  const reasonMap = new Map<string, { count: number; totalQuantityPieces: number }>()
  for (const d of details) {
    const key = d.reason
    const existing = reasonMap.get(key) ?? { count: 0, totalQuantityPieces: 0 }
    reasonMap.set(key, {
      count: existing.count + 1,
      totalQuantityPieces: existing.totalQuantityPieces + d.quantityPieces,
    })
  }

  const rows: DisposalDetailRow[] = details.map((d) => ({
    disposalUuid: d.stockDisposal.uuid,
    disposalNumber: d.stockDisposal.disposalNumber,
    disposedAt: d.stockDisposal.disposedAt,
    medicineName: d.medicine.name,
    batchNumber: d.stockDetail.batchNumber,
    quantityPieces: d.quantityPieces,
    reason: d.reason,
    status: d.stockDisposal.status,
  }))

  const uniqueDisposalIds = new Set(details.map((d) => d.stockDisposal.uuid))

  return {
    summary: {
      totalDisposals: uniqueDisposalIds.size,
      totalItems: details.length,
      totalQuantityPieces: details.reduce((sum, d) => sum + d.quantityPieces, 0),
    },
    byReason: Array.from(reasonMap.entries()).map(([reason, v]) => ({ reason, ...v })),
    disposals: rows,
  }
}

// ── Return Report ─────────────────────────────────────────────

export const getReturnReport = async (
  pharmacyId: number,
  query: ReturnReportInput
): Promise<ReturnReport> => {
  if (!hasDateFilter(query)) {
    const key = `report:${pharmacyId}:returns:${query.distributorUuid ?? 'all'}`
    return getOrSet(key, CACHE_TTL, () => fetchReturnReport(pharmacyId, query))
  }
  return fetchReturnReport(pharmacyId, query)
}

const fetchReturnReport = async (
  pharmacyId: number,
  query: ReturnReportInput
): Promise<ReturnReport> => {
  const { from, to } = resolveDateRange(query.period, query.dateFrom, query.dateTo)

  const dateFilter = {
    ...(from && { gte: from }),
    ...(to && { lte: to }),
  }

  let distributorId: number | undefined
  if (query.distributorUuid) {
    const d = await prisma.distributor.findFirst({
      where: { uuid: query.distributorUuid, pharmacyId },
      select: { id: true },
    })
    distributorId = d?.id
  }

  const details = await prisma.stockReturnDetail.findMany({
    where: {
      stockReturn: {
        pharmacyId,
        deletedAt: null,
        ...(distributorId && { distributorId }),
        ...(Object.keys(dateFilter).length && { returnedAt: dateFilter }),
      },
    },
    select: {
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
    },
    orderBy: { stockReturn: { returnedAt: 'asc' } },
  })

  const distributorMap = new Map<
    string,
    { distributorName: string; returnCount: number; totalQuantityPieces: number }
  >()
  const seenReturnIds = new Set<string>()

  for (const d of details) {
    const key = d.stockReturn.distributor.uuid
    const existing = distributorMap.get(key) ?? {
      distributorName: d.stockReturn.distributor.name,
      returnCount: 0,
      totalQuantityPieces: 0,
    }
    const isNewReturn = !seenReturnIds.has(d.stockReturn.uuid)
    seenReturnIds.add(d.stockReturn.uuid)
    distributorMap.set(key, {
      distributorName: existing.distributorName,
      returnCount: existing.returnCount + (isNewReturn ? 1 : 0),
      totalQuantityPieces: existing.totalQuantityPieces + d.quantityPieces,
    })
  }

  const rows: ReturnDetailRow[] = details.map((d) => ({
    returnUuid: d.stockReturn.uuid,
    returnNumber: d.stockReturn.returnNumber,
    returnedAt: d.stockReturn.returnedAt,
    distributorName: d.stockReturn.distributor.name,
    medicineName: d.medicine.name,
    batchNumber: d.stockDetail.batchNumber,
    quantityPieces: d.quantityPieces,
    reason: d.reason ?? null,
    status: d.stockReturn.status,
  }))

  return {
    summary: {
      totalReturns: seenReturnIds.size,
      totalItems: details.length,
      totalQuantityPieces: details.reduce((sum, d) => sum + d.quantityPieces, 0),
    },
    byDistributor: Array.from(distributorMap.entries()).map(([distributorUuid, v]) => ({
      distributorUuid,
      ...v,
    })),
    returns: rows,
  }
}
