import { DateTime } from 'luxon'
import { prisma } from '@config/db'
import { getTimezone } from '@utils/generateDocNumbers'
import { resolveSigner } from '@utils/signer'
import {
  StockDetailQueryInput,
  StockCatalogQueryInput,
  StockQueryInput,
  StockMovementQueryInput,
  UpdatePriceInput,
  UpdateReorderLevelInput,
  AdjustStockInput,
  MedicineStockCardQueryInput,
} from './stock.validation'
import {
  StockDetailSearchResponse,
  StockResponse,
  StockAlertResponse,
  StockMovementResponse,
  CrossPharmacyStockResponse,
  BatchLabelResponse,
  MedicineStockCardDay,
  MedicineStockCardResponse,
} from './stock.interface'
import { NotFoundException } from '@exceptions/NotFoundException'
import { BadRequestException } from '@exceptions/BadRequestException'
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
  createdAt: true,
  updatedAt: true,
  medicine: {
    select: {
      uuid: true,
      name: true,
      unit: true,
      shape: { select: { name: true } },
      orderLetterKind: true,
      type: { select: { name: true, requiredPrescription: true, orderLetterKind: true } },
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

/** Item labels carry the batch code plus "-" and the item number, e.g. 4823519076241835-003. */
const ITEM_CODE = /^(.+)-(\d{1,4})$/

export const searchStockDetails = async (
  pharmacyId: number,
  query: StockDetailQueryInput
): Promise<StockDetailSearchResponse[]> => {
  const results = await findStockDetails(pharmacyId, query)
  const { barcode } = query
  if (!barcode) return results
  if (results.length > 0) {
    return results.map((r) => ({ ...r, scanMatch: r.barcode === barcode ? ('BATCH' as const) : ('MEDICINE' as const) }))
  }
  // Not a batch or medicine code: maybe one item of a batch.
  const item = ITEM_CODE.exec(barcode)
  if (!item) return []
  const batch = await findStockDetails(pharmacyId, { ...query, barcode: item[1] })
  return batch
    .filter((r) => r.barcode === item[1])
    .map((r) => ({ ...r, scanMatch: 'ITEM' as const }))
}

const findStockDetails = async (
  pharmacyId: number,
  query: StockDetailQueryInput
): Promise<StockDetailSearchResponse[]> => {
  const { search, medicineUuid, barcode } = query

  const where: any = {
    stock: { pharmacyId, ...(medicineUuid && { medicine: { uuid: medicineUuid } }) },
    quantityPieces: { gt: 0 },
    ...((medicineUuid || barcode) && { expiryDate: { gt: new Date() } }),
    // A scan: the batch with that code, or every sellable batch of the medicine with that code.
    ...(barcode && { OR: [{ barcode }, { stock: { medicine: { barcode } } }] }),
    ...(search && !barcode && {
      OR: [
        { stock: { medicine: { name: { contains: search, mode: 'insensitive' } } } },
        { barcode: { contains: search, mode: 'insensitive' } },
      ],
    }),
  }

  const details = await prisma.stockDetail.findMany({
    where,
    select: {
      id: true,
      uuid: true,
      barcode: true,
      batchNumber: true,
      expiryDate: true,
      quantityPieces: true,
      quantityBox: true,
      quantityPerBox: true,
      distributor: { select: { uuid: true, name: true } },
      stock: {
        select: {
          uuid: true,
          calculatedPrice: true,
          sellingPrice: true,
          medicine: {
            select: {
              uuid: true,
              name: true,
              unit: true,
              barcode: true,
              shape: { select: { name: true } },
              orderLetterKind: true,
      type: { select: { name: true, requiredPrescription: true, orderLetterKind: true } },
            },
          },
        },
      },
    },
    orderBy: barcode
      ? [{ expiryDate: 'asc' }]
      : [{ stock: { medicine: { name: 'asc' } } }, { expiryDate: 'asc' }],
    take: 20,
  })

  const reservationSums = await prisma.stockReservation.groupBy({
    by: ['stockDetailId'],
    where: { stockDetailId: { in: details.map((d) => d.id) } },
    _sum: { quantityPieces: true },
  })
  const reservedMap = new Map(
    reservationSums.map((r) => [r.stockDetailId, r._sum.quantityPieces ?? 0])
  )

  return details.map((d) => ({
    uuid: d.uuid,
    barcode: d.barcode,
    batchNumber: d.batchNumber,
    expiryDate: d.expiryDate,
    quantityPieces: d.quantityPieces,
    availablePieces: d.quantityPieces - (reservedMap.get(d.id) ?? 0),
    quantityBox: d.quantityBox,
    quantityPerBox: d.quantityPerBox,
    distributor: d.distributor,
    stock: {
      uuid: d.stock.uuid,
      effectiveSellingPrice: getEffectiveSellingPrice(d.stock.sellingPrice, d.stock.calculatedPrice),
    },
    medicine: d.stock.medicine,
  }))
}

export const getStockCatalog = async (
  pharmacyId: number,
  query: StockCatalogQueryInput
): Promise<{ data: StockDetailSearchResponse[]; meta: PaginationMeta }> => {
  const { search, medicineTypeUuid, page, limit } = query

  const skip = (page - 1) * limit

  const where: any = {
    stock: {
      pharmacyId,
      ...(medicineTypeUuid && { medicine: { type: { uuid: medicineTypeUuid } } }),
    },
    quantityPieces: { gt: 0 },
    expiryDate: { gt: new Date() },
    ...(search && {
      OR: [
        { stock: { medicine: { name: { contains: search, mode: 'insensitive' } } } },
        { barcode: { contains: search, mode: 'insensitive' } },
      ],
    }),
  }

  const select = {
    id: true,
    uuid: true,
    barcode: true,
    batchNumber: true,
    expiryDate: true,
    quantityPieces: true,
    quantityBox: true,
    quantityPerBox: true,
    distributor: { select: { uuid: true, name: true } },
    stock: {
      select: {
        uuid: true,
        calculatedPrice: true,
        sellingPrice: true,
        medicine: {
          select: {
            uuid: true,
            name: true,
            unit: true,
            shape: { select: { name: true } },
            orderLetterKind: true,
      type: { select: { name: true, requiredPrescription: true, orderLetterKind: true } },
          },
        },
      },
    },
  }

  const [details, total] = await prisma.$transaction([
    prisma.stockDetail.findMany({
      where,
      select,
      orderBy: [
        { stock: { medicine: { name: 'asc' } } },
        { expiryDate: 'asc' },
      ],
      skip,
      take: limit,
    }),
    prisma.stockDetail.count({ where }),
  ])

  const meta: PaginationMeta = {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  }

  const reservationSums = await prisma.stockReservation.groupBy({
    by: ['stockDetailId'],
    where: { stockDetailId: { in: details.map((d) => d.id) } },
    _sum: { quantityPieces: true },
  })
  const reservedMap = new Map(
    reservationSums.map((r) => [r.stockDetailId, r._sum.quantityPieces ?? 0])
  )

  const data = details.map((d) => ({
    uuid: d.uuid,
    barcode: d.barcode,
    batchNumber: d.batchNumber,
    expiryDate: d.expiryDate,
    quantityPieces: d.quantityPieces,
    availablePieces: d.quantityPieces - (reservedMap.get(d.id) ?? 0),
    quantityBox: d.quantityBox,
    quantityPerBox: d.quantityPerBox,
    distributor: d.distributor,
    stock: {
      uuid: d.stock.uuid,
      effectiveSellingPrice: getEffectiveSellingPrice(d.stock.sellingPrice, d.stock.calculatedPrice),
    },
    medicine: d.stock.medicine,
  }))

  return { data, meta }
}

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
        saleDetail: {
          select: { uuid: true, sale: { select: { uuid: true, saleNumber: true } } },
        },
        stockReturnDetail: {
          select: { uuid: true, stockReturn: { select: { uuid: true, returnNumber: true } } },
        },
        stockDisposalDetail: {
          select: { uuid: true, stockDisposal: { select: { uuid: true, disposalNumber: true } } },
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

    // ── Signed By: a pharmacist with an active SIPA confirms the correction ──
    await resolveSigner(tx, { uuid: data.signedByUuid }, pharmacyId, 'PHARMACIST')

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

/** What a printed batch, item or medicine label needs about one batch. */
export const getBatchLabel = async (stockDetailUuid: string, pharmacyId: number): Promise<BatchLabelResponse> => {
  const d = await prisma.stockDetail.findFirst({
    where: { uuid: stockDetailUuid, stock: { pharmacyId } },
    select: {
      uuid: true,
      batchNumber: true,
      barcode: true,
      expiryDate: true,
      quantityPieces: true,
      quantityPerBox: true,
      distributor: { select: { name: true } },
      bin: { select: { code: true, shelf: { select: { code: true, cabinet: { select: { name: true } } } } } },
      stock: {
        select: {
          reorderLevel: true,
          totalPieces: true,
          sellingPrice: true,
          calculatedPrice: true,
          pharmacy: { select: { name: true, code: true } },
          medicine: {
            select: {
              uuid: true,
              name: true,
              unit: true,
              barcode: true,
              shape: { select: { name: true } },
              orderLetterKind: true,
              type: { select: { name: true, isControlled: true, requiredPrescription: true, orderLetterKind: true } },
              medicineClass: { select: { name: true } },
            },
          },
        },
      },
    },
  })
  if (!d) throw new NotFoundException('Stock detail not found')

  const med = d.stock.medicine
  const bin = d.bin
  return {
    pharmacy: d.stock.pharmacy,
    medicine: {
      uuid: med.uuid,
      name: med.name,
      unit: med.unit,
      barcode: med.barcode,
      shape: med.shape.name,
      type: med.type.name,
      isControlled: med.type.isControlled,
      orderLetterKind: med.orderLetterKind ?? med.type.orderLetterKind,
      requiredPrescription: med.type.requiredPrescription,
      therapeuticClass: med.medicineClass.name,
    },
    batch: {
      uuid: d.uuid,
      batchNumber: d.batchNumber,
      barcode: d.barcode,
      expiryDate: d.expiryDate,
      quantityPieces: d.quantityPieces,
      quantityPerBox: d.quantityPerBox,
      distributor: d.distributor.name,
      location: bin ? `${bin.shelf.cabinet.name} · ${bin.shelf.code} · ${bin.code}` : null,
    },
    reorderLevel: d.stock.reorderLevel,
    medicineTotalPieces: d.stock.totalPieces,
    sellingPrice: getEffectiveSellingPrice(d.stock.sellingPrice, d.stock.calculatedPrice),
  }
}

/**
 * A medicine's stock card over a period, one row per day that had movements
 * (all batches together). Balances are anchored to today's total stock and
 * rebuilt backwards, so stock brought in before movements were logged still
 * shows as the opening balance.
 */
export const getMedicineStockCard = async (
  medicineUuid: string,
  pharmacyId: number,
  query: MedicineStockCardQueryInput
): Promise<MedicineStockCardResponse> => {
  const stock = await prisma.stock.findFirst({
    where: { pharmacyId, medicine: { uuid: medicineUuid } },
    select: {
      id: true,
      reorderLevel: true,
      totalPieces: true,
      sellingPrice: true,
      calculatedPrice: true,
      pharmacy: { select: { name: true, code: true } },
      medicine: {
        select: {
          uuid: true,
          name: true,
          unit: true,
          barcode: true,
          shape: { select: { name: true } },
          orderLetterKind: true,
              type: { select: { name: true, isControlled: true, requiredPrescription: true, orderLetterKind: true } },
          medicineClass: { select: { name: true } },
        },
      },
      details: {
        where: { quantityPieces: { gt: 0 } },
        orderBy: { expiryDate: 'asc' },
        select: {
          batchNumber: true,
          expiryDate: true,
          quantityPieces: true,
          quantityPerBox: true,
          bin: { select: { code: true, shelf: { select: { code: true, cabinet: { select: { name: true } } } } } },
        },
      },
    },
  })
  if (!stock) throw new NotFoundException('Stock not found')

  const zone = await getTimezone()
  const today = DateTime.now().setZone(zone)
  const from = query.from ? DateTime.fromISO(query.from, { zone }) : today.startOf('month')
  const to = query.to ? DateTime.fromISO(query.to, { zone }) : today
  const start = from.startOf('day').toUTC().toJSDate()
  const end = to.endOf('day').toUTC().toJSDate()

  const movements = await prisma.stockMovement.findMany({
    where: { stockId: stock.id, createdAt: { gte: start } },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    select: {
      createdAt: true,
      type: true,
      reason: true,
      quantity: true,
      invoiceDetail: { select: { invoice: { select: { invoiceNumber: true } } } },
      stockReturnDetail: { select: { stockReturn: { select: { returnNumber: true } } } },
      stockDisposalDetail: { select: { stockDisposal: { select: { disposalNumber: true } } } },
    },
  })
  const signed = (m: { type: string; quantity: number }): number => (m.type === 'IN' ? m.quantity : -m.quantity)
  const inPeriod = movements.filter((m) => m.createdAt <= end)
  const afterPeriod = movements.length - inPeriod.length
  const closingBalance = stock.totalPieces - movements.slice(inPeriod.length).reduce((s, m) => s + signed(m), 0)
  const openingBalance = closingBalance - inPeriod.reduce((s, m) => s + signed(m), 0)

  const days = new Map<string, MedicineStockCardDay>()
  let balance = openingBalance
  for (const m of inPeriod) {
    const key = DateTime.fromJSDate(m.createdAt).setZone(zone).toISODate()!
    let day = days.get(key)
    if (!day) {
      day = { date: key, in: 0, out: 0, balance: 0, documents: [], sales: 0, adjustments: 0 }
      days.set(key, day)
    }
    if (m.type === 'IN') day.in += m.quantity
    else day.out += m.quantity
    balance += signed(m)
    day.balance = balance
    const doc =
      m.invoiceDetail?.invoice.invoiceNumber ??
      m.stockReturnDetail?.stockReturn.returnNumber ??
      m.stockDisposalDetail?.stockDisposal.disposalNumber
    if (doc) {
      if (!day.documents.includes(doc)) day.documents.push(doc)
    } else if (m.reason === 'SALE') day.sales += 1
    else day.adjustments += 1
  }

  const med = stock.medicine
  return {
    pharmacy: stock.pharmacy,
    medicine: {
      uuid: med.uuid,
      name: med.name,
      unit: med.unit,
      barcode: med.barcode,
      shape: med.shape.name,
      type: med.type.name,
      isControlled: med.type.isControlled,
      orderLetterKind: med.orderLetterKind ?? med.type.orderLetterKind,
      requiredPrescription: med.type.requiredPrescription,
      therapeuticClass: med.medicineClass.name,
    },
    reorderLevel: stock.reorderLevel,
    totalPieces: stock.totalPieces,
    quantityPerBox: Math.max(1, ...stock.details.map((d) => d.quantityPerBox)),
    sellingPrice: getEffectiveSellingPrice(stock.sellingPrice, stock.calculatedPrice),
    batches: stock.details.map((d) => ({
      batchNumber: d.batchNumber,
      expiryDate: d.expiryDate,
      quantityPieces: d.quantityPieces,
      location: d.bin ? `${d.bin.shelf.cabinet.name} · ${d.bin.shelf.code} · ${d.bin.code}` : null,
    })),
    period: { from: from.toISODate()!, to: to.toISODate()! },
    openingBalance,
    closingBalance,
    movementsAfterPeriod: afterPeriod,
    days: [...days.values()],
  }
}
