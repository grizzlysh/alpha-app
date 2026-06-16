import { prisma } from '@config/db'
import { NotFoundException } from '@exceptions/NotFoundException'
import { PaginationMeta } from '@interfaces/common.interface'
import {
  StockMovementListItem,
  StockMovementDetail,
  StockMovementReference,
} from './stock-movements.interface'
import { StockMovementQueryInput } from './stock-movements.validation'

// ── Helpers ───────────────────────────────────────────────────

const movementListSelect = {
  uuid: true,
  type: true,
  reason: true,
  quantity: true,
  quantityBefore: true,
  quantityAfter: true,
  description: true,
  createdAt: true,
  medicine: {
    select: { uuid: true, name: true, unit: true },
  },
  stockDetail: {
    select: { uuid: true, batchNumber: true },
  },
  invoiceDetail: {
    select: { uuid: true, invoice: { select: { invoiceNumber: true } } },
  },
  saleDetail: {
    select: { uuid: true, sale: { select: { uuid: true, saleNumber: true } } },
  },
  stockReturnDetail: {
    select: { uuid: true, stockReturn: { select: { uuid: true, returnNumber: true } } },
  },
  stockDisposalDetail: {
    select: { uuid: true, stockDisposal: { select: { uuid: true, disposalNumber: true } } },
  },
}

const movementDetailSelect = {
  ...movementListSelect,
  stock: { select: { uuid: true } },
  createdByUser: { select: { name: true } },
}

function resolveReference(movement: {
  invoiceDetail: { uuid: string; invoice: { invoiceNumber: string } } | null
  saleDetail: { uuid: string; sale: { uuid: string; saleNumber: string } } | null
  stockReturnDetail: { uuid: string; stockReturn: { uuid: string; returnNumber: string } } | null
  stockDisposalDetail: { uuid: string; stockDisposal: { uuid: string; disposalNumber: string } } | null
}): StockMovementReference | null {
  if (movement.invoiceDetail) {
    return { uuid: movement.invoiceDetail.uuid, number: movement.invoiceDetail.invoice.invoiceNumber }
  }
  if (movement.saleDetail) {
    return { uuid: movement.saleDetail.sale.uuid, number: movement.saleDetail.sale.saleNumber }
  }
  if (movement.stockReturnDetail) {
    return { uuid: movement.stockReturnDetail.stockReturn.uuid, number: movement.stockReturnDetail.stockReturn.returnNumber }
  }
  if (movement.stockDisposalDetail) {
    return { uuid: movement.stockDisposalDetail.stockDisposal.uuid, number: movement.stockDisposalDetail.stockDisposal.disposalNumber }
  }
  return null
}

function formatListItem(m: any): StockMovementListItem {
  return {
    uuid: m.uuid,
    type: m.type,
    reason: m.reason,
    quantity: m.quantity,
    quantityBefore: m.quantityBefore,
    quantityAfter: m.quantityAfter,
    description: m.description,
    createdAt: m.createdAt,
    medicine: m.medicine,
    stockDetail: m.stockDetail,
    reference: resolveReference(m),
  }
}

function formatDetail(m: any): StockMovementDetail {
  return {
    ...formatListItem(m),
    stock: m.stock,
    invoiceDetail: m.invoiceDetail,
    saleDetail: m.saleDetail,
    stockReturnDetail: m.stockReturnDetail,
    stockDisposalDetail: m.stockDisposalDetail,
    createdByUser: m.createdByUser,
  }
}

// ── Services ──────────────────────────────────────────────────

export const listStockMovements = async (
  pharmacyId: number,
  query: StockMovementQueryInput
): Promise<{ data: StockMovementListItem[]; meta: PaginationMeta }> => {
  const { medicineUuid, type, reason, dateFrom, dateTo, sortOrder, page, limit } = query

  const skip = (page - 1) * limit

  let medicineId: number | undefined
  if (medicineUuid) {
    const medicine = await prisma.medicine.findFirst({
      where: { uuid: medicineUuid, pharmacyId },
      select: { id: true },
    })
    medicineId = medicine?.id
  }

  const where = {
    pharmacyId,
    ...(medicineId !== undefined && { medicineId }),
    ...(type && { type }),
    ...(reason && { reason }),
    ...(dateFrom && dateTo
      ? { createdAt: { gte: new Date(dateFrom), lte: new Date(dateTo) } }
      : dateFrom
        ? { createdAt: { gte: new Date(dateFrom) } }
        : dateTo
          ? { createdAt: { lte: new Date(dateTo) } }
          : {}),
  }

  const [movements, total] = await prisma.$transaction([
    prisma.stockMovement.findMany({
      where,
      select: movementListSelect,
      orderBy: { createdAt: sortOrder },
      skip,
      take: limit,
    }),
    prisma.stockMovement.count({ where }),
  ])

  const meta: PaginationMeta = {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  }

  return { data: movements.map(formatListItem), meta }
}

export const getStockMovementByUuid = async (
  uuid: string,
  pharmacyId: number
): Promise<StockMovementDetail> => {
  const movement = await prisma.stockMovement.findFirst({
    where: { uuid, pharmacyId },
    select: movementDetailSelect,
  })

  if (!movement) throw new NotFoundException('Stock movement not found')

  return formatDetail(movement)
}
