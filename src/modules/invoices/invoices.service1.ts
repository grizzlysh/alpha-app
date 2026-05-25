import { SignAuthority, PurchaseOrderStatus } from '@prisma/client'
import { prisma } from '@config/db'
import { CreateInvoiceInput, InvoiceQueryInput } from './invoices.validation'
import { InvoiceResponse } from './invoices.interface'
import { NotFoundException } from '@exceptions/NotFoundException'
import { ConflictException } from '@exceptions/ConflictException'
import { BadRequestException } from '@exceptions/BadRequestException'
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
  signedByEmployee: {
    select: {
      uuid: true,
      name: true,
      position: { select: { name: true, signAuthority: true } },
    },
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

const resolveDistributor = async (
  distributorUuid: string,
  pharmacyId: number
) => {
  const distributor = await prisma.distributor.findFirst({
    where: { uuid: distributorUuid, pharmacyId, status: 'ACTIVE' },
    select: { id: true },
  })
  if (!distributor) throw new NotFoundException('Distributor not found')
  return distributor
}

const resolveMedicine = async (
  medicineUuid: string,
  pharmacyId: number
) => {
  const medicine = await prisma.medicine.findFirst({
    where: { uuid: medicineUuid, pharmacyId, status: 'ACTIVE' },
    select: { id: true },
  })
  if (!medicine) throw new NotFoundException(`Medicine not found: ${medicineUuid}`)
  return medicine
}

const resolveSignedBy = async (
  signedByUuid: string,
  pharmacyId: number
) => {
  const employee = await prisma.employee.findFirst({
    where: { uuid: signedByUuid, pharmacyId, status: 'ACTIVE' },
    select: {
      id: true,
      position: { select: { signAuthority: true } },
    },
  })

  if (!employee) throw new NotFoundException('Employee not found')

  if (employee.position.signAuthority === SignAuthority.NONE) {
    throw new ForbiddenException(
      'Only authorized personnel can sign this document'
    )
  }

  return employee
}

const getBusinessParameter = async (
  pharmacyId: number,
  key: string
): Promise<string> => {
  const param = await prisma.businessParameter.findUnique({
    where: { pharmacyId_key: { pharmacyId, key } },
    select: { value: true },
  })
  return param?.value ?? '0'
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

// ── Stock Creation ────────────────────────────────────

const createStockFromInvoiceDetail = async (
  invoiceDetailId: number,
  medicineId: number,
  distributorId: number,
  pharmacyId: number,
  detail: {
    batchNumber: string
    expiryDate: Date
    quantityBox: number
    quantityPerBox: number
    quantityPieces: number
    finalPrice: Decimal
    calculatedPrice: Decimal
  },
  userId: number
) => {
  // get or create stock header
  let stock = await prisma.stock.findUnique({
    where: { pharmacyId_medicineId: { pharmacyId, medicineId } },
  })

  const marginPercentage = parseFloat(
    await getBusinessParameter(pharmacyId, 'MARGIN_PERCENTAGE')
  )

  if (!stock) {
    stock = await prisma.stock.create({
      data: {
        pharmacyId,
        medicineId,
        totalPieces: detail.quantityPieces,
        basePrice: detail.finalPrice,
        calculatedPrice: detail.calculatedPrice,
        createdById: userId,
      },
    })
  } else {
    // update stock header
    // update basePrice only if new price is higher
    const newBasePrice = detail.finalPrice
    const shouldUpdatePrice = newBasePrice.greaterThan(stock.basePrice)

    const updatedBasePrice = shouldUpdatePrice ? newBasePrice : stock.basePrice
    const updatedCalculatedPrice = shouldUpdatePrice
      ? new Decimal(
          (
            parseFloat(updatedBasePrice.toString()) *
            (1 + marginPercentage / 100)
          ).toFixed(2)
        )
      : stock.calculatedPrice

    stock = await prisma.stock.update({
      where: { id: stock.id },
      data: {
        totalPieces: stock.totalPieces + detail.quantityPieces,
        basePrice: updatedBasePrice,
        calculatedPrice: updatedCalculatedPrice,
        ...(shouldUpdatePrice && { isManualPrice: false }),
        updatedById: userId,
      },
    })
  }

  // create stock detail
  const stockDetail = await prisma.stockDetail.create({
    data: {
      stockId: stock.id,
      distributorId,
      invoiceDetailId,
      batchNumber: detail.batchNumber,
      expiryDate: detail.expiryDate,
      quantityPieces: detail.quantityPieces,
      quantityBox: detail.quantityBox,
      quantityPerBox: detail.quantityPerBox,
      createdById: userId,
    },
  })

  // create stock movement
  await prisma.stockMovement.create({
    data: {
      pharmacyId,
      medicineId,
      stockId: stock.id,
      stockDetailId: stockDetail.id,
      invoiceDetailId,
      type: 'IN',
      reason: 'PURCHASE',
      quantity: detail.quantityPieces,
      createdById: userId,
    },
  })
}

// ── PO Update ─────────────────────────────────────────

const updatePurchaseOrderAfterInvoice = async (
  purchaseOrderId: number,
  invoicedMedicineIds: number[],
  userId: number
) => {
  // get all PO details
  const poDetails = await prisma.purchaseOrderDetail.findMany({
    where: { purchaseOrderId, deletedAt: null },
    select: { id: true, medicineId: true },
  })

  // find PO details NOT in invoice
  const notInvoicedDetails = poDetails.filter(
    (d) => !invoicedMedicineIds.includes(d.medicineId)
  )

  // soft delete remaining PO details
  if (notInvoicedDetails.length > 0) {
    await prisma.purchaseOrderDetail.updateMany({
      where: {
        id: { in: notInvoicedDetails.map((d) => d.id) },
      },
      data: {
        deletedAt: new Date(),
        deletedById: userId,
      },
    })
  }

  // update PO status to COMPLETED
  await prisma.purchaseOrder.update({
    where: { id: purchaseOrderId },
    data: {
      status: PurchaseOrderStatus.COMPLETED,
      updatedById: userId,
    },
  })
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
  const distributor = await resolveDistributor(data.distributorUuid, pharmacyId)

  // check invoice number unique
  const existingInvoice = await prisma.invoice.findUnique({
    where: { invoiceNumber: data.invoiceNumber },
  })
  if (existingInvoice) {
    throw new ConflictException('Invoice number already exists')
  }

  let signedById: number | undefined
  if (data.signedByUuid) {
    const employee = await resolveSignedBy(data.signedByUuid, pharmacyId)
    signedById = employee.id
  }

  let purchaseOrderId: number | undefined
  if (data.purchaseOrderUuid) {
    const po = await prisma.purchaseOrder.findFirst({
      where: {
        uuid: data.purchaseOrderUuid,
        pharmacyId,
        status: 'SENT',
      },
      select: { id: true },
    })
    if (!po) throw new NotFoundException('Purchase order not found or not in SENT status')

    // check PO doesn't already have an invoice
    const existingPoInvoice = await prisma.invoice.findFirst({
      where: { purchaseOrderId: po.id, deletedAt: null },
    })
    if (existingPoInvoice) {
      throw new ConflictException('This purchase order already has an invoice')
    }

    purchaseOrderId = po.id
  }

  const marginPercentage = parseFloat(
    await getBusinessParameter(pharmacyId, 'MARGIN_PERCENTAGE')
  )

  // calculate details
  const detailsData = await Promise.all(
    data.details.map(async (detail) => {
      const medicine = await resolveMedicine(detail.medicineUuid, pharmacyId)
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

  // create invoice with details
  const invoice = await prisma.invoice.create({
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
    select: {
      id: true,
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

  // create stock for each detail
  for (const detail of invoice.details) {
    await createStockFromInvoiceDetail(
      detail.id,
      detail.medicineId,
      distributor.id,
      pharmacyId,
      {
        batchNumber: detail.batchNumber,
        expiryDate: detail.expiryDate,
        quantityBox: detail.quantityBox,
        quantityPerBox: detail.quantityPerBox,
        quantityPieces: detail.quantityPieces,
        finalPrice: detail.finalPrice,
        calculatedPrice: detail.calculatedPrice,
      },
      userId
    )
  }

  // update PO if linked
  if (purchaseOrderId) {
    const invoicedMedicineIds = invoice.details.map((d) => d.medicineId)
    await updatePurchaseOrderAfterInvoice(
      purchaseOrderId,
      invoicedMedicineIds,
      userId
    )
  }

  // return full invoice
  const fullInvoice = await prisma.invoice.findUnique({
    where: { id: invoice.id },
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