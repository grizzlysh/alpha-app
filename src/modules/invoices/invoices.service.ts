import { PaymentStatus, PurchaseOrderStatus } from '@prisma/client'
import { PERMISSIONS } from '@constants/permissions'
import { prisma } from '@config/db'
import { withDocNumberRetry } from '@utils/generateDocNumbers'
import { generateBarcode } from '@utils/generateBarcode'
import { AddPaymentInput, CreateInvoiceInput, InvoiceQueryInput, UpdatePaymentHistoryInput } from './invoices.validation'
import { InvoicePaymentResponse, InvoiceResponse } from './invoices.interface'
import { NotFoundException } from '@exceptions/NotFoundException'
import { ConflictException } from '@exceptions/ConflictException'
import { ForbiddenException } from '@exceptions/ForbiddenException'
import { BadRequestException } from '@exceptions/BadRequestException'
import { PaginationMeta } from '@interfaces/common.interface'
import { Decimal } from '@prisma/client/runtime/library'

// ── Helpers ───────────────────────────────────────────

const invoiceSelect = {
  uuid: true,
  invoiceNumber: true,
  invoiceDate: true,
  dueDate: true,
  receiveDate: true,
  totalAmount: true,
  discountPercentage: true,
  discountAmount: true,
  ppnPercentage: true,
  ppnAmount: true,
  grandTotal: true,
  paidAmount: true,
  paymentStatus: true,
  description: true,
  createdAt: true,
  distributor: {
    select: { uuid: true, name: true },
  },
  purchaseOrder: {
    select: { uuid: true, orderNumber: true },
  },
  signedByUser: {
    select: { uuid: true, name: true },
  },
  details: {
    select: {
      uuid: true,
      batchNumber: true,
      expiryDate: true,
      quantityBox: true,
      quantityPerBox: true,
      quantityPieces: true,
      price: true,
      discountPercentage: true,
      discountAmount: true,
      finalPrice: true,
      totalAmount: true,
      medicine: {
        select: { uuid: true, name: true, unit: true },
      },
      stockDetail: {
        select: { uuid: true, quantityPieces: true },
      },
    },
  },
  payments: {
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
    take: 1,
  },
}

const toNum = (v: Decimal | number) => parseFloat(v.toString())

const formatInvoice = (invoice: any): InvoiceResponse => ({
  ...invoice,
  totalAmount: toNum(invoice.totalAmount),
  discountPercentage: toNum(invoice.discountPercentage),
  discountAmount: toNum(invoice.discountAmount),
  ppnPercentage: toNum(invoice.ppnPercentage),
  ppnAmount: toNum(invoice.ppnAmount),
  grandTotal: toNum(invoice.grandTotal),
  paidAmount: toNum(invoice.paidAmount),
  details: invoice.details.map((d: any) => ({
    ...d,
    price: toNum(d.price),
    discountPercentage: toNum(d.discountPercentage),
    discountAmount: toNum(d.discountAmount),
    finalPrice: toNum(d.finalPrice),
    totalAmount: toNum(d.totalAmount),
  })),
  payment: invoice.payments?.[0]
    ? {
        ...invoice.payments[0],
        totalAmount: toNum(invoice.payments[0].totalAmount),
        paidAmount: toNum(invoice.payments[0].paidAmount),
        history: invoice.payments[0].history.map((h: any) => ({
          ...h,
          amount: toNum(h.amount),
        })),
      }
    : null,
})

const paymentSelect = {
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

const formatPayment = (p: any): InvoicePaymentResponse => ({
  ...p,
  totalAmount: toNum(p.totalAmount),
  paidAmount: toNum(p.paidAmount),
  history: p.history.map((h: any) => ({ ...h, amount: toNum(h.amount) })),
})

const ROUND_HALF_UP = Decimal.ROUND_HALF_UP

const round = (value: number | Decimal, dp: number) =>
  new Decimal(value).toDecimalPlaces(dp, ROUND_HALF_UP)

const calculatePrices = (
  price: number,
  discountPercentage: number,
  quantityPerBox: number,
  marginPercentage: number
) => {
  const discountAmount = (price * discountPercentage) / 100
  const finalPrice = price - discountAmount                          // per box, after discount
  const basePrice = price / quantityPerBox                          // per piece, before discount
  const calculatedPrice = basePrice + (basePrice * marginPercentage) / 100  // selling price per piece

  return {
    discountAmount: round(discountAmount, 2),
    finalPrice: round(finalPrice, 2),
    basePrice: round(basePrice, 2),
    calculatedPrice: round(calculatedPrice, 2),
  }
}

// ── Services ──────────────────────────────────────────

export const getInvoices = async (
  pharmacyId: number,
  query: InvoiceQueryInput
): Promise<{ data: InvoiceResponse[]; meta: PaginationMeta }> => {
  const {
    search,
    paymentStatus,
    distributorUuid,
    purchaseOrderUuid,
    dateFrom,
    dateTo,
    sortBy,
    sortOrder,
    page,
    limit,
  } = query

  const skip = (page - 1) * limit

  let distributorId: number | undefined
  if (distributorUuid) {
    const distributor = await prisma.distributor.findFirst({
      where: { uuid: distributorUuid, pharmacyId },
      select: { id: true },
    })
    distributorId = distributor?.id
  }

  let purchaseOrderId: number | undefined
  if (purchaseOrderUuid) {
    const po = await prisma.purchaseOrder.findFirst({
      where: { uuid: purchaseOrderUuid, pharmacyId },
      select: { id: true },
    })
    purchaseOrderId = po?.id
  }

  const where = {
    pharmacyId,
    deletedAt: null,
    ...(paymentStatus && { paymentStatus }),
    ...(distributorId && { distributorId }),
    ...(purchaseOrderId && { purchaseOrderId }),
    ...(dateFrom && { invoiceDate: { gte: new Date(dateFrom) } }),
    ...(dateTo && { invoiceDate: { lte: new Date(dateTo) } }),
    ...(search && {
      OR: [
        { invoiceNumber: { contains: search, mode: 'insensitive' as const } },
        {
          distributor: {
            name: { contains: search, mode: 'insensitive' as const },
          },
        },
      ],
    }),
  }

  const [invoices, total] = await prisma.$transaction([
    prisma.invoice.findMany({
      where,
      select: invoiceSelect,
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    }),
    prisma.invoice.count({ where }),
  ])

  const meta: PaginationMeta = {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  }

  return { data: invoices.map(formatInvoice), meta }
}

export const getInvoiceByUuid = async (
  uuid: string,
  pharmacyId: number
): Promise<InvoiceResponse> => {
  const invoice = await prisma.invoice.findFirst({
    where: { uuid, pharmacyId, deletedAt: null },
    select: invoiceSelect,
  })

  if (!invoice) throw new NotFoundException('Invoice not found')

  return formatInvoice(invoice)
}

export const createInvoice = async (
  data: CreateInvoiceInput,
  pharmacyId: number,
  userId: number
): Promise<InvoiceResponse> => {
  const createdInvoice = await withDocNumberRetry('INV', () => prisma.$transaction(async (tx) => {

    // ── Resolve Distributor ───────────────────────
    const distributor = await tx.distributor.findFirst({
      where: { uuid: data.distributorUuid, pharmacyId, status: 'ACTIVE' },
      select: { id: true },
    })
    if (!distributor) throw new NotFoundException('Distributor not found')

    // ── Check Invoice Number Unique ───────────────
    const existingInvoice = await tx.invoice.findUnique({
      where: { invoiceNumber: data.invoiceNumber },
    })
    if (existingInvoice) {
      throw new ConflictException('Invoice number already exists')
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
    if (!hasSignPermission) throw new ForbiddenException('Only authorized personnel can sign this document')
    const signedById = signer.id

    // ── Resolve Purchase Order ────────────────────
    let purchaseOrderId: number | undefined
    if (data.purchaseOrderUuid) {
      const po = await tx.purchaseOrder.findFirst({
        where: {
          uuid: data.purchaseOrderUuid,
          pharmacyId,
          status: 'SENT',
        },
        select: { id: true },
      })
      if (!po) {
        throw new NotFoundException(
          'Purchase order not found or not in SENT status'
        )
      }

      const existingPoInvoice = await tx.invoice.findFirst({
        where: { purchaseOrderId: po.id, deletedAt: null },
      })
      if (existingPoInvoice) {
        throw new ConflictException(
          'This purchase order already has an invoice'
        )
      }

      purchaseOrderId = po.id
    }

    // ── Get Business Parameters ───────────────────
    const [marginParam, reorderParam] = await Promise.all([
      tx.businessParameter.findUnique({
        where: { pharmacyId_key: { pharmacyId, key: 'MARGIN_PERCENTAGE' } },
        select: { value: true },
      }),
      tx.businessParameter.findUnique({
        where: { pharmacyId_key: { pharmacyId, key: 'REORDER_LEVEL_DEFAULT' } },
        select: { value: true },
      }),
    ])
    const marginPercentage = parseFloat(marginParam?.value ?? '0')
    const reorderLevelDefault = parseInt(reorderParam?.value ?? '0', 10)

    // ── Calculate Details ─────────────────────────
    const stockPriceMap = new Map<number, { basePrice: Decimal; calculatedPrice: Decimal }>()
    const detailsData = await Promise.all(
      data.details.map(async (detail) => {
        const medicine = await tx.medicine.findFirst({
          where: { uuid: detail.medicineUuid, pharmacyId, status: 'ACTIVE' },
          select: { id: true },
        })
        if (!medicine) {
          throw new NotFoundException(
            `Medicine not found: ${detail.medicineUuid}`
          )
        }

        const { discountAmount, finalPrice, basePrice, calculatedPrice } = calculatePrices(
          detail.price,
          detail.discountPercentage,
          detail.quantityPerBox,
          marginPercentage
        )

        stockPriceMap.set(medicine.id, { basePrice, calculatedPrice })

        return {
          medicineId: medicine.id,
          batchNumber: detail.batchNumber,
          expiryDate: new Date(detail.expiryDate),
          quantityBox: detail.quantityBox,
          quantityPerBox: detail.quantityPerBox,
          quantityPieces: detail.quantityPieces,
          price: round(detail.price, 2),
          discountPercentage: new Decimal(detail.discountPercentage),
          discountAmount,
          finalPrice,
          totalAmount: round(detail.quantityBox * parseFloat(finalPrice.toString()), 2),
          createdById: userId,
        }
      })
    )

    const totalAmount = detailsData.reduce(
      (sum, d) => sum + parseFloat(d.totalAmount.toString()),
      0
    )
    const headerDiscountPct = data.discountPercentage ?? 0
    const discountAmount = (totalAmount * headerDiscountPct) / 100
    const netAmount = totalAmount - discountAmount
    const ppnPercentage = data.ppnPercentage ?? 0
    const ppnAmount = (netAmount * ppnPercentage) / 100
    const grandTotal = netAmount + ppnAmount

    // ── Create Invoice + Details ──────────────────
    const invoice = await tx.invoice.create({
      data: {
        pharmacyId,
        distributorId: distributor.id,
        purchaseOrderId,
        signedById,
        invoiceNumber: data.invoiceNumber,
        invoiceDate: new Date(data.invoiceDate),
        dueDate: new Date(data.dueDate),
        receiveDate: new Date(data.receiveDate),
        totalAmount: round(totalAmount, 2),
        discountPercentage: round(headerDiscountPct, 2),
        discountAmount: round(discountAmount, 2),
        ppnPercentage: round(ppnPercentage, 2),
        ppnAmount: round(ppnAmount, 0),
        grandTotal: round(grandTotal, 0),
        description: data.description,
        createdById: userId,
        details: {
          create: detailsData,
        },
      },
      include: {
        details: {
          select: {
            id: true,
            medicineId: true,
            batchNumber: true,
            expiryDate: true,
            quantityBox: true,
            quantityPerBox: true,
            quantityPieces: true,
            finalPrice: true,
          },
        },
      },
    })

    // ── Create Payment Record ─────────────────────
    await tx.invoicePayment.create({
      data: {
        invoiceId: invoice.id,
        totalAmount: round(grandTotal, 0),
        paidAmount: new Decimal(0),
        paymentStatus: PaymentStatus.UNPAID,
        createdById: userId,
      },
    })

    // ── Upsert Stock + Create Movement ───────────
    for (const detail of invoice.details) {
      // get current stock before upsert for quantityBefore
      const currentStock = await tx.stock.findUnique({
        where: {
          pharmacyId_medicineId: { pharmacyId, medicineId: detail.medicineId },
        },
        select: { id: true, totalPieces: true, basePrice: true },
      })

      const quantityBefore = currentStock?.totalPieces ?? 0
      const quantityAfter = quantityBefore + detail.quantityPieces

      const { basePrice, calculatedPrice } = stockPriceMap.get(detail.medicineId)!

      const shouldUpdatePrice = currentStock
        ? !basePrice.isZero() && basePrice.greaterThan(currentStock.basePrice)
        : true

      // upsert stock header — atomic, handles race condition
      const stock = await tx.stock.upsert({
        where: {
          pharmacyId_medicineId: { pharmacyId, medicineId: detail.medicineId },
        },
        create: {
          pharmacyId,
          medicineId: detail.medicineId,
          totalPieces: detail.quantityPieces,
          reorderLevel: reorderLevelDefault,
          basePrice,
          calculatedPrice,
          createdById: userId,
        },
        update: {
          totalPieces: { increment: detail.quantityPieces },
          ...(shouldUpdatePrice && {
            basePrice,
            calculatedPrice,
            isManualPrice: false,
          }),
          updatedById: userId,
        },
      })

      // create stock detail
      const stockDetail = await tx.stockDetail.create({
        data: {
          stockId: stock.id,
          distributorId: distributor.id,
          invoiceDetailId: detail.id,
          batchNumber: detail.batchNumber,
          barcode: generateBarcode(),
          expiryDate: detail.expiryDate,
          quantityPieces: detail.quantityPieces,
          quantityBox: detail.quantityBox,
          quantityPerBox: detail.quantityPerBox,
          createdById: userId,
        },
      })

      // create stock movement
      await tx.stockMovement.create({
        data: {
          pharmacyId,
          medicineId: detail.medicineId,
          stockId: stock.id,
          stockDetailId: stockDetail.id,
          invoiceDetailId: detail.id,
          type: 'IN',
          reason: 'PURCHASE',
          quantity: detail.quantityPieces,
          quantityBefore,
          quantityAfter,
          createdById: userId,
        },
      })
    }

    // ── Update PO if Linked ───────────────────────
    if (purchaseOrderId) {
      const invoicedMedicineIds = invoice.details.map((d) => d.medicineId)

      const poDetails = await tx.purchaseOrderDetail.findMany({
        where: { purchaseOrderId, deletedAt: null },
        select: { id: true, medicineId: true },
      })

      const notInvoicedDetails = poDetails.filter(
        (d) => !invoicedMedicineIds.includes(d.medicineId)
      )

      if (notInvoicedDetails.length > 0) {
        await tx.purchaseOrderDetail.updateMany({
          where: { id: { in: notInvoicedDetails.map((d) => d.id) } },
          data: {
            deletedAt: new Date(),
            deletedById: userId,
          },
        })
      }

      await tx.purchaseOrder.update({
        where: { id: purchaseOrderId },
        data: {
          status: PurchaseOrderStatus.COMPLETED,
          updatedById: userId,
        },
      })
    }

    return invoice
  }, { timeout: 15000, maxWait: 5000 }))

  // fetch full response outside transaction
  const fullInvoice = await prisma.invoice.findUnique({
    where: { id: createdInvoice.id },
    select: invoiceSelect,
  })

  return formatInvoice(fullInvoice)
}

export const deleteInvoice = async (
  uuid: string,
  pharmacyId: number,
  userId: number
): Promise<void> => {
  const existing = await prisma.invoice.findFirst({
    where: { uuid, pharmacyId, deletedAt: null },
    select: { id: true },
  })

  if (!existing) throw new NotFoundException('Invoice not found')

  await prisma.invoice.update({
    where: { id: existing.id },
    data: {
      deletedAt: new Date(),
      deletedById: userId,
    },
  })
}

export const getInvoicePayment = async (
  invoiceUuid: string,
  pharmacyId: number
): Promise<InvoicePaymentResponse> => {
  const invoice = await prisma.invoice.findFirst({
    where: { uuid: invoiceUuid, pharmacyId, deletedAt: null },
    select: {
      payments: {
        select: paymentSelect,
        take: 1,
      },
    },
  })

  if (!invoice) throw new NotFoundException('Invoice not found')

  const payment = invoice.payments[0]
  if (!payment) throw new NotFoundException('Invoice payment record not found')

  return formatPayment(payment)
}

export const addPayment = async (
  uuid: string,
  data: AddPaymentInput,
  pharmacyId: number,
  userId: number
): Promise<InvoiceResponse> => {
  const invoiceId = await prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findFirst({
      where: { uuid, pharmacyId, deletedAt: null },
      select: {
        id: true,
        payments: {
          select: {
            id: true,
            totalAmount: true,
            paidAmount: true,
            paymentStatus: true,
          },
          take: 1,
        },
      },
    })

    if (!invoice) throw new NotFoundException('Invoice not found')

    const payment = invoice.payments[0]
    if (!payment) throw new NotFoundException('Invoice payment record not found')

    if (payment.paymentStatus === PaymentStatus.PAID) {
      throw new ConflictException('Invoice is already fully paid')
    }

    const currentPaid = parseFloat(payment.paidAmount.toString())
    const totalAmount = parseFloat(payment.totalAmount.toString())
    const newPaid = currentPaid + data.amount

    if (newPaid > totalAmount) {
      throw new BadRequestException(
        `Payment exceeds remaining balance. Remaining: ${(totalAmount - currentPaid).toFixed(2)}`
      )
    }

    const newPaymentStatus = newPaid >= totalAmount
      ? PaymentStatus.PAID
      : PaymentStatus.PARTIAL

    await tx.invoicePayment.update({
      where: { id: payment.id },
      data: {
        paidAmount: new Decimal(newPaid.toFixed(2)),
        paymentStatus: newPaymentStatus,
        updatedById: userId,
      },
    })

    await tx.invoicePaymentHistory.create({
      data: {
        invoicePaymentId: payment.id,
        amount: new Decimal(data.amount.toFixed(2)),
        paymentMethod: data.paymentMethod,
        paymentDate: new Date(data.paymentDate),
        description: data.description,
        createdById: userId,
      },
    })

    await tx.invoice.update({
      where: { id: invoice.id },
      data: {
        paidAmount: new Decimal(newPaid.toFixed(2)),
        paymentStatus: newPaymentStatus,
        updatedById: userId,
      },
    })

    return invoice.id
  }, { timeout: 10000, maxWait: 5000 })

  const fullInvoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: invoiceSelect,
  })

  return formatInvoice(fullInvoice)
}

export const updatePaymentHistory = async (
  historyUuid: string,
  data: UpdatePaymentHistoryInput,
  pharmacyId: number,
  userId: number
): Promise<InvoicePaymentResponse> => {
  const history = await prisma.invoicePaymentHistory.findFirst({
    where: {
      uuid: historyUuid,
      invoicePayment: { invoice: { pharmacyId, deletedAt: null } },
    },
    select: { id: true, invoicePaymentId: true },
  })

  if (!history) throw new NotFoundException('Payment record not found')

  await prisma.invoicePaymentHistory.update({
    where: { id: history.id },
    data: {
      ...(data.paymentMethod && { paymentMethod: data.paymentMethod }),
      ...(data.paymentDate && { paymentDate: new Date(data.paymentDate) }),
      ...(data.description !== undefined && { description: data.description }),
      updatedById: userId,
    },
  })

  const payment = await prisma.invoicePayment.findUnique({
    where: { id: history.invoicePaymentId },
    select: paymentSelect,
  })

  return formatPayment(payment)
}

export const deletePaymentHistory = async (
  historyUuid: string,
  pharmacyId: number,
  userId: number
): Promise<InvoicePaymentResponse> => {
  const paymentId = await prisma.$transaction(async (tx) => {
    const history = await tx.invoicePaymentHistory.findFirst({
      where: {
        uuid: historyUuid,
        invoicePayment: { invoice: { pharmacyId, deletedAt: null } },
      },
      select: {
        id: true,
        amount: true,
        invoicePaymentId: true,
        invoicePayment: {
          select: {
            id: true,
            paidAmount: true,
            invoiceId: true,
          },
        },
      },
    })

    if (!history) throw new NotFoundException('Payment record not found')

    const payment = history.invoicePayment
    const newPaid = Math.max(0, parseFloat(payment.paidAmount.toString()) - parseFloat(history.amount.toString()))

    const newPaymentStatus = newPaid <= 0
      ? PaymentStatus.UNPAID
      : PaymentStatus.PARTIAL

    await tx.invoicePayment.update({
      where: { id: payment.id },
      data: {
        paidAmount: new Decimal(newPaid.toFixed(2)),
        paymentStatus: newPaymentStatus,
        updatedById: userId,
      },
    })

    await tx.invoice.update({
      where: { id: payment.invoiceId },
      data: {
        paidAmount: new Decimal(newPaid.toFixed(2)),
        paymentStatus: newPaymentStatus,
        updatedById: userId,
      },
    })

    await tx.invoicePaymentHistory.delete({ where: { id: history.id } })

    return payment.id
  }, { timeout: 10000, maxWait: 5000 })

  const updatedPayment = await prisma.invoicePayment.findUnique({
    where: { id: paymentId },
    select: paymentSelect,
  })

  return formatPayment(updatedPayment)
}