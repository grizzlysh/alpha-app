import { PERMISSIONS } from '@constants/permissions'
import { prisma } from '@config/db'
import {
  StockQueryInput,
  StockMovementQueryInput,
  UpdatePriceInput,
  UpdateReorderLevelInput,
  AdjustStockInput,
} from './stock.validation'
import {
  StockResponse,
  StockAlertResponse,
  StockMovementResponse,
  CrossPharmacyStockResponse,
} from './stock.interface'
import { NotFoundException } from '@exceptions/NotFoundException'
import { BadRequestException } from '@exceptions/BadRequestException'
import { ForbiddenException } from '@exceptions/ForbiddenException'
import { PaginationMeta } from '@interfaces/common.interface'
import { Decimal } from '@prisma/client/runtime/library'

// ── Helpers ───────────────────────────────────────────

const getEffectiveSellingPrice = (
  sellingPrice: Decimal | null,
  calculatedPrice: Decimal
): number => {
  return parseFloat(
    (sellingPrice ?? calculatedPrice).toString()
  )
}

const getExpiryAlertDays = async (pharmacyId: number): Promise<number> => {
  const param = await prisma.businessParameter.findUnique({
    where: { pharmacyId_key: { pharmacyId, key: 'EXPIRY_ALERT_DAYS' } },
    select: { value: true },
  })
  return parseInt(param?.value ?? '90')
}

const getLowStockThreshold = async (pharmacyId: number): Promise<number> => {
  const param = await prisma.businessParameter.findUnique({
    where: { pharmacyId_key: { pharmacyId, key: 'LOW_STOCK_ALERT_THRESHOLD' } },
    select: { value: true },
  })
  return parseInt(param?.value ?? '0')
}

const stockDetailSelect = {
  uuid: true,
  batchNumber: true,
  barcode: true,
  expiryDate: true,
  quantityPieces: true,
  quantityBox: true,
  quantityPerBox: true,
  distributor: {
    select: { uuid: true, name: true },
  },
}

const stockSelect = {
  uuid: true,
  totalPieces: true,
  reorderLevel: true,
  basePrice: true,
  calculatedPrice: true,
  sellingPrice: true,
  isManualPrice: true,
  updatedAt: true,
  medicine: {
    select: {
      uuid: true,
      name: true,
      unit: true,
      shape: { select: { name: true } },
      type: { select: { name: true } },
      medicineClass: { select: { name: true } },
    },
  },
  details: {
    where: { quantityPieces: { gt: 0 } },
    select: stockDetailSelect,
    orderBy: { expiryDate: 'asc' as const },
  },
}

const formatStock = (stock: any, lowStockThreshold: number = 0): StockResponse => ({
  ...stock,
  basePrice: parseFloat(stock.basePrice.toString()),
  calculatedPrice: parseFloat(stock.calculatedPrice.toString()),
  sellingPrice: stock.sellingPrice
    ? parseFloat(stock.sellingPrice.toString())
    : null,
  effectiveSellingPrice: getEffectiveSellingPrice(
    stock.sellingPrice,
    stock.calculatedPrice
  ),
  isLowStock: stock.totalPieces <= stock.reorderLevel,
  isCriticalStock: lowStockThreshold > 0 && stock.totalPieces <= lowStockThreshold,
})

// ── Services ──────────────────────────────────────────

export const getStocks = async (
  pharmacyId: number,
  query: StockQueryInput
): Promise<{ data: StockResponse[]; meta: PaginationMeta }> => {
  const { search, isLowStock, isExpiringSoon, sortBy, sortOrder, page, limit } = query

  const skip = (page - 1) * limit
  const [expiryAlertDays, lowStockThreshold] = await Promise.all([
    getExpiryAlertDays(pharmacyId),
    getLowStockThreshold(pharmacyId),
  ])

  const expiryAlertDate = new Date()
  expiryAlertDate.setDate(expiryAlertDate.getDate() + expiryAlertDays)

  const where: any = {
    pharmacyId,
    ...(search && {
      medicine: {
        name: { contains: search, mode: 'insensitive' as const },
      },
    }),
    ...(isExpiringSoon === 'true' && {
      details: {
        some: {
          expiryDate: { lte: expiryAlertDate },
          quantityPieces: { gt: 0 },
        },
      },
    }),
  }

  const stocks = await prisma.stock.findMany({
    where,
    select: stockSelect,
    skip,
    take: limit,
  })

  // filter low stock in memory (computed field)
  let filteredStocks = stocks
  if (isLowStock === 'true') {
    filteredStocks = stocks.filter(
      (s) => s.totalPieces <= s.reorderLevel
    )
  }

  // sort by name needs medicine join sort
  const sorted = sortBy === 'name'
    ? filteredStocks.sort((a, b) =>
        sortOrder === 'asc'
          ? a.medicine.name.localeCompare(b.medicine.name)
          : b.medicine.name.localeCompare(a.medicine.name)
      )
    : filteredStocks

  const total = await prisma.stock.count({ where })

  const meta: PaginationMeta = {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  }

  return { data: sorted.map((s) => formatStock(s, lowStockThreshold)), meta }
}

export const getStockByUuid = async (
  uuid: string,
  pharmacyId: number
): Promise<StockResponse> => {
  const [stock, lowStockThreshold] = await Promise.all([
    prisma.stock.findFirst({ where: { uuid, pharmacyId }, select: stockSelect }),
    getLowStockThreshold(pharmacyId),
  ])

  if (!stock) throw new NotFoundException('Stock not found')

  return formatStock(stock, lowStockThreshold)
}

export const getStockAlerts = async (
  pharmacyId: number
): Promise<StockAlertResponse> => {
  const [expiryAlertDays, lowStockThreshold] = await Promise.all([
    getExpiryAlertDays(pharmacyId),
    getLowStockThreshold(pharmacyId),
  ])

  const expiryAlertDate = new Date()
  expiryAlertDate.setDate(expiryAlertDate.getDate() + expiryAlertDays)

  // low stock
  const allStocks = await prisma.stock.findMany({
    where: { pharmacyId },
    select: stockSelect,
  })

  const lowStock = allStocks
    .filter((s) => s.totalPieces <= s.reorderLevel)
    .map((s) => formatStock(s, lowStockThreshold))

  // expiring soon
  const expiringSoonDetails = await prisma.stockDetail.findMany({
    where: {
      stock: { pharmacyId },
      expiryDate: { lte: expiryAlertDate },
      quantityPieces: { gt: 0 },
    },
    select: {
      uuid: true,
      batchNumber: true,
      expiryDate: true,
      quantityPieces: true,
      stock: {
        select: {
          uuid: true,
          medicine: {
            select: { uuid: true, name: true, unit: true },
          },
        },
      },
    },
    orderBy: { expiryDate: 'asc' },
  })

  const expiringSoon = expiringSoonDetails.map((detail) => {
    const today = new Date()
    const daysUntilExpiry = Math.ceil(
      (detail.expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    )

    return {
      uuid: detail.uuid,
      batchNumber: detail.batchNumber,
      expiryDate: detail.expiryDate,
      quantityPieces: detail.quantityPieces,
      daysUntilExpiry,
      medicine: detail.stock.medicine,
      stock: { uuid: detail.stock.uuid },
    }
  })

  return { lowStock, expiringSoon }
}

export const getStockMovements = async (
  pharmacyId: number,
  query: StockMovementQueryInput
): Promise<{ data: StockMovementResponse[]; meta: PaginationMeta }> => {
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
    ...(medicineId && { medicineId }),
    ...(type && { type }),
    ...(reason && { reason }),
    ...(dateFrom && { createdAt: { gte: new Date(dateFrom) } }),
    ...(dateTo && { createdAt: { lte: new Date(dateTo) } }),
  }

  const [movements, total] = await prisma.$transaction([
    prisma.stockMovement.findMany({
      where,
      select: {
        uuid: true,
        type: true,
        reason: true,
        quantity: true,
        quantityBefore: true,
        quantityAfter: true,
        description: true,
        createdAt: true,
        medicine: {
          select: { uuid: true, name: true },
        },
        stockDetail: {
          select: { uuid: true, batchNumber: true },
        },
        invoiceDetail: {
          select: {
            uuid: true,
            invoice: { select: { invoiceNumber: true } },
          },
        },
        sale: {
          select: { uuid: true, saleNumber: true },
        },
        stockReturn: {
          select: { uuid: true, returnNumber: true },
        },
        stockDisposal: {
          select: { uuid: true, disposalNumber: true },
        },
      },
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

  return { data: movements as unknown as StockMovementResponse[], meta }
}

export const updateSellingPrice = async (
  uuid: string,
  data: UpdatePriceInput,
  pharmacyId: number,
  userId: number
): Promise<StockResponse> => {
  const existing = await prisma.stock.findFirst({
    where: { uuid, pharmacyId },
    select: { id: true },
  })

  if (!existing) throw new NotFoundException('Stock not found')

  const stock = await prisma.stock.update({
    where: { id: existing.id },
    data: {
      sellingPrice: data.sellingPrice
        ? new Decimal(data.sellingPrice)
        : null,
      isManualPrice: data.sellingPrice !== null,
      updatedById: userId,
    },
    select: stockSelect,
  })

  return formatStock(stock)
}

export const updateReorderLevel = async (
  uuid: string,
  data: UpdateReorderLevelInput,
  pharmacyId: number,
  userId: number
): Promise<StockResponse> => {
  const existing = await prisma.stock.findFirst({
    where: { uuid, pharmacyId },
    select: { id: true },
  })

  if (!existing) throw new NotFoundException('Stock not found')

  const stock = await prisma.stock.update({
    where: { id: existing.id },
    data: {
      reorderLevel: data.reorderLevel,
      updatedById: userId,
    },
    select: stockSelect,
  })

  return formatStock(stock)
}

export const adjustStock = async (
  stockDetailUuid: string,
  data: AdjustStockInput,
  pharmacyId: number,
  userId: number
): Promise<StockResponse> => {
  const result = await prisma.$transaction(async (tx) => {

    // ── Get Stock Detail ──────────────────────────
    const stockDetail = await tx.stockDetail.findFirst({
      where: {
        uuid: stockDetailUuid,
        stock: { pharmacyId },
      },
      select: {
        id: true,
        quantityPieces: true,
        quantityPerBox: true,
        stockId: true,
        stock: {
          select: {
            id: true,
            totalPieces: true,
            medicineId: true,
          },
        },
      },
    })

    if (!stockDetail) throw new NotFoundException('Stock detail not found')

    // ── Validate Quantity ─────────────────────────
    if (data.quantity < 0) {
      throw new BadRequestException('Quantity cannot be negative')
    }

    // ── Resolve Signed By ─────────────────────────
    const signer = await tx.user.findFirst({
      where: { uuid: data.signedByUuid, deletedAt: null },
      select: {
        id: true,
        placements: {
          where: { pharmacyId, status: 'ACTIVE', deletedAt: null },
          select: {
            role: {
              select: {
                rolePermissions: {
                  where: { isEnabled: true },
                  select: { permission: { select: { module: true, action: true } } },
                },
              },
            },
          },
        },
      },
    })

    if (!signer || !signer.placements.length) throw new NotFoundException('Signer not found at this pharmacy')

    const hasSignPermission = signer.placements[0].role.rolePermissions.some(
      (rp) => rp.permission.module === 'sign'
    )
    if (!hasSignPermission) throw new ForbiddenException('Only authorized personnel can sign stock adjustments')

    // ── Calculate Adjustment ──────────────────────
    const quantityBefore = stockDetail.quantityPieces
    const quantityAfter = data.quantity  // absolute value
    const adjustment = quantityAfter - quantityBefore

    // ── Update Stock Detail ───────────────────────
    await tx.stockDetail.update({
      where: { id: stockDetail.id },
      data: {
        quantityPieces: quantityAfter,
        quantityBox: Math.floor(quantityAfter / stockDetail.quantityPerBox),
        updatedById: userId,
      },
    })

    // ── Update Stock Header ───────────────────────
    const stockQuantityBefore = stockDetail.stock.totalPieces
    const stockQuantityAfter = stockQuantityBefore + adjustment

    if (stockQuantityAfter < 0) {
      throw new BadRequestException('Adjustment would result in negative total stock')
    }

    await tx.stock.update({
      where: { id: stockDetail.stockId },
      data: {
        totalPieces: stockQuantityAfter,
        updatedById: userId,
      },
    })

    // ── Create Stock Movement ─────────────────────
    await tx.stockMovement.create({
      data: {
        pharmacyId,
        medicineId: stockDetail.stock.medicineId,
        stockId: stockDetail.stockId,
        stockDetailId: stockDetail.id,
        type: adjustment >= 0 ? 'IN' : 'OUT',
        reason: 'ADJUSTMENT',
        quantity: Math.abs(adjustment),
        quantityBefore: stockQuantityBefore,
        quantityAfter: stockQuantityAfter,
        description: data.description,
        createdById: userId,
      },
    })

    return stockDetail.stockId
  }, {
    timeout: 10000,
    maxWait: 5000,
  })

  const stock = await prisma.stock.findUnique({
    where: { id: result },
    select: stockSelect,
  })

  return formatStock(stock)
}

export const getCrossPharmacyStock = async (
  medicineUuid: string,
  userId: number,
  currentPharmacyId: number,
  platformRole: string | null
): Promise<CrossPharmacyStockResponse[]> => {
  // get user's assigned pharmacies
  let pharmacyIds: number[]

  if (platformRole === 'PLATFORM_ADMIN') {
    // platform admin sees all pharmacies
    const pharmacies = await prisma.pharmacy.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true },
    })
    pharmacyIds = pharmacies.map((p) => p.id)
  } else {
    // get assigned pharmacies from Placement
    const placements = await prisma.placement.findMany({
      where: { userId, status: 'ACTIVE' },
      select: { pharmacyId: true },
    })
    pharmacyIds = placements.map((up) => up.pharmacyId)
  }

  // find medicine in each pharmacy
  const stocks = await prisma.stock.findMany({
    where: {
      pharmacyId: { in: pharmacyIds },
      medicine: { uuid: medicineUuid },
    },
    select: {
      ...stockSelect,
      pharmacy: {
        select: { uuid: true, name: true, code: true },
      },
    },
  })

  return stocks.map((stock) => ({
    pharmacy: stock.pharmacy,
    totalPieces: stock.totalPieces,
    effectiveSellingPrice: getEffectiveSellingPrice(
      stock.sellingPrice,
      stock.calculatedPrice
    ),
    isLowStock: stock.totalPieces <= stock.reorderLevel,
    isCriticalStock: false, // cross-pharmacy view does not load per-pharmacy threshold
    details: stock.details,
  }))
}
