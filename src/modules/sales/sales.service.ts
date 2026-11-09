import { SaleStatus, SaleType, PaymentStatus, PrescriptionStatus, PrescriptionDetailStatus, Prisma } from '@prisma/client'
import { prisma } from '@config/db'
import {
  CreateSaleInput,
  UpdateSaleInput,
  CancelSaleInput,
  AddPaymentInput,
  UpdatePaymentHistoryInput,
  SaleQueryInput,
  InlinePrescriptionInput,
} from './sales.validation'
import { SalePaymentResponse, SaleResponse } from './sales.interface'
import { NotFoundException } from '@exceptions/NotFoundException'
import { BadRequestException } from '@exceptions/BadRequestException'
import { ConflictException } from '@exceptions/ConflictException'
import { ForbiddenException } from '@exceptions/ForbiddenException'
import { PaginationMeta } from '@interfaces/common.interface'
import { generateDocNumber, withDocNumberRetry } from '@utils/generateDocNumbers'
import { Decimal } from '@prisma/client/runtime/library'

// ── Helpers ───────────────────────────────────────────

const saleSelect = {
  uuid: true,
  saleNumber: true,
  saleType: true,
  status: true,
  totalAmount: true,
  discountPercentage: true,
  discountAmount: true,
  ppnPercentage: true,
  ppnAmount: true,
  grandTotal: true,
  paidAmount: true,
  dueDate: true,
  description: true,
  soldAt: true,
  createdAt: true,
  customer: {
    select: { uuid: true, name: true, customerType: true, isWalkIn: true },
  },
  details: {
    select: {
      uuid: true,
      quantityPieces: true,
      quantityBox: true,
      sellingPrice: true,
      originalPrice: true,
      discountPercentage: true,
      discountAmount: true,
      totalAmount: true,
      isFefoOverride: true,
      requiresPrescription: true,
      medicine: {
        select: { uuid: true, name: true, unit: true },
      },
      stockDetail: {
        select: { uuid: true, batchNumber: true, expiryDate: true },
      },
    },
  },
  payment: {
    select: {
      uuid: true,
      totalAmount: true,
      paidAmount: true,
      paymentStatus: true,
      history: {
        select: {
          uuid: true,
          amount: true,
          paymentMethod: true,
          paymentDate: true,
          description: true,
        },
        orderBy: { createdAt: 'asc' as const },
      },
    },
  },
  prescription: {
    select: {
      uuid: true,
      prescriptionNumber: true,
      prescribedAt: true,
      doctor: { select: { uuid: true, name: true } },
    },
  },
}

const formatSale = (sale: Prisma.SaleGetPayload<{ select: typeof saleSelect }>): SaleResponse => ({
  ...sale,
  totalAmount: parseFloat(sale.totalAmount.toString()),
  discountPercentage: parseFloat(sale.discountPercentage.toString()),
  discountAmount: parseFloat(sale.discountAmount.toString()),
  ppnPercentage: parseFloat(sale.ppnPercentage.toString()),
  ppnAmount: parseFloat(sale.ppnAmount.toString()),
  grandTotal: parseFloat(sale.grandTotal.toString()),
  paidAmount: parseFloat(sale.paidAmount.toString()),
  details: sale.details.map((d) => ({
    ...d,
    sellingPrice: parseFloat(d.sellingPrice.toString()),
    originalPrice: parseFloat(d.originalPrice.toString()),
    discountPercentage: parseFloat(d.discountPercentage.toString()),
    discountAmount: parseFloat(d.discountAmount.toString()),
    totalAmount: parseFloat(d.totalAmount.toString()),
  })),
  payment: sale.payment
    ? {
        ...sale.payment,
        totalAmount: parseFloat(sale.payment.totalAmount.toString()),
        paidAmount: parseFloat(sale.payment.paidAmount.toString()),
        history: sale.payment.history.map((h) => ({
          ...h,
          amount: parseFloat(h.amount.toString()),
        })),
      }
    : null,
  prescription: sale.prescription ?? null,
})

const salePaymentSelect = {
  uuid: true,
  totalAmount: true,
  paidAmount: true,
  paymentStatus: true,
  history: {
    select: {
      uuid: true,
      amount: true,
      paymentMethod: true,
      paymentDate: true,
      description: true,
    },
    orderBy: { createdAt: 'asc' as const },
  },
}

const formatSalePayment = (p: any): SalePaymentResponse => ({
  ...p,
  totalAmount: parseFloat(p.totalAmount.toString()),
  paidAmount: parseFloat(p.paidAmount.toString()),
  history: p.history.map((h: any) => ({ ...h, amount: parseFloat(h.amount.toString()) })),
})

// ── Prescription Helpers ──────────────────────────────

const resolvePrescriptionId = async (
  tx: Prisma.TransactionClient,
  opts: {
    prescriptionUuid?: string
    prescription?: InlinePrescriptionInput
    existingPrescriptionId?: number | null
    isPrescription?: boolean
    isPending?: boolean
    medicineIds: number[]
    pharmacyId: number
    customerId: number
    userId: number
  }
): Promise<number | undefined> => {
  const { prescriptionUuid, prescription, existingPrescriptionId, isPrescription, isPending, medicineIds, pharmacyId, customerId, userId } = opts

  // Only check required medicines when the sale is being finalised
  const rxMedicines = isPending
    ? []
    : await tx.medicine.findMany({
        where: { id: { in: medicineIds }, type: { requiredPrescription: true } },
        select: { id: true, name: true },
      })

  const prescriptionRequired = !isPending && (rxMedicines.length > 0 || !!isPrescription)

  if (prescriptionUuid) {
    const rx = await tx.prescription.findFirst({
      where: { uuid: prescriptionUuid, pharmacyId, deletedAt: null },
      select: { id: true, status: true },
    })
    if (!rx) throw new NotFoundException('Prescription not found')
    if (rx.status === PrescriptionStatus.DISPENSED || rx.status === PrescriptionStatus.CANCELLED || rx.status === PrescriptionStatus.EXPIRED) {
      throw new BadRequestException('Prescription is not available for use')
    }
    return rx.id
  }

  if (prescription) {
    let doctorId: number | undefined
    if (prescription.doctorUuid) {
      const doctor = await tx.doctor.findFirst({
        where: { uuid: prescription.doctorUuid, pharmacyId, deletedAt: null, status: 'ACTIVE' },
        select: { id: true },
      })
      if (!doctor) throw new NotFoundException('Doctor not found')
      doctorId = doctor.id
    }

    const medUuids = prescription.items.filter((i) => i.medicineUuid).map((i) => i.medicineUuid!)
    const medicines = medUuids.length
      ? await tx.medicine.findMany({
          where: { uuid: { in: medUuids }, pharmacyId, deletedAt: null },
          select: { id: true, uuid: true },
        })
      : []
    const uuidToId = new Map(medicines.map((m) => [m.uuid, m.id]))

    const createdRx = await tx.prescription.create({
      data: {
        pharmacyId,
        customerId,
        doctorId,
        prescriptionNumber: prescription.prescriptionNumber,
        prescribedAt: prescription.prescribedAt,
        notes: prescription.notes,
        status: PrescriptionStatus.DISPENSED,
        createdById: userId,
        details: {
          create: prescription.items.map((item) => ({
            medicineName: item.medicineName,
            medicineId: item.medicineUuid ? (uuidToId.get(item.medicineUuid) ?? null) : null,
            frequency: item.frequency,
            duration: item.duration,
            qty: item.qty,
            dispensedQty: item.qty,
            status: PrescriptionDetailStatus.DISPENSED,
            notes: item.notes,
            createdById: userId,
          })),
        },
      },
      select: { id: true },
    })
    return createdRx.id
  }

  if (existingPrescriptionId) return existingPrescriptionId

  if (prescriptionRequired) {
    const names = rxMedicines.map((m) => m.name).join(', ')
    throw new BadRequestException(names ? `Prescription required for: ${names}` : 'Prescription is required for this sale')
  }
  return undefined
}

// ── Sale Pricing & Stock Helpers ──────────────────────
//
// The server is the authority on money: unit prices come from Stock, line and
// header totals are computed here, PPN comes from the pharmacy's parameters.
// Client-sent totals are ignored. A client-sent unit price or discount is only
// honoured when it matches the list price / stays within MAX_DISCOUNT_PERCENTAGE,
// unless the caller holds sales.override_price.

export interface SaleActor {
  userId: number
  canOverridePrice: boolean
}

interface SaleContext {
  allowExpiredSale: boolean
  allowFefoOverride: boolean
  creditPaymentDays: number
  ppnPercentage: Decimal
  maxDiscountPercentage: Decimal
}

const HUNDRED = new Decimal(100)
const money = (d: Decimal): Decimal => d.toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
const toDecimal = (v: number | undefined | null): Decimal => new Decimal(v ?? 0)

const loadSaleContext = async (pharmacyId: number): Promise<SaleContext> => {
  const param = (key: string) =>
    prisma.businessParameter.findUnique({ where: { pharmacyId_key: { pharmacyId, key } }, select: { value: true } })

  const [allowExpiredParam, allowFefoParam, creditDaysParam, ppnParam, maxDiscountParam] = await Promise.all([
    prisma.systemParameter.findUnique({ where: { key: 'ALLOW_EXPIRED_MEDICINE_SALE' }, select: { value: true } }),
    param('ALLOW_FEFO_OVERRIDE'),
    param('CREDIT_PAYMENT_DAYS'),
    param('PPN_PERCENTAGE_SELL'),
    param('MAX_DISCOUNT_PERCENTAGE'),
  ])

  const decimalOr = (raw: string | undefined, fallback: number): Decimal => {
    const n = Number(raw)
    return Number.isFinite(n) && n >= 0 ? new Decimal(n) : new Decimal(fallback)
  }

  return {
    allowExpiredSale: allowExpiredParam?.value === 'true',
    allowFefoOverride: allowFefoParam?.value !== 'false',
    creditPaymentDays: parseInt(creditDaysParam?.value ?? '30', 10),
    ppnPercentage: decimalOr(ppnParam?.value, 0),
    // Missing parameter = no discount without override permission.
    maxDiscountPercentage: decimalOr(maxDiscountParam?.value, 0),
  }
}

type SaleLineInput = CreateSaleInput['details'][number]

type SaleDetailDraft = {
  stockDetailId: number
  medicineId: number
  quantityPieces: number
  quantityBox: number
  sellingPrice: Decimal
  originalPrice: Decimal
  discountPercentage: Decimal
  discountAmount: Decimal
  totalAmount: Decimal
  isFefoOverride: boolean
  requiresPrescription: boolean
  createdById: number
  _stockId: number
  _medicineLabel: string
}

const stripDraft = ({ _stockId, _medicineLabel, ...d }: SaleDetailDraft) => d

/**
 * Validates each requested line against live stock (pharmacy scope, FEFO,
 * expiry, availability net of reservations) and prices it server-side.
 * Callers updating an existing sale must release that sale's reservations first.
 */
const buildSaleLines = async (
  tx: Prisma.TransactionClient,
  details: SaleLineInput[],
  pharmacyId: number,
  ctx: SaleContext,
  actor: SaleActor
): Promise<SaleDetailDraft[]> => {
  const lines: SaleDetailDraft[] = []
  // The same batch may appear on several lines — check availability cumulatively.
  const requestedByBatch = new Map<number, number>()

  for (const detail of details) {
    const stockDetail = await tx.stockDetail.findFirst({
      where: { uuid: detail.stockDetailUuid, stock: { pharmacyId } },
      select: {
        id: true,
        batchNumber: true,
        quantityPieces: true,
        quantityPerBox: true,
        expiryDate: true,
        stockId: true,
        stock: {
          select: {
            medicineId: true,
            sellingPrice: true,
            calculatedPrice: true,
            medicine: { select: { name: true, type: { select: { requiredPrescription: true } } } },
          },
        },
      },
    })
    if (!stockDetail) throw new NotFoundException('Stock detail not found')

    const label = `${stockDetail.stock.medicine.name} (batch ${stockDetail.batchNumber})`

    if (detail.isFefoOverride && !ctx.allowFefoOverride) {
      throw new BadRequestException('FEFO override is not allowed. Items must be sold in expiry order.')
    }
    if (!ctx.allowExpiredSale && stockDetail.expiryDate < new Date()) {
      throw new BadRequestException(`Medicine batch is expired: ${label}`)
    }

    const reservedAgg = await tx.stockReservation.aggregate({
      where: { stockDetailId: stockDetail.id },
      _sum: { quantityPieces: true },
    })
    const available = stockDetail.quantityPieces - (reservedAgg._sum.quantityPieces ?? 0)
    const requested = (requestedByBatch.get(stockDetail.id) ?? 0) + detail.quantityPieces
    if (requested > available) {
      throw new BadRequestException(`Insufficient stock for ${label}: ${Math.max(available, 0)} available`)
    }
    requestedByBatch.set(stockDetail.id, requested)

    // ── Price ───────────────────────────────────────
    const listPrice = money(new Decimal((stockDetail.stock.sellingPrice ?? stockDetail.stock.calculatedPrice).toString()))
    const unitPrice = detail.sellingPrice !== undefined ? money(toDecimal(detail.sellingPrice)) : listPrice
    if (!unitPrice.eq(listPrice) && !actor.canOverridePrice) {
      throw new ForbiddenException('PRICE_OVERRIDE_NOT_ALLOWED')
    }
    if (unitPrice.lte(0)) throw new BadRequestException('Selling price must be positive')

    const discountPct = toDecimal(detail.discountPercentage)
    if (discountPct.gt(ctx.maxDiscountPercentage) && !actor.canOverridePrice) {
      throw new ForbiddenException(`Discount exceeds the ${ctx.maxDiscountPercentage.toString()}% limit for your role`)
    }

    const gross = unitPrice.mul(detail.quantityPieces)
    const lineDiscount = money(gross.mul(discountPct).div(HUNDRED))

    lines.push({
      stockDetailId: stockDetail.id,
      medicineId: stockDetail.stock.medicineId,
      quantityPieces: detail.quantityPieces,
      quantityBox: Math.floor(detail.quantityPieces / Math.max(stockDetail.quantityPerBox, 1)),
      sellingPrice: unitPrice,
      originalPrice: listPrice,
      discountPercentage: money(discountPct),
      discountAmount: lineDiscount,
      totalAmount: money(gross.sub(lineDiscount)),
      isFefoOverride: detail.isFefoOverride ?? false,
      // Derived from the medicine type, never from the client.
      requiresPrescription: stockDetail.stock.medicine.type?.requiredPrescription ?? false,
      createdById: actor.userId,
      _stockId: stockDetail.stockId,
      _medicineLabel: label,
    })
  }

  return lines
}

interface SaleTotals {
  totalAmount: Decimal
  discountPercentage: Decimal
  discountAmount: Decimal
  ppnPercentage: Decimal
  ppnAmount: Decimal
  grandTotal: Decimal
}

/** subtotal − header discount = DPP; PPN is charged on the DPP. */
const computeSaleTotals = (
  lines: SaleDetailDraft[],
  header: { discountPercentage?: number; discountAmount?: number },
  ctx: SaleContext,
  actor: SaleActor
): SaleTotals => {
  const subtotal = lines.reduce((sum, l) => sum.add(l.totalAmount), new Decimal(0))
  const headerPct = toDecimal(header.discountPercentage)
  let discount = money(toDecimal(header.discountAmount).add(subtotal.mul(headerPct).div(HUNDRED)))
  if (discount.gt(subtotal)) discount = subtotal

  if (discount.gt(0) && !actor.canOverridePrice && subtotal.gt(0)) {
    const effectivePct = discount.mul(HUNDRED).div(subtotal)
    if (effectivePct.gt(ctx.maxDiscountPercentage)) {
      throw new ForbiddenException(`Discount exceeds the ${ctx.maxDiscountPercentage.toString()}% limit for your role`)
    }
  }

  const dpp = subtotal.sub(discount)
  const ppnAmount = money(dpp.mul(ctx.ppnPercentage).div(HUNDRED))
  const grandTotal = money(dpp.add(ppnAmount))
  if (grandTotal.lte(0)) throw new BadRequestException('GRAND_TOTAL_MUST_BE_POSITIVE')

  return {
    totalAmount: money(subtotal),
    discountPercentage: money(headerPct),
    discountAmount: discount,
    ppnPercentage: ctx.ppnPercentage,
    ppnAmount,
    grandTotal,
  }
}

/**
 * Deducts stock atomically: the UPDATE only succeeds while enough pieces remain,
 * so two concurrent sales can never drive a batch negative. The movement log
 * records the quantities actually read back after the locked update, which keeps
 * quantityBefore/After correct for multi-line carts and concurrent sales alike.
 */
const deductStockForSale = async (
  tx: Prisma.TransactionClient,
  lines: SaleDetailDraft[],
  saleDetailIds: number[],
  pharmacyId: number,
  userId: number
): Promise<void> => {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const qty = line.quantityPieces

    const detailRes = await tx.stockDetail.updateMany({
      where: { id: line.stockDetailId, quantityPieces: { gte: qty } },
      data: { quantityPieces: { decrement: qty }, updatedById: userId },
    })
    if (detailRes.count === 0) {
      throw new BadRequestException(`Insufficient stock for ${line._medicineLabel}: stock changed, please refresh`)
    }
    const detailAfter = await tx.stockDetail.findUniqueOrThrow({
      where: { id: line.stockDetailId },
      select: { quantityPieces: true, quantityPerBox: true },
    })
    await tx.stockDetail.update({
      where: { id: line.stockDetailId },
      data: { quantityBox: Math.floor(detailAfter.quantityPieces / Math.max(detailAfter.quantityPerBox, 1)) },
    })

    const stockRes = await tx.stock.updateMany({
      where: { id: line._stockId, totalPieces: { gte: qty } },
      data: { totalPieces: { decrement: qty }, updatedById: userId },
    })
    if (stockRes.count === 0) {
      throw new BadRequestException(`Insufficient stock for ${line._medicineLabel}: stock changed, please refresh`)
    }
    const stockAfter = await tx.stock.findUniqueOrThrow({
      where: { id: line._stockId },
      select: { totalPieces: true },
    })

    await tx.stockMovement.create({
      data: {
        pharmacyId,
        medicineId: line.medicineId,
        stockId: line._stockId,
        stockDetailId: line.stockDetailId,
        saleDetailId: saleDetailIds[i],
        type: 'OUT',
        reason: 'SALE',
        quantity: qty,
        quantityBefore: stockAfter.totalPieces + qty,
        quantityAfter: stockAfter.totalPieces,
        createdById: userId,
      },
    })
  }
}

const createSalePaymentRecord = async (
  tx: Prisma.TransactionClient,
  saleId: number,
  saleType: SaleType,
  grandTotal: Decimal,
  payment: CreateSaleInput['payment'],
  soldAt: Date,
  userId: number
): Promise<void> => {
  if (saleType === SaleType.CASH) {
    await tx.salePayment.create({
      data: {
        saleId,
        totalAmount: grandTotal,
        paidAmount: grandTotal,
        paymentStatus: PaymentStatus.PAID,
        createdById: userId,
        history: {
          create: {
            amount: grandTotal,
            paymentMethod: payment!.paymentMethod,
            paymentDate: soldAt,
            description: payment?.description,
            createdById: userId,
          },
        },
      },
    })
  } else {
    await tx.salePayment.create({
      data: {
        saleId,
        totalAmount: grandTotal,
        paidAmount: new Decimal(0),
        paymentStatus: PaymentStatus.UNPAID,
        createdById: userId,
      },
    })
  }
}

const resolveSaleCustomer = async (
  tx: Prisma.TransactionClient,
  customerUuid: string | undefined,
  pharmacyId: number
): Promise<number | undefined> => {
  if (!customerUuid) return undefined
  const party = await tx.customer.findFirst({
    where: { uuid: customerUuid, pharmacyId, status: 'ACTIVE' },
    select: { id: true, isWalkIn: true },
  })
  if (!party) throw new NotFoundException('Party not found')
  if (party.isWalkIn) throw new BadRequestException('Omit partyUuid for walk-in sales')
  return party.id
}

const dueDateFor = (saleType: SaleType, soldAt: Date, creditDays: number): Date | undefined => {
  if (saleType !== SaleType.CREDIT) return undefined
  const due = new Date(soldAt)
  due.setDate(due.getDate() + creditDays)
  return due
}

// ── Services ──────────────────────────────────────────

export const getSales = async (
  pharmacyId: number,
  query: SaleQueryInput
): Promise<{ data: SaleResponse[]; meta: PaginationMeta }> => {
  const {
    search,
    status,
    saleType,
    paymentStatus,
    customerUuid,
    dateFrom,
    dateTo,
    sortBy,
    sortOrder,
    page,
    limit,
  } = query

  const skip = (page - 1) * limit

  let customerId: number | undefined
  if (customerUuid) {
    const party = await prisma.customer.findFirst({
      where: { uuid: customerUuid, pharmacyId },
      select: { id: true },
    })
    customerId = party?.id
  }

  const where = {
    pharmacyId,
    deletedAt: null,
    ...(status && { status }),
    ...(saleType && { saleType }),
    ...(customerId && { customerId }),
    ...(dateFrom && { soldAt: { gte: new Date(dateFrom) } }),
    ...(dateTo && { soldAt: { lte: new Date(dateTo) } }),
    ...(paymentStatus && {
      payment: { paymentStatus },
    }),
    ...(search && {
      OR: [
        { saleNumber: { contains: search, mode: 'insensitive' as const } },
        {
          party: {
            name: { contains: search, mode: 'insensitive' as const },
          },
        },
      ],
    }),
  }

  const [sales, total] = await prisma.$transaction([
    prisma.sale.findMany({
      where,
      select: saleSelect,
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    }),
    prisma.sale.count({ where }),
  ])

  const meta: PaginationMeta = {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  }

  return { data: sales.map(formatSale), meta }
}

export const getSaleByUuid = async (
  uuid: string,
  pharmacyId: number
): Promise<SaleResponse> => {
  const sale = await prisma.sale.findFirst({
    where: { uuid, pharmacyId, deletedAt: null },
    select: saleSelect,
  })

  if (!sale) throw new NotFoundException('Sale not found')

  return formatSale(sale)
}

export const createSale = async (
  data: CreateSaleInput,
  pharmacyId: number,
  actor: SaleActor
): Promise<SaleResponse> => {
  const userId = actor.userId
  const ctx = await loadSaleContext(pharmacyId)

  const createdSale = await withDocNumberRetry('SL', () => prisma.$transaction(async (tx) => {

    // ── Resolve Party ────────────────────────────
    let customerId = await resolveSaleCustomer(tx, data.customerUuid, pharmacyId)
    if (customerId === undefined) {
      const walkIn = await tx.customer.findFirst({
        where: { pharmacyId, isWalkIn: true },
        select: { id: true },
      })
      if (!walkIn) throw new NotFoundException('Walk-in party not found')
      customerId = walkIn.id
    }

    // ── Get Pharmacy Code ─────────────────────────
    const pharmacy = await tx.pharmacy.findUnique({
      where: { id: pharmacyId },
      select: { code: true },
    })
    if (!pharmacy) throw new NotFoundException('Pharmacy not found')

    const saleNumber = await generateDocNumber({
      type: 'SL',
      pharmacyId,
      pharmacyCode: pharmacy.code,
    })

    // ── Lines & totals (server-priced) ────────────
    const lines = await buildSaleLines(tx, data.details, pharmacyId, ctx, actor)
    const totals = computeSaleTotals(lines, data, ctx, actor)

    // ── Prescription Gate ─────────────────────────
    const prescriptionId = await resolvePrescriptionId(tx, {
      prescriptionUuid: data.prescriptionUuid,
      prescription: data.prescription,
      isPrescription: data.isPrescription,
      isPending: data.isPending,
      medicineIds: [...new Set(lines.map((d) => d.medicineId))],
      pharmacyId,
      customerId,
      userId,
    })

    const saleType = data.saleType ?? SaleType.CASH
    const isCashCompleted = !data.isPending && saleType === SaleType.CASH
    const soldAt = new Date()
    const dueDate = data.isPending ? undefined : dueDateFor(saleType, soldAt, ctx.creditPaymentDays)

    // ── Create Sale ───────────────────────────────
    const sale = await tx.sale.create({
      data: {
        pharmacyId,
        customerId,
        saleNumber,
        ...(prescriptionId && { prescriptionId }),
        saleType,
        status: data.isPending ? SaleStatus.PENDING : SaleStatus.COMPLETED,
        ...totals,
        paidAmount: isCashCompleted ? totals.grandTotal : new Decimal(0),
        dueDate,
        soldAt,
        description: data.description,
        createdById: userId,
        details: { create: lines.map(stripDraft) },
      },
      select: { id: true, details: { select: { id: true }, orderBy: { id: 'asc' } } },
    })

    // Link inline prescription back to this sale
    if (data.prescription && prescriptionId) {
      await tx.prescription.update({
        where: { id: prescriptionId },
        data: { saleId: sale.id },
      })
    }

    if (data.isPending) {
      // ── Reserve stock for the held sale ───────────
      for (const line of lines) {
        await tx.stockReservation.create({
          data: {
            pharmacyId,
            saleId: sale.id,
            stockId: line._stockId,
            stockDetailId: line.stockDetailId,
            medicineId: line.medicineId,
            quantityPieces: line.quantityPieces,
            createdById: userId,
          },
        })
      }
    } else {
      await deductStockForSale(tx, lines, sale.details.map((d) => d.id), pharmacyId, userId)
      await createSalePaymentRecord(tx, sale.id, saleType, totals.grandTotal, data.payment, soldAt, userId)
    }

    return sale
  }, { timeout: 15000, maxWait: 5000 }))

  const fullSale = await prisma.sale.findUnique({
    where: { id: createdSale.id },
    select: saleSelect,
  })

  return formatSale(fullSale!)
}

export const completeSale = async (
  uuid: string,
  data: CreateSaleInput,
  pharmacyId: number,
  actor: SaleActor
): Promise<SaleResponse> => {
  const userId = actor.userId
  const ctx = await loadSaleContext(pharmacyId)

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.sale.findFirst({
      where: { uuid, pharmacyId, deletedAt: null },
      select: { id: true, status: true, customerId: true, prescriptionId: true },
    })

    if (!existing) throw new NotFoundException('Sale not found')
    if (existing.status !== SaleStatus.PENDING) {
      throw new BadRequestException('Only pending sales can be completed')
    }

    const customerId = (await resolveSaleCustomer(tx, data.customerUuid, pharmacyId)) ?? existing.customerId

    // ── Release this sale's reservations, then re-validate against live stock ──
    await tx.stockReservation.deleteMany({ where: { saleId: existing.id } })
    const lines = await buildSaleLines(tx, data.details, pharmacyId, ctx, actor)
    const totals = computeSaleTotals(lines, data, ctx, actor)

    // ── Prescription Gate ─────────────────────────
    const prescriptionId = await resolvePrescriptionId(tx, {
      prescriptionUuid: data.prescriptionUuid,
      prescription: data.prescription,
      existingPrescriptionId: existing.prescriptionId,
      isPrescription: data.isPrescription,
      isPending: false,
      medicineIds: [...new Set(lines.map((d) => d.medicineId))],
      pharmacyId,
      customerId,
      userId,
    })

    const saleType = data.saleType ?? SaleType.CASH
    const soldAt = new Date()
    const dueDate = dueDateFor(saleType, soldAt, ctx.creditPaymentDays)

    // ── Update sale + replace details ─────────────
    const updated = await tx.sale.update({
      where: { id: existing.id },
      data: {
        customerId,
        ...(prescriptionId !== undefined && { prescriptionId }),
        saleType,
        status: SaleStatus.COMPLETED,
        ...totals,
        paidAmount: saleType === SaleType.CASH ? totals.grandTotal : new Decimal(0),
        soldAt,
        ...(dueDate && { dueDate }),
        description: data.description,
        updatedById: userId,
        details: {
          deleteMany: {},
          create: lines.map(stripDraft),
        },
      },
      select: { id: true, details: { select: { id: true }, orderBy: { id: 'asc' } } },
    })

    // Link inline prescription back to this sale
    if (data.prescription && prescriptionId) {
      await tx.prescription.update({
        where: { id: prescriptionId },
        data: { saleId: existing.id },
      })
    }

    await deductStockForSale(tx, lines, updated.details.map((d) => d.id), pharmacyId, userId)
    await createSalePaymentRecord(tx, existing.id, saleType, totals.grandTotal, data.payment, soldAt, userId)

    return existing.id
  }, { timeout: 15000, maxWait: 5000 })

  const fullSale = await prisma.sale.findUnique({
    where: { id: result },
    select: saleSelect,
  })

  return formatSale(fullSale!)
}

export const cancelOrRefundSale = async (
  uuid: string,
  status: Extract<SaleStatus, 'CANCELLED' | 'REFUNDED'>,
  data: CancelSaleInput,
  pharmacyId: number,
  userId: number
): Promise<SaleResponse> => {
  const result = await prisma.$transaction(async (tx) => {

    const sale = await tx.sale.findFirst({
      where: { uuid, pharmacyId, deletedAt: null },
      select: {
        id: true,
        status: true,
        totalAmount: true,
        soldAt: true,
        details: {
          select: {
            id: true,
            quantityPieces: true,
            quantityBox: true,
            stockDetailId: true,
            medicineId: true,
            stockDetail: {
              select: {
                id: true,
                stockId: true,
                quantityPieces: true,
                quantityPerBox: true,
                stock: {
                  select: { id: true, totalPieces: true },
                },
              },
            },
          },
        },
        payment: {
          select: { id: true, paymentStatus: true },
        },
      },
    })

    if (!sale) throw new NotFoundException('Sale not found')

    if (status === SaleStatus.REFUNDED && sale.status !== SaleStatus.COMPLETED) {
      throw new BadRequestException('Only completed sales can be refunded')
    }

    if (
      status === SaleStatus.CANCELLED &&
      sale.status !== SaleStatus.COMPLETED &&
      sale.status !== SaleStatus.PENDING
    ) {
      throw new BadRequestException('Only completed or pending sales can be cancelled')
    }

    // ── Return Policy Check (refund only) ─────────
    if (status === 'REFUNDED') {
      const returnPolicyParam = await prisma.businessParameter.findUnique({
        where: { pharmacyId_key: { pharmacyId, key: 'RETURN_POLICY_DAYS' } },
        select: { value: true },
      })
      const returnPolicyDays = parseInt(returnPolicyParam?.value ?? '7', 10)
      const daysSinceSale = Math.floor(
        (Date.now() - sale.soldAt.getTime()) / (1000 * 60 * 60 * 24)
      )
      if (daysSinceSale > returnPolicyDays) {
        throw new BadRequestException(
          `Refund window has expired. Refunds must be requested within ${returnPolicyDays} days of sale.`
        )
      }
    }

    if (sale.status === SaleStatus.PENDING) {
      // ── Release reservations (stock was never deducted) ───
      await tx.stockReservation.deleteMany({ where: { saleId: sale.id } })
    } else {
      // ── Restore stock + create IN RETURN movements ────────
      for (const detail of sale.details) {
        const stockDetail = detail.stockDetail
        const quantityBefore = stockDetail.stock.totalPieces
        const quantityAfter = quantityBefore + detail.quantityPieces
        const newDetailQuantity = stockDetail.quantityPieces + detail.quantityPieces

        await tx.stockDetail.update({
          where: { id: stockDetail.id },
          data: {
            quantityPieces: newDetailQuantity,
            quantityBox: Math.floor(newDetailQuantity / stockDetail.quantityPerBox),
            updatedById: userId,
          },
        })

        await tx.stock.update({
          where: { id: stockDetail.stockId },
          data: {
            totalPieces: { increment: detail.quantityPieces },
            updatedById: userId,
          },
        })

        await tx.stockMovement.create({
          data: {
            pharmacyId,
            medicineId: detail.medicineId,
            stockId: stockDetail.stockId,
            stockDetailId: stockDetail.id,
            saleDetailId: detail.id,
            type: 'IN',
            reason: 'RETURN',
            quantity: detail.quantityPieces,
            quantityBefore,
            quantityAfter,
            description: data.description,
            createdById: userId,
          },
        })
      }
    }

    // ── Update Sale Status ────────────────────────
    await tx.sale.update({
      where: { id: sale.id },
      data: {
        status,
        description: data.description,
        paidAmount: new Decimal(0),
        updatedById: userId,
      },
    })

    // ── Update Payment Status ─────────────────────
    if (sale.payment) {
      await tx.salePayment.update({
        where: { id: sale.payment.id },
        data: {
          paymentStatus: PaymentStatus.UNPAID,
          paidAmount: new Decimal(0),
          updatedById: userId,
        },
      })
    }

    return sale.id
  }, {
    timeout: 10000,
    maxWait: 5000,
  })

  const fullSale = await prisma.sale.findUnique({
    where: { id: result },
    select: saleSelect,
  })

  return formatSale(fullSale!)
}

export const updateSale = async (
  uuid: string,
  data: UpdateSaleInput,
  pharmacyId: number,
  actor: SaleActor
): Promise<SaleResponse> => {
  const userId = actor.userId
  const ctx = await loadSaleContext(pharmacyId)

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.sale.findFirst({
      where: { uuid, pharmacyId, deletedAt: null },
      select: { id: true, status: true, customerId: true, prescriptionId: true },
    })

    if (!existing) throw new NotFoundException('Sale not found')
    if (existing.status !== SaleStatus.PENDING) {
      throw new BadRequestException('Only pending sales can be updated')
    }

    // ── Release old reservations first ────────────
    await tx.stockReservation.deleteMany({ where: { saleId: existing.id } })

    const customerId = await resolveSaleCustomer(tx, data.customerUuid, pharmacyId)
    const lines = await buildSaleLines(tx, data.details, pharmacyId, ctx, actor)
    const totals = computeSaleTotals(lines, data, ctx, actor)

    // ── Prescription Gate ─────────────────────────
    const prescriptionId = await resolvePrescriptionId(tx, {
      prescriptionUuid: data.prescriptionUuid,
      prescription: data.prescription,
      existingPrescriptionId: existing.prescriptionId,
      isPrescription: data.isPrescription,
      isPending: true,
      medicineIds: [...new Set(lines.map((d) => d.medicineId))],
      pharmacyId,
      customerId: customerId ?? existing.customerId,
      userId,
    })

    // ── Replace details + update header ──────────
    await tx.sale.update({
      where: { id: existing.id },
      data: {
        ...(customerId && { customerId }),
        ...(prescriptionId !== undefined && { prescriptionId }),
        saleType: data.saleType ?? SaleType.CASH,
        ...totals,
        paidAmount: new Decimal(0),
        description: data.description,
        updatedById: userId,
        details: {
          deleteMany: {},
          create: lines.map(stripDraft),
        },
      },
    })

    // Link inline prescription back to this sale
    if (data.prescription && prescriptionId) {
      await tx.prescription.update({
        where: { id: prescriptionId },
        data: { saleId: existing.id },
      })
    }

    // ── Create new reservations ───────────────────
    for (const line of lines) {
      await tx.stockReservation.create({
        data: {
          pharmacyId,
          saleId: existing.id,
          stockId: line._stockId,
          stockDetailId: line.stockDetailId,
          medicineId: line.medicineId,
          quantityPieces: line.quantityPieces,
          createdById: userId,
        },
      })
    }

    return existing.id
  }, { timeout: 10000, maxWait: 5000 })

  const fullSale = await prisma.sale.findUnique({
    where: { id: result },
    select: saleSelect,
  })

  return formatSale(fullSale!)
}

export const addPayment = async (
  uuid: string,
  data: AddPaymentInput,
  pharmacyId: number,
  userId: number
): Promise<SaleResponse> => {
  const result = await prisma.$transaction(async (tx) => {

    const sale = await tx.sale.findFirst({
      where: { uuid, pharmacyId, deletedAt: null },
      select: {
        id: true,
        status: true,
        totalAmount: true,
        saleType: true,
        payment: {
          select: {
            id: true,
            totalAmount: true,
            paidAmount: true,
            paymentStatus: true,
          },
        },
      },
    })

    if (!sale) throw new NotFoundException('Sale not found')

    if (sale.status !== SaleStatus.COMPLETED) {
      throw new BadRequestException('Cannot add payment to non-completed sale')
    }

    if (sale.saleType !== SaleType.CREDIT) {
      throw new BadRequestException('Can only add installment to CREDIT sales')
    }

    if (!sale.payment) {
      throw new NotFoundException('Sale payment not found')
    }

    if (sale.payment.paymentStatus === PaymentStatus.PAID) {
      throw new ConflictException('Sale is already fully paid')
    }

    const currentPaid = parseFloat(sale.payment.paidAmount.toString())
    const totalAmount = parseFloat(sale.payment.totalAmount.toString())
    const newPaid = currentPaid + data.paidAmount

    if (newPaid > totalAmount) {
      throw new BadRequestException(
        `Payment amount exceeds remaining balance. Remaining: ${totalAmount - currentPaid}`
      )
    }

    const newPaymentStatus = newPaid >= totalAmount
      ? PaymentStatus.PAID
      : PaymentStatus.PARTIAL

    await tx.salePayment.update({
      where: { id: sale.payment.id },
      data: {
        paidAmount: new Decimal(newPaid.toFixed(2)),
        paymentStatus: newPaymentStatus,
        updatedById: userId,
      },
    })

    await tx.salePaymentHistory.create({
      data: {
        salePaymentId: sale.payment.id,
        amount: new Decimal(data.paidAmount.toFixed(2)),
        paymentMethod: data.paymentMethod,
        paymentDate: new Date(data.paymentDate),
        description: data.description,
        createdById: userId,
      },
    })

    // update sale paid amount
    await tx.sale.update({
      where: { id: sale.id },
      data: {
        paidAmount: new Decimal(newPaid.toFixed(2)),
        updatedById: userId,
      },
    })

    return sale.id
  }, {
    timeout: 10000,
    maxWait: 5000,
  })

  const fullSale = await prisma.sale.findUnique({
    where: { id: result },
    select: saleSelect,
  })

  return formatSale(fullSale!)
}

export const getSalePayment = async (
  saleUuid: string,
  pharmacyId: number
): Promise<SalePaymentResponse> => {
  const sale = await prisma.sale.findFirst({
    where: { uuid: saleUuid, pharmacyId, deletedAt: null },
    select: {
      payment: { select: salePaymentSelect },
    },
  })

  if (!sale) throw new NotFoundException('Sale not found')
  if (!sale.payment) throw new NotFoundException('Sale payment record not found')

  return formatSalePayment(sale.payment)
}

export const updatePaymentHistory = async (
  historyUuid: string,
  data: UpdatePaymentHistoryInput,
  pharmacyId: number,
  userId: number
): Promise<SalePaymentResponse> => {
  const history = await prisma.salePaymentHistory.findFirst({
    where: {
      uuid: historyUuid,
      salePayment: { sale: { pharmacyId, deletedAt: null } },
    },
    select: { id: true, salePaymentId: true },
  })

  if (!history) throw new NotFoundException('Payment record not found')

  await prisma.salePaymentHistory.update({
    where: { id: history.id },
    data: {
      ...(data.paymentMethod && { paymentMethod: data.paymentMethod }),
      ...(data.paymentDate && { paymentDate: new Date(data.paymentDate) }),
      ...(data.description !== undefined && { description: data.description }),
      updatedById: userId,
    },
  })

  const payment = await prisma.salePayment.findUnique({
    where: { id: history.salePaymentId },
    select: salePaymentSelect,
  })

  return formatSalePayment(payment)
}

export const deletePaymentHistory = async (
  historyUuid: string,
  pharmacyId: number,
  userId: number
): Promise<SalePaymentResponse> => {
  const paymentId = await prisma.$transaction(async (tx) => {
    const history = await tx.salePaymentHistory.findFirst({
      where: {
        uuid: historyUuid,
        salePayment: { sale: { pharmacyId, deletedAt: null } },
      },
      select: {
        id: true,
        amount: true,
        salePaymentId: true,
        salePayment: {
          select: {
            id: true,
            paidAmount: true,
            saleId: true,
          },
        },
      },
    })

    if (!history) throw new NotFoundException('Payment record not found')

    const payment = history.salePayment
    const newPaid = Math.max(0, parseFloat(payment.paidAmount.toString()) - parseFloat(history.amount.toString()))

    const newPaymentStatus = newPaid <= 0
      ? PaymentStatus.UNPAID
      : PaymentStatus.PARTIAL

    await tx.salePayment.update({
      where: { id: payment.id },
      data: {
        paidAmount: new Decimal(newPaid.toFixed(2)),
        paymentStatus: newPaymentStatus,
        updatedById: userId,
      },
    })

    await tx.sale.update({
      where: { id: payment.saleId },
      data: {
        paidAmount: new Decimal(newPaid.toFixed(2)),
        updatedById: userId,
      },
    })

    await tx.salePaymentHistory.delete({ where: { id: history.id } })

    return payment.id
  }, { timeout: 10000, maxWait: 5000 })

  const updatedPayment = await prisma.salePayment.findUnique({
    where: { id: paymentId },
    select: salePaymentSelect,
  })

  return formatSalePayment(updatedPayment)
}