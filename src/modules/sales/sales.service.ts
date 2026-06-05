import { SaleStatus, SaleType, PaymentStatus, Prisma } from '@prisma/client'
import { prisma } from '@config/db'
import {
  CreateSaleInput,
  CancelSaleInput,
  AddPaymentInput,
  SaleQueryInput,
} from './sales.validation'
import { SaleResponse } from './sales.interface'
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
  paidAmount: true,
  taxPercentage: true,
  taxAmount: true,
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
      discount: true,
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
  discount: Decimal
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
  paidAmount: parseFloat(sale.paidAmount.toString()),
  taxPercentage: parseFloat(sale.taxPercentage.toString()),
  taxAmount: parseFloat(sale.taxAmount.toString()),
  details: sale.details.map((d) => ({
    ...d,
    sellingPrice: parseFloat(d.sellingPrice.toString()),
    discount: parseFloat(d.discount.toString()),
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
  // ── Read Parameters (outside transaction) ─────
  const [
    allowExpiredParam,
    taxParam,
    maxDiscountParam,
    allowFefoParam,
    creditDaysParam,
  ] = await Promise.all([
    prisma.systemParameter.findUnique({
      where: { key: 'ALLOW_EXPIRED_MEDICINE_SALE' },
      select: { value: true },
    }),
    prisma.businessParameter.findUnique({
      where: { pharmacyId_key: { pharmacyId, key: 'TAX_PERCENTAGE' } },
      select: { value: true },
    }),
    prisma.businessParameter.findUnique({
      where: { pharmacyId_key: { pharmacyId, key: 'MAX_DISCOUNT_PERCENTAGE' } },
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
  const taxPercentage = parseFloat(taxParam?.value ?? '0')
  const maxDiscountPct = parseFloat(maxDiscountParam?.value ?? '100')
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
    let subtotal = 0
    const detailsData: SaleDetailDraft[] = []

    for (const detail of data.details) {
      // validate discount cap
      if (detail.discount > maxDiscountPct) {
        throw new BadRequestException(
          `Discount ${detail.discount}% exceeds maximum allowed ${maxDiscountPct}%`
        )
      }

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
              sellingPrice: true,
              calculatedPrice: true,
            },
          },
        },
      })

      if (!stockDetail) {
        throw new NotFoundException(`Stock detail not found: ${detail.stockDetailUuid}`)
      }

      // validate FEFO override
      if (detail.isFefoOverride && !allowFefoOverride) {
        throw new BadRequestException(
          'FEFO override is not allowed. Items must be sold in expiry order.'
        )
      }

      // validate expiry
      if (!allowExpiredSale && stockDetail.expiryDate < new Date()) {
        throw new BadRequestException(
          `Medicine batch is expired: ${detail.stockDetailUuid}`
        )
      }

      // validate stock quantity
      if (stockDetail.quantityPieces < detail.quantityPieces) {
        throw new BadRequestException(`Insufficient stock for batch: ${detail.stockDetailUuid}`)
      }

      const basePrice = parseFloat(
        (stockDetail.stock.sellingPrice ?? stockDetail.stock.calculatedPrice).toString()
      )
      const discountAmount = (basePrice * detail.discount) / 100
      const sellingPrice = basePrice - discountAmount
      const itemTotal = sellingPrice * detail.quantityPieces
      subtotal += itemTotal

      const quantityBox = Math.floor(detail.quantityPieces / stockDetail.quantityPerBox)

      detailsData.push({
        stockDetailId: stockDetail.id,
        medicineId: stockDetail.stock.medicineId,
        quantityPieces: detail.quantityPieces,
        quantityBox,
        sellingPrice: new Decimal(sellingPrice.toFixed(2)),
        discount: new Decimal(detail.discount.toFixed(2)),
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

    // ── Compute Tax ───────────────────────────────
    const taxAmount = (subtotal * taxPercentage) / 100
    const totalAmount = subtotal + taxAmount

    // ── Compute Due Date for Credit ───────────────
    const soldAt = new Date()
    let dueDate: Date | undefined
    if (data.saleType === SaleType.CREDIT) {
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
        status: SaleStatus.COMPLETED,
        totalAmount: new Decimal(totalAmount.toFixed(2)),
        paidAmount: data.saleType === SaleType.CASH
          ? new Decimal(totalAmount.toFixed(2))
          : new Decimal(0),
        taxPercentage: new Decimal(taxPercentage.toFixed(2)),
        taxAmount: new Decimal(taxAmount.toFixed(2)),
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

    // ── Deduct Stock + Create Movements ───────────
    let stockMovementOffset = 0
    for (let i = 0; i < detailsData.length; i++) {
      const detail = detailsData[i]
      const saleDetail = sale.details[i]

      const quantityBefore = detail._quantityBefore - stockMovementOffset
      const quantityAfter = quantityBefore - detail._quantityPieces
      stockMovementOffset += detail._quantityPieces

      // upsert stock header — decrement
      await tx.stock.update({
        where: { id: detail._stockId },
        data: {
          totalPieces: { decrement: detail._quantityPieces },
          updatedById: userId,
        },
      })

      // update stock detail
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

      // create stock movement
      await tx.stockMovement.create({
        data: {
          pharmacyId,
          medicineId: detail.medicineId,
          stockId: detail._stockId,
          stockDetailId: detail._stockDetailId,
          saleId: sale.id,
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
    await tx.salePayment.create({
      data: {
        saleId: sale.id,
        totalAmount: new Decimal(totalAmount.toFixed(2)),
        paidAmount: data.saleType === SaleType.CASH
          ? new Decimal(totalAmount.toFixed(2))
          : new Decimal(0),
        paymentStatus: data.saleType === SaleType.CASH
          ? PaymentStatus.PAID
          : PaymentStatus.UNPAID,
        createdById: userId,
        ...(data.saleType === SaleType.CASH && {
          history: {
            create: {
              amount: new Decimal(totalAmount.toFixed(2)),
              paymentMethod: 'CASH',
              paymentDate: soldAt,
              createdById: userId,
            },
          },
        }),
      },
    })

    return sale
  }, { timeout: 15000, maxWait: 5000 }))

  const fullSale = await prisma.sale.findUnique({
    where: { id: createdSale.id },
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

    if (sale.status !== SaleStatus.COMPLETED) {
      throw new BadRequestException(
        'Only completed sales can be cancelled or refunded'
      )
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

    // ── Restore Stock for Each Detail ─────────────
    for (const detail of sale.details) {
      const stockDetail = detail.stockDetail
      const quantityBefore = stockDetail.stock.totalPieces
      const quantityAfter = quantityBefore + detail.quantityPieces

      const newDetailQuantity =
        stockDetail.quantityPieces + detail.quantityPieces

      // restore stock detail
      await tx.stockDetail.update({
        where: { id: stockDetail.id },
        data: {
          quantityPieces: newDetailQuantity,
          quantityBox: Math.floor(
            newDetailQuantity / stockDetail.quantityPerBox
          ),
          updatedById: userId,
        },
      })

      // restore stock header
      await tx.stock.update({
        where: { id: stockDetail.stockId },
        data: {
          totalPieces: { increment: detail.quantityPieces },
          updatedById: userId,
        },
      })

      // create stock movement (IN, RETURN)
      await tx.stockMovement.create({
        data: {
          pharmacyId,
          medicineId: detail.medicineId,
          stockId: stockDetail.stockId,
          stockDetailId: stockDetail.id,
          saleId: sale.id,
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
    const newPaid = currentPaid + data.amount

    if (newPaid > totalAmount) {
      throw new BadRequestException(
        `Payment amount exceeds remaining balance. Remaining: ${totalAmount - currentPaid}`
      )
    }

    const newPaymentStatus = newPaid >= totalAmount
      ? PaymentStatus.PAID
      : PaymentStatus.PARTIAL

    // update payment
    await tx.salePayment.update({
      where: { id: sale.payment.id },
      data: {
        paidAmount: new Decimal(newPaid.toFixed(2)),
        paymentStatus: newPaymentStatus,
        updatedById: userId,
      },
    })

    // add payment history
    await tx.salePaymentHistory.create({
      data: {
        salePaymentId: sale.payment.id,
        amount: new Decimal(data.amount.toFixed(2)),
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