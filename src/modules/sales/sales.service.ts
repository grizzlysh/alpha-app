import { SaleStatus, SaleType, PaymentStatus, Prisma } from '@prisma/client'
import { prisma } from '@config/db'
import {
  CreateSaleInput,
  UpdateSaleInput,
  CancelSaleInput,
  AddPaymentInput,
  UpdatePaymentHistoryInput,
  SaleQueryInput,
} from './sales.validation'
import { SalePaymentResponse, SaleResponse } from './sales.interface'
import { NotFoundException } from '@exceptions/NotFoundException'
import { BadRequestException } from '@exceptions/BadRequestException'
import { ConflictException } from '@exceptions/ConflictException'
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
    select: { uuid: true, name: true, isWalkIn: true },
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
}

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
  createdById: number
  _stockDetailId: number
  _stockId: number
  _quantityPieces: number
  _quantityBefore: number
  _stockDetailQuantityBefore: number
  _stockDetailQuantityPerBox: number
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
    const customer = await prisma.customer.findFirst({
      where: { uuid: customerUuid, pharmacyId },
      select: { id: true },
    })
    customerId = customer?.id
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
          customer: {
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
  userId: number
): Promise<SaleResponse> => {
  // ── Read Parameters ───────────────────────────────────
  const [allowExpiredParam, allowFefoParam, creditDaysParam] = await Promise.all([
    prisma.systemParameter.findUnique({
      where: { key: 'ALLOW_EXPIRED_MEDICINE_SALE' },
      select: { value: true },
    }),
    prisma.businessParameter.findUnique({
      where: { pharmacyId_key: { pharmacyId, key: 'ALLOW_FEFO_OVERRIDE' } },
      select: { value: true },
    }),
    prisma.businessParameter.findUnique({
      where: { pharmacyId_key: { pharmacyId, key: 'CREDIT_PAYMENT_DAYS' } },
      select: { value: true },
    }),
  ])
  const allowExpiredSale = allowExpiredParam?.value === 'true'
  const allowFefoOverride = allowFefoParam?.value !== 'false'
  const creditPaymentDays = parseInt(creditDaysParam?.value ?? '30', 10)

  const createdSale = await withDocNumberRetry('SL', () => prisma.$transaction(async (tx) => {

    // ── Resolve Customer ──────────────────────────
    let customerId: number

    if (data.customerUuid) {
      const customer = await tx.customer.findFirst({
        where: { uuid: data.customerUuid, pharmacyId, status: 'ACTIVE' },
        select: { id: true },
      })
      if (!customer) throw new NotFoundException('Customer not found')
      customerId = customer.id
    } else {
      const walkIn = await tx.customer.findFirst({
        where: { pharmacyId, isWalkIn: true },
        select: { id: true },
      })
      if (!walkIn) throw new NotFoundException('Walk-in customer not found')
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

    // ── Process Details ───────────────────────────
    const detailsData: SaleDetailDraft[] = []

    for (const detail of data.details) {
      const stockDetail = await tx.stockDetail.findFirst({
        where: { uuid: detail.stockDetailUuid, stock: { pharmacyId } },
        select: {
          id: true,
          quantityPieces: true,
          quantityPerBox: true,
          expiryDate: true,
          stockId: true,
          stock: {
            select: {
              id: true,
              medicineId: true,
              totalPieces: true,
            },
          },
        },
      })

      if (!stockDetail) {
        throw new NotFoundException(`Stock detail not found: ${detail.stockDetailUuid}`)
      }

      if (detail.isFefoOverride && !allowFefoOverride) {
        throw new BadRequestException(
          'FEFO override is not allowed. Items must be sold in expiry order.'
        )
      }

      if (!allowExpiredSale && stockDetail.expiryDate < new Date()) {
        throw new BadRequestException(
          `Medicine batch is expired: ${detail.stockDetailUuid}`
        )
      }

      const reservedAgg = await tx.stockReservation.aggregate({
        where: { stockDetailId: stockDetail.id },
        _sum: { quantityPieces: true },
      })
      const availablePieces =
        stockDetail.quantityPieces - (reservedAgg._sum.quantityPieces ?? 0)
      if (availablePieces < detail.quantityPieces) {
        throw new BadRequestException(`Insufficient stock for batch: ${detail.stockDetailUuid}`)
      }

      const sellingPrice = detail.sellingPrice
      const originalPrice = detail.originalPrice
      const discountAmount = detail.discountAmount ?? 0
      const itemTotal = sellingPrice * detail.quantityPieces
      const quantityBox = Math.floor(detail.quantityPieces / stockDetail.quantityPerBox)

      detailsData.push({
        stockDetailId: stockDetail.id,
        medicineId: stockDetail.stock.medicineId,
        quantityPieces: detail.quantityPieces,
        quantityBox,
        sellingPrice: new Decimal(sellingPrice.toFixed(2)),
        originalPrice: new Decimal(originalPrice.toFixed(2)),
        discountPercentage: new Decimal((detail.discountPercentage ?? 0).toFixed(2)),
        discountAmount: new Decimal(discountAmount.toFixed(2)),
        totalAmount: new Decimal(itemTotal.toFixed(2)),
        isFefoOverride: detail.isFefoOverride ?? false,
        createdById: userId,
        _stockDetailId: stockDetail.id,
        _stockId: stockDetail.stockId,
        _quantityPieces: detail.quantityPieces,
        _quantityBefore: stockDetail.stock.totalPieces,
        _stockDetailQuantityBefore: stockDetail.quantityPieces,
        _stockDetailQuantityPerBox: stockDetail.quantityPerBox,
      })
    }

    // ── Header Amounts (all from input) ──────────
    const discountPercentage = data.discountPercentage ?? 0
    const discountAmount = data.discountAmount ?? 0
    const ppnPercentage = data.ppnPercentage ?? 0
    const ppnAmount = data.ppnAmount ?? 0
    const totalAmount = data.totalAmount
    const grandTotal = data.grandTotal
    const paidAmount = !data.isPending && data.saleType === SaleType.CASH
      ? (data.paidAmount ?? grandTotal)
      : 0

    const soldAt = new Date()
    let dueDate: Date | undefined
    if (!data.isPending && data.saleType === SaleType.CREDIT) {
      dueDate = new Date(soldAt)
      dueDate.setDate(dueDate.getDate() + creditPaymentDays)
    }

    // ── Create Sale ───────────────────────────────
    const sale = await tx.sale.create({
      data: {
        pharmacyId,
        customerId,
        saleNumber,
        saleType: data.saleType ?? SaleType.CASH,
        status: data.isPending ? SaleStatus.PENDING : SaleStatus.COMPLETED,
        totalAmount: new Decimal(totalAmount.toFixed(2)),
        discountPercentage: new Decimal(discountPercentage.toFixed(2)),
        discountAmount: new Decimal(discountAmount.toFixed(2)),
        ppnPercentage: new Decimal(ppnPercentage.toFixed(2)),
        ppnAmount: new Decimal(ppnAmount.toFixed(2)),
        grandTotal: new Decimal(grandTotal.toFixed(2)),
        paidAmount: new Decimal(paidAmount.toFixed(2)),
        dueDate,
        soldAt,
        description: data.description,
        createdById: userId,
        details: {
          create: detailsData.map(({
            _stockDetailId,
            _stockId,
            _quantityPieces,
            _quantityBefore,
            _stockDetailQuantityBefore,
            _stockDetailQuantityPerBox,
            ...d
          }) => d),
        },
      },
      select: { id: true, details: { select: { id: true } } },
    })

    if (data.isPending) {
      // ── Create Stock Reservations ─────────────────
      for (const detail of detailsData) {
        await tx.stockReservation.create({
          data: {
            pharmacyId,
            saleId: sale.id,
            stockId: detail._stockId,
            stockDetailId: detail._stockDetailId,
            medicineId: detail.medicineId,
            quantityPieces: detail._quantityPieces,
            createdById: userId,
          },
        })
      }
    } else {
      // ── Deduct Stock + Create Movements ───────────
      let stockMovementOffset = 0
      for (let i = 0; i < detailsData.length; i++) {
        const detail = detailsData[i]
        const saleDetail = sale.details[i]

        const quantityBefore = detail._quantityBefore - stockMovementOffset
        const quantityAfter = quantityBefore - detail._quantityPieces
        stockMovementOffset += detail._quantityPieces

        await tx.stock.update({
          where: { id: detail._stockId },
          data: {
            totalPieces: { decrement: detail._quantityPieces },
            updatedById: userId,
          },
        })

        const newDetailQuantityPieces =
          detail._stockDetailQuantityBefore - detail._quantityPieces
        await tx.stockDetail.update({
          where: { id: detail._stockDetailId },
          data: {
            quantityPieces: newDetailQuantityPieces,
            quantityBox: Math.floor(
              newDetailQuantityPieces / detail._stockDetailQuantityPerBox
            ),
            updatedById: userId,
          },
        })

        await tx.stockMovement.create({
          data: {
            pharmacyId,
            medicineId: detail.medicineId,
            stockId: detail._stockId,
            stockDetailId: detail._stockDetailId,
            saleDetailId: saleDetail.id,
            type: 'OUT',
            reason: 'SALE',
            quantity: detail._quantityPieces,
            quantityBefore,
            quantityAfter,
            createdById: userId,
          },
        })
      }

      // ── Create Payment ────────────────────────────
      if (data.saleType === SaleType.CASH) {
        await tx.salePayment.create({
          data: {
            saleId: sale.id,
            totalAmount: new Decimal(grandTotal.toFixed(2)),
            paidAmount: new Decimal(paidAmount.toFixed(2)),
            paymentStatus: PaymentStatus.PAID,
            createdById: userId,
            history: {
              create: {
                amount: new Decimal(paidAmount.toFixed(2)),
                paymentMethod: data.payment!.paymentMethod,
                paymentDate: soldAt,
                description: data.payment!.description,
                createdById: userId,
              },
            },
          },
        })
      } else {
        await tx.salePayment.create({
          data: {
            saleId: sale.id,
            totalAmount: new Decimal(grandTotal.toFixed(2)),
            paidAmount: new Decimal(0),
            paymentStatus: PaymentStatus.UNPAID,
            createdById: userId,
          },
        })
      }
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
  userId: number
): Promise<SaleResponse> => {
  const [allowExpiredParam, allowFefoParam, creditDaysParam] = await Promise.all([
    prisma.systemParameter.findUnique({
      where: { key: 'ALLOW_EXPIRED_MEDICINE_SALE' },
      select: { value: true },
    }),
    prisma.businessParameter.findUnique({
      where: { pharmacyId_key: { pharmacyId, key: 'ALLOW_FEFO_OVERRIDE' } },
      select: { value: true },
    }),
    prisma.businessParameter.findUnique({
      where: { pharmacyId_key: { pharmacyId, key: 'CREDIT_PAYMENT_DAYS' } },
      select: { value: true },
    }),
  ])
  const allowExpiredSale = allowExpiredParam?.value === 'true'
  const allowFefoOverride = allowFefoParam?.value !== 'false'
  const creditPaymentDays = parseInt(creditDaysParam?.value ?? '30', 10)

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.sale.findFirst({
      where: { uuid, pharmacyId, deletedAt: null },
      select: { id: true, status: true, customerId: true },
    })

    if (!existing) throw new NotFoundException('Sale not found')
    if (existing.status !== SaleStatus.PENDING) {
      throw new BadRequestException('Only pending sales can be completed')
    }

    // ── Resolve customer ──────────────────────────
    let customerId = existing.customerId
    if (data.customerUuid) {
      const customer = await tx.customer.findFirst({
        where: { uuid: data.customerUuid, pharmacyId, status: 'ACTIVE' },
        select: { id: true },
      })
      if (!customer) throw new NotFoundException('Customer not found')
      customerId = customer.id
    }

    // ── Release old reservations ──────────────────
    await tx.stockReservation.deleteMany({ where: { saleId: existing.id } })

    // ── Validate + build new details ──────────────
    const detailsData: SaleDetailDraft[] = []

    for (const detail of data.details) {
      const stockDetail = await tx.stockDetail.findFirst({
        where: { uuid: detail.stockDetailUuid, stock: { pharmacyId } },
        select: {
          id: true,
          quantityPieces: true,
          quantityPerBox: true,
          expiryDate: true,
          stockId: true,
          stock: { select: { id: true, medicineId: true, totalPieces: true } },
        },
      })
      if (!stockDetail) {
        throw new NotFoundException(`Stock detail not found: ${detail.stockDetailUuid}`)
      }

      if (detail.isFefoOverride && !allowFefoOverride) {
        throw new BadRequestException('FEFO override is not allowed. Items must be sold in expiry order.')
      }
      if (!allowExpiredSale && stockDetail.expiryDate < new Date()) {
        throw new BadRequestException(`Medicine batch is expired: ${detail.stockDetailUuid}`)
      }

      const reservedAgg = await tx.stockReservation.aggregate({
        where: { stockDetailId: stockDetail.id },
        _sum: { quantityPieces: true },
      })
      const availablePieces = stockDetail.quantityPieces - (reservedAgg._sum.quantityPieces ?? 0)
      if (availablePieces < detail.quantityPieces) {
        throw new BadRequestException(`Insufficient stock for batch: ${detail.stockDetailUuid}`)
      }

      detailsData.push({
        stockDetailId: stockDetail.id,
        medicineId: stockDetail.stock.medicineId,
        quantityPieces: detail.quantityPieces,
        quantityBox: Math.floor(detail.quantityPieces / stockDetail.quantityPerBox),
        sellingPrice: new Decimal(detail.sellingPrice.toFixed(2)),
        originalPrice: new Decimal(detail.originalPrice.toFixed(2)),
        discountPercentage: new Decimal((detail.discountPercentage ?? 0).toFixed(2)),
        discountAmount: new Decimal((detail.discountAmount ?? 0).toFixed(2)),
        totalAmount: new Decimal((detail.sellingPrice * detail.quantityPieces).toFixed(2)),
        isFefoOverride: detail.isFefoOverride ?? false,
        createdById: userId,
        _stockDetailId: stockDetail.id,
        _stockId: stockDetail.stockId,
        _quantityPieces: detail.quantityPieces,
        _quantityBefore: stockDetail.stock.totalPieces,
        _stockDetailQuantityBefore: stockDetail.quantityPieces,
        _stockDetailQuantityPerBox: stockDetail.quantityPerBox,
      })
    }

    // ── Amounts ───────────────────────────────────
    const grandTotal = data.grandTotal
    const paidAmount = data.saleType === SaleType.CASH ? (data.paidAmount ?? grandTotal) : 0
    const soldAt = new Date()
    let dueDate: Date | undefined
    if (data.saleType === SaleType.CREDIT) {
      dueDate = new Date(soldAt)
      dueDate.setDate(dueDate.getDate() + creditPaymentDays)
    }

    // ── Update sale + replace details ─────────────
    const updated = await tx.sale.update({
      where: { id: existing.id },
      data: {
        customerId,
        saleType: data.saleType ?? SaleType.CASH,
        status: SaleStatus.COMPLETED,
        totalAmount: new Decimal(data.totalAmount.toFixed(2)),
        discountPercentage: new Decimal((data.discountPercentage ?? 0).toFixed(2)),
        discountAmount: new Decimal((data.discountAmount ?? 0).toFixed(2)),
        ppnPercentage: new Decimal((data.ppnPercentage ?? 0).toFixed(2)),
        ppnAmount: new Decimal((data.ppnAmount ?? 0).toFixed(2)),
        grandTotal: new Decimal(grandTotal.toFixed(2)),
        paidAmount: new Decimal(paidAmount.toFixed(2)),
        soldAt,
        ...(dueDate && { dueDate }),
        description: data.description,
        updatedById: userId,
        details: {
          deleteMany: {},
          create: detailsData.map(({
            _stockDetailId, _stockId, _quantityPieces,
            _quantityBefore, _stockDetailQuantityBefore, _stockDetailQuantityPerBox,
            ...d
          }) => d),
        },
      },
      select: { id: true, details: { select: { id: true } } },
    })

    // ── Deduct stock + create movements ───────────
    const stockOffsets = new Map<number, number>()
    for (let i = 0; i < detailsData.length; i++) {
      const detail = detailsData[i]
      const saleDetail = updated.details[i]

      const offset = stockOffsets.get(detail._stockId) ?? 0
      const quantityBefore = detail._quantityBefore - offset
      const quantityAfter = quantityBefore - detail._quantityPieces
      stockOffsets.set(detail._stockId, offset + detail._quantityPieces)

      await tx.stock.update({
        where: { id: detail._stockId },
        data: { totalPieces: { decrement: detail._quantityPieces }, updatedById: userId },
      })

      const newDetailQty = detail._stockDetailQuantityBefore - detail._quantityPieces
      await tx.stockDetail.update({
        where: { id: detail._stockDetailId },
        data: {
          quantityPieces: newDetailQty,
          quantityBox: Math.floor(newDetailQty / detail._stockDetailQuantityPerBox),
          updatedById: userId,
        },
      })

      await tx.stockMovement.create({
        data: {
          pharmacyId,
          medicineId: detail.medicineId,
          stockId: detail._stockId,
          stockDetailId: detail._stockDetailId,
          saleDetailId: saleDetail.id,
          type: 'OUT',
          reason: 'SALE',
          quantity: detail._quantityPieces,
          quantityBefore,
          quantityAfter,
          createdById: userId,
        },
      })
    }

    // ── Create payment record ─────────────────────
    if (data.saleType === SaleType.CASH) {
      await tx.salePayment.create({
        data: {
          saleId: existing.id,
          totalAmount: new Decimal(grandTotal.toFixed(2)),
          paidAmount: new Decimal(paidAmount.toFixed(2)),
          paymentStatus: PaymentStatus.PAID,
          createdById: userId,
          history: {
            create: {
              amount: new Decimal(paidAmount.toFixed(2)),
              paymentMethod: data.payment!.paymentMethod,
              paymentDate: soldAt,
              description: data.payment?.description,
              createdById: userId,
            },
          },
        },
      })
    } else {
      await tx.salePayment.create({
        data: {
          saleId: existing.id,
          totalAmount: new Decimal(grandTotal.toFixed(2)),
          paidAmount: new Decimal(0),
          paymentStatus: PaymentStatus.UNPAID,
          createdById: userId,
        },
      })
    }

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
  userId: number
): Promise<SaleResponse> => {
  const [allowExpiredParam, allowFefoParam] = await Promise.all([
    prisma.systemParameter.findUnique({
      where: { key: 'ALLOW_EXPIRED_MEDICINE_SALE' },
      select: { value: true },
    }),
    prisma.businessParameter.findUnique({
      where: { pharmacyId_key: { pharmacyId, key: 'ALLOW_FEFO_OVERRIDE' } },
      select: { value: true },
    }),
  ])
  const allowExpiredSale = allowExpiredParam?.value === 'true'
  const allowFefoOverride = allowFefoParam?.value !== 'false'

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.sale.findFirst({
      where: { uuid, pharmacyId, deletedAt: null },
      select: { id: true, status: true },
    })

    if (!existing) throw new NotFoundException('Sale not found')
    if (existing.status !== SaleStatus.PENDING) {
      throw new BadRequestException('Only pending sales can be updated')
    }

    // ── Release old reservations first ────────────
    await tx.stockReservation.deleteMany({ where: { saleId: existing.id } })

    // ── Resolve Customer ──────────────────────────
    let customerId: number | undefined
    if (data.customerUuid) {
      const customer = await tx.customer.findFirst({
        where: { uuid: data.customerUuid, pharmacyId, status: 'ACTIVE' },
        select: { id: true },
      })
      if (!customer) throw new NotFoundException('Customer not found')
      customerId = customer.id
    }

    // ── Validate + build new details + reservation drafts ──
    type ReservationDraft = {
      stockId: number
      stockDetailId: number
      medicineId: number
      quantityPieces: number
    }

    const detailsCreate = []
    const reservationDrafts: ReservationDraft[] = []

    for (const detail of data.details) {
      const stockDetail = await tx.stockDetail.findFirst({
        where: { uuid: detail.stockDetailUuid, stock: { pharmacyId } },
        select: {
          id: true,
          quantityPieces: true,
          quantityPerBox: true,
          expiryDate: true,
          stockId: true,
          stock: { select: { id: true, medicineId: true } },
        },
      })
      if (!stockDetail) {
        throw new NotFoundException(`Stock detail not found: ${detail.stockDetailUuid}`)
      }

      if (detail.isFefoOverride && !allowFefoOverride) {
        throw new BadRequestException('FEFO override is not allowed. Items must be sold in expiry order.')
      }
      if (!allowExpiredSale && stockDetail.expiryDate < new Date()) {
        throw new BadRequestException(`Medicine batch has expired: ${detail.stockDetailUuid}`)
      }

      const reservedAgg = await tx.stockReservation.aggregate({
        where: { stockDetailId: stockDetail.id },
        _sum: { quantityPieces: true },
      })
      const availablePieces = stockDetail.quantityPieces - (reservedAgg._sum.quantityPieces ?? 0)
      if (availablePieces < detail.quantityPieces) {
        throw new BadRequestException(`Insufficient stock for batch: ${detail.stockDetailUuid}`)
      }

      detailsCreate.push({
        stockDetailId: stockDetail.id,
        medicineId: stockDetail.stock.medicineId,
        quantityPieces: detail.quantityPieces,
        quantityBox: Math.floor(detail.quantityPieces / stockDetail.quantityPerBox),
        sellingPrice: new Decimal(detail.sellingPrice.toFixed(2)),
        originalPrice: new Decimal(detail.originalPrice.toFixed(2)),
        discountPercentage: new Decimal((detail.discountPercentage ?? 0).toFixed(2)),
        discountAmount: new Decimal((detail.discountAmount ?? 0).toFixed(2)),
        totalAmount: new Decimal((detail.sellingPrice * detail.quantityPieces).toFixed(2)),
        isFefoOverride: detail.isFefoOverride ?? false,
        createdById: userId,
      })

      reservationDrafts.push({
        stockId: stockDetail.stockId,
        stockDetailId: stockDetail.id,
        medicineId: stockDetail.stock.medicineId,
        quantityPieces: detail.quantityPieces,
      })
    }

    // ── Replace details + update header ──────────
    await tx.sale.update({
      where: { id: existing.id },
      data: {
        ...(customerId && { customerId }),
        saleType: data.saleType ?? SaleType.CASH,
        totalAmount: new Decimal(data.totalAmount.toFixed(2)),
        discountPercentage: new Decimal((data.discountPercentage ?? 0).toFixed(2)),
        discountAmount: new Decimal((data.discountAmount ?? 0).toFixed(2)),
        ppnPercentage: new Decimal((data.ppnPercentage ?? 0).toFixed(2)),
        ppnAmount: new Decimal((data.ppnAmount ?? 0).toFixed(2)),
        grandTotal: new Decimal(data.grandTotal.toFixed(2)),
        paidAmount: new Decimal(0),
        description: data.description,
        updatedById: userId,
        details: {
          deleteMany: {},
          create: detailsCreate,
        },
      },
    })

    // ── Create new reservations ───────────────────
    for (const r of reservationDrafts) {
      await tx.stockReservation.create({
        data: { pharmacyId, saleId: existing.id, createdById: userId, ...r },
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