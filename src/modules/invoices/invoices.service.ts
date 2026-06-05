import { PurchaseOrderStatus } from '@prisma/client'
import { PERMISSIONS } from '@constants/permissions'
import { prisma } from '@config/db'
import { withDocNumberRetry } from '@utils/generateDocNumbers'
import { CreateInvoiceInput, InvoiceQueryInput } from './invoices.validation'
import { InvoiceResponse } from './invoices.interface'
import { NotFoundException } from '@exceptions/NotFoundException'
import { ConflictException } from '@exceptions/ConflictException'
import { ForbiddenException } from '@exceptions/ForbiddenException'
import { PaginationMeta } from '@interfaces/common.interface'
import { Decimal } from '@prisma/client/runtime/library'

// ── Helpers ───────────────────────────────────────────

const invoiceSelect = {
  uuid: true,
  invoiceNumber: true,
  invoiceDate: true,
  dueDate: true,
  totalAmount: true,
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
    },
  },
}

const calculatePrices = (
  price: number,
  discountPercentage: number,
  marginPercentage: number
) => {
  const discountAmount = (price * discountPercentage) / 100
  const finalPrice = price - discountAmount
  const calculatedPrice = finalPrice + (finalPrice * marginPercentage) / 100

  return {
    discountAmount: new Decimal(discountAmount.toFixed(2)),
    finalPrice: new Decimal(finalPrice.toFixed(2)),
    calculatedPrice: new Decimal(calculatedPrice.toFixed(2)),
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

  return { data: invoices as unknown as InvoiceResponse[], meta }
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

  return invoice as unknown as InvoiceResponse
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
    let signedById: number | undefined
    if (data.signedByUuid) {
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
      signedById = signer.id
    }

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

        const { discountAmount, finalPrice, calculatedPrice } = calculatePrices(
          detail.price,
          detail.discountPercentage,
          marginPercentage
        )

        return {
          medicineId: medicine.id,
          batchNumber: detail.batchNumber,
          expiryDate: new Date(detail.expiryDate),
          quantityBox: detail.quantityBox,
          quantityPerBox: detail.quantityPerBox,
          quantityPieces: detail.quantityPieces,
          price: new Decimal(detail.price),
          discountPercentage: new Decimal(detail.discountPercentage),
          discountAmount,
          finalPrice,
          calculatedPrice,
          totalAmount: new Decimal(
            (detail.quantityPieces * parseFloat(finalPrice.toString())).toFixed(2)
          ),
          createdById: userId,
        }
      })
    )

    const totalAmount = detailsData.reduce(
      (sum, d) => sum + parseFloat(d.totalAmount.toString()),
      0
    )

    // ── Create Invoice + Details ──────────────────
    const invoice = await tx.invoice.create({
      data: {
        pharmacyId,
        distributorId: distributor.id,
        purchaseOrderId,
        signedById,
        invoiceNumber: data.invoiceNumber,
        invoiceDate: new Date(data.invoiceDate),
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        totalAmount: new Decimal(totalAmount.toFixed(2)),
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
            calculatedPrice: true,
          },
        },
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

      const shouldUpdatePrice = currentStock
        ? detail.finalPrice.greaterThan(currentStock.basePrice)
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
          basePrice: detail.finalPrice,
          calculatedPrice: detail.calculatedPrice,
          createdById: userId,
        },
        update: {
          totalPieces: { increment: detail.quantityPieces },
          ...(shouldUpdatePrice && {
            basePrice: detail.finalPrice,
            calculatedPrice: detail.calculatedPrice,
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

  return fullInvoice as unknown as InvoiceResponse
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