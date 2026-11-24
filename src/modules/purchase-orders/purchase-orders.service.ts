import { PurchaseOrderStatus, RecordStatus } from '@prisma/client'
import { prisma } from '@config/db'
import { signerLevelForMedicines, resolveSigner } from '@utils/signer'
import {
  CreatePurchaseOrderInput,
  UpdatePurchaseOrderInput,
  CancelPurchaseOrderInput,
  PurchaseOrderQueryInput,
} from './purchase-orders.validation'
import { PurchaseOrderResponse, PurchaseOrderDropdownItem, PurchaseOrderPrintResponse } from './purchase-orders.interface'
import { NotFoundException } from '@exceptions/NotFoundException'
import { BadRequestException } from '@exceptions/BadRequestException'
import { PaginationMeta } from '@interfaces/common.interface'
import { generateDocNumber, withDocNumberRetry } from '@utils/generateDocNumbers'
import { ORDER_NUMBER_PREFIX, resolveOrderLetterKind } from '@utils/orderLetter'

// ── Helpers ───────────────────────────────────────────

const purchaseOrderSelect = {
  uuid: true,
  orderNumber: true,
  kind: true,
  status: true,
  description: true,
  cancellationReason: true,
  orderedAt: true,
  createdAt: true,
  updatedAt: true,
  distributor: {
    select: { uuid: true, name: true },
  },
  signedByUser: {
    select: { uuid: true, name: true },
  },
  details: {
    where: { deletedAt: null },
    select: {
      uuid: true,
      quantity: true,
      unit: true,
      description: true,
      medicine: {
        select: {
          uuid: true,
          name: true,
          unit: true,
          shape: { select: { name: true } },
          ingredients: { select: { name: true, strength: true }, orderBy: { id: 'asc' as const } },
        },
      },
    },
  },
}

const checkEditable = (status: PurchaseOrderStatus): void => {
  if (status !== PurchaseOrderStatus.DRAFT) {
    throw new BadRequestException(
      'Purchase order can only be edited in DRAFT status'
    )
  }
}

const checkCancellable = (status: PurchaseOrderStatus): void => {
  if (
    status === PurchaseOrderStatus.COMPLETED ||
    status === PurchaseOrderStatus.CANCELLED
  ) {
    throw new BadRequestException(
      'Purchase order cannot be cancelled in its current status'
    )
  }
}

// ── Services ──────────────────────────────────────────

export const getPurchaseOrders = async (
  pharmacyId: number,
  query: PurchaseOrderQueryInput
): Promise<{ data: PurchaseOrderResponse[]; meta: PaginationMeta }> => {
  const {
    search,
    status,
    distributorUuid,
    dateFrom,
    dateTo,
    sortBy,
    sortOrder,
    page,
    limit,
  } = query

  const skip: number = (page - 1) * limit

  let distributorId: number | undefined
  if (distributorUuid) {
    const distributor = await prisma.distributor.findFirst({
      where: { uuid: distributorUuid, pharmacyId },
      select: { id: true },
    })
    distributorId = distributor?.id
  }

  const where = {
    pharmacyId,
    deletedAt: null,
    ...(status && { status }),
    ...(distributorId && { distributorId }),
    ...(dateFrom && { orderedAt: { gte: new Date(dateFrom) } }),
    ...(dateTo && { orderedAt: { lte: new Date(dateTo) } }),
    ...(search && {
      OR: [
        { orderNumber: { contains: search, mode: 'insensitive' as const } },
        {
          distributor: {
            name: { contains: search, mode: 'insensitive' as const },
          },
        },
      ],
    }),
  }

  const [purchaseOrders, total] = await prisma.$transaction([
    prisma.purchaseOrder.findMany({
      where,
      select: purchaseOrderSelect,
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    }),
    prisma.purchaseOrder.count({ where }),
  ])

  const meta: PaginationMeta = {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  }

  return { data: purchaseOrders as unknown as PurchaseOrderResponse[], meta }
}

export const getPurchaseOrderByUuid = async (
  uuid: string,
  pharmacyId: number
): Promise<PurchaseOrderResponse> => {
  const purchaseOrder = await prisma.purchaseOrder.findFirst({
    where: { uuid, pharmacyId, deletedAt: null },
    select: purchaseOrderSelect,
  })

  if (!purchaseOrder) throw new NotFoundException('Purchase order not found')

  return purchaseOrder as unknown as PurchaseOrderResponse
}

export const createPurchaseOrder = async (
  data: CreatePurchaseOrderInput,
  pharmacyId: number,
  userId: number
): Promise<PurchaseOrderResponse> => {
  const purchaseOrder = await withDocNumberRetry('PO', () => prisma.$transaction(async (tx) => {

    // ── Resolve Distributor ───────────────────────
    const distributor = await tx.distributor.findFirst({
      where: { uuid: data.distributorUuid, pharmacyId, status: 'ACTIVE' },
      select: { id: true },
    })
    if (!distributor) throw new NotFoundException('Distributor not found')

    // ── Generate Order Number ─────────────────────
    const pharmacy = await tx.pharmacy.findUnique({
      where: { id: pharmacyId },
      select: { code: true },
    })
    if (!pharmacy) throw new NotFoundException('Pharmacy not found')

    // ── Resolve Medicine IDs ──────────────────────
    const details = await Promise.all(
      data.details.map(async (detail) => {
        const medicine = await tx.medicine.findFirst({
          where: {
            uuid: detail.medicineUuid,
            pharmacyId,
            status: 'ACTIVE',
          },
          select: { id: true },
        })
        if (!medicine) {
          throw new NotFoundException(
            `Medicine not found: ${detail.medicineUuid}`
          )
        }
        return {
          medicineId: medicine.id,
          quantity: detail.quantity,
          unit: detail.unit,
          description: detail.description,
          createdById: userId,
        }
      })
    )

    // ── One kind of medicine per letter ──
    const kind = await resolveOrderLetterKind(tx, details.map((d) => d.medicineId))
    const orderNumber = await generateDocNumber({
      type: 'PO',
      prefix: ORDER_NUMBER_PREFIX[kind],
      pharmacyId,
      pharmacyCode: pharmacy.code,
    })

    // ── Signer: a licensed pharmacist; the Head Pharmacist for controlled medicines ──
    let signedById: number | undefined
    if (data.signedByUuid) {
      const level = await signerLevelForMedicines(tx, details.map((d) => d.medicineId))
      signedById = await resolveSigner(tx, { uuid: data.signedByUuid }, pharmacyId, level)
    }

    // ── Create Purchase Order + Details ───────────
    return tx.purchaseOrder.create({
      data: {
        pharmacyId,
        distributorId: distributor.id,
        signedById,
        orderNumber,
        kind,
        description: data.description,
        createdById: userId,
        details: {
          create: details,
        },
      },
      select: purchaseOrderSelect,
    })
  }, { timeout: 10000, maxWait: 5000 }))

  return purchaseOrder as unknown as PurchaseOrderResponse
}

export const updatePurchaseOrder = async (
  uuid: string,
  data: UpdatePurchaseOrderInput,
  pharmacyId: number,
  userId: number
): Promise<PurchaseOrderResponse> => {
  const purchaseOrder = await withDocNumberRetry('PO', () => prisma.$transaction(async (tx) => {
    const existing = await tx.purchaseOrder.findFirst({
      where: { uuid, pharmacyId, deletedAt: null },
      select: { id: true, status: true, signedById: true, kind: true, pharmacy: { select: { code: true } } },
    })

    if (!existing) throw new NotFoundException('Purchase order not found')
    checkEditable(existing.status)

    let distributorId: number | undefined
    if (data.distributorUuid) {
      const distributor = await tx.distributor.findFirst({
        where: { uuid: data.distributorUuid, pharmacyId, status: 'ACTIVE' },
        select: { id: true },
      })
      if (!distributor) throw new NotFoundException('Distributor not found')
      distributorId = distributor.id
    }

    let detailsCreate: any[] | undefined
    if (data.details) {
      detailsCreate = await Promise.all(
        data.details.map(async (detail) => {
          const medicine = await tx.medicine.findFirst({
            where: { uuid: detail.medicineUuid, pharmacyId, status: 'ACTIVE' },
            select: { id: true },
          })
          if (!medicine) throw new NotFoundException(`Medicine not found: ${detail.medicineUuid}`)
          return {
            medicineId: medicine.id,
            quantity: detail.quantity,
            unit: detail.unit,
            description: detail.description,
            createdById: userId,
          }
        })
      )
    }

    const kind = detailsCreate ? await resolveOrderLetterKind(tx, detailsCreate.map((d) => d.medicineId as number)) : undefined
    // A draft whose items now make it another kind of letter moves to that kind's number series.
    const orderNumber = kind && kind !== existing.kind
      ? await generateDocNumber({ type: 'PO', prefix: ORDER_NUMBER_PREFIX[kind], pharmacyId, pharmacyCode: existing.pharmacy.code })
      : undefined

    // Re-check the signer whenever it or the items change: adding a narcotic
    // to an order signed by a Pharmacist must move it to the Head Pharmacist.
    let signedById: number | undefined
    const signer = data.signedByUuid ? { uuid: data.signedByUuid } : existing.signedById ? { id: existing.signedById } : null
    if (signer && (data.signedByUuid || detailsCreate)) {
      const medicineIds = detailsCreate
        ? detailsCreate.map((d) => d.medicineId as number)
        : (await tx.purchaseOrderDetail.findMany({ where: { purchaseOrderId: existing.id, deletedAt: null }, select: { medicineId: true } })).map((d) => d.medicineId)
      const level = await signerLevelForMedicines(tx, medicineIds)
      const id = await resolveSigner(tx, signer, pharmacyId, level)
      if (data.signedByUuid) signedById = id
    }

    return tx.purchaseOrder.update({
      where: { id: existing.id },
      data: {
        ...(distributorId && { distributorId }),
        ...(signedById && { signedById }),
        ...(kind && { kind }),
        ...(orderNumber && { orderNumber }),
        ...(data.description !== undefined && { description: data.description }),
        updatedById: userId,
        ...(detailsCreate && {
          details: {
            updateMany: {
              where: { deletedAt: null },
              data: { deletedAt: new Date(), deletedById: userId },
            },
            create: detailsCreate,
          },
        }),
      },
      select: purchaseOrderSelect,
    })
  }, { timeout: 10000, maxWait: 5000 }))

  return purchaseOrder as unknown as PurchaseOrderResponse
}

export const submitPurchaseOrder = async (
  uuid: string,
  pharmacyId: number,
  userId: number
): Promise<PurchaseOrderResponse> => {
  const existing = await prisma.purchaseOrder.findFirst({
    where: { uuid, pharmacyId, deletedAt: null },
    select: { id: true, status: true, signedById: true },
  })

  if (!existing) throw new NotFoundException('Purchase order not found')
  checkEditable(existing.status)

  if (!existing.signedById) {
    throw new BadRequestException(
      'Purchase order must be signed before submitting'
    )
  }

  const purchaseOrder = await prisma.purchaseOrder.update({
    where: { id: existing.id },
    data: {
      status: PurchaseOrderStatus.SENT,
      updatedById: userId,
    },
    select: purchaseOrderSelect,
  })

  return purchaseOrder as unknown as PurchaseOrderResponse
}

export const completePurchaseOrder = async (
  uuid: string,
  pharmacyId: number,
  userId: number
): Promise<PurchaseOrderResponse> => {
  const existing = await prisma.purchaseOrder.findFirst({
    where: { uuid, pharmacyId, deletedAt: null },
    select: { id: true, status: true },
  })

  if (!existing) throw new NotFoundException('Purchase order not found')

  if (existing.status !== PurchaseOrderStatus.SENT) {
    throw new BadRequestException('Only SENT purchase orders can be completed')
  }

  const purchaseOrder = await prisma.purchaseOrder.update({
    where: { id: existing.id },
    data: {
      status: PurchaseOrderStatus.COMPLETED,
      updatedById: userId,
    },
    select: purchaseOrderSelect,
  })

  return purchaseOrder as unknown as PurchaseOrderResponse
}

export const cancelPurchaseOrder = async (
  uuid: string,
  data: CancelPurchaseOrderInput,
  pharmacyId: number,
  userId: number
): Promise<PurchaseOrderResponse> => {
  const existing = await prisma.purchaseOrder.findFirst({
    where: { uuid, pharmacyId, deletedAt: null },
    select: { id: true, status: true },
  })

  if (!existing) throw new NotFoundException('Purchase order not found')
  checkCancellable(existing.status)

  const purchaseOrder = await prisma.purchaseOrder.update({
    where: { id: existing.id },
    data: {
      status: PurchaseOrderStatus.CANCELLED,
      cancellationReason: data.cancellationReason,
      updatedById: userId,
    },
    select: purchaseOrderSelect,
  })

  return purchaseOrder as unknown as PurchaseOrderResponse
}

export const deletePurchaseOrder = async (
  uuid: string,
  pharmacyId: number,
  userId: number
): Promise<void> => {
  const existing = await prisma.purchaseOrder.findFirst({
    where: { uuid, pharmacyId, deletedAt: null },
    select: { id: true, status: true },
  })

  if (!existing) throw new NotFoundException('Purchase order not found')

  if (existing.status !== PurchaseOrderStatus.DRAFT) {
    throw new BadRequestException('Only DRAFT purchase orders can be deleted')
  }

  await prisma.purchaseOrder.update({
    where: { id: existing.id },
    data: {
      deletedAt: new Date(),
      deletedById: userId,
    },
  })
}

export const getPurchaseOrderPrintData = async (
  uuid: string,
  pharmacyId: number
): Promise<PurchaseOrderPrintResponse> => {
  const purchaseOrder = await prisma.purchaseOrder.findFirst({
    where: { uuid, pharmacyId, deletedAt: null },
    select: {
      orderNumber: true,
      orderedAt: true,
      kind: true,
      distributor: { select: { name: true, address: true, phone: true, permitNumber: true } },
      pharmacy: {
        select: {
          name: true,
          address: true,
          location: true,
          phone: true,
          status: true,
          businessLicenses: {
            where: { status: RecordStatus.ACTIVE, deletedAt: null },
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { licenseNumber: true },
          },
          placements: {
            where: {
              status: RecordStatus.ACTIVE,
              deletedAt: null,
              leftAt: null,
              isHeadPharmacist: true,
            },
            take: 1,
            select: {
              user: { select: { name: true } },
              practiceLicenses: {
                where: { status: RecordStatus.ACTIVE, deletedAt: null },
                orderBy: { createdAt: 'desc' },
                take: 1,
                select: { licenseNumber: true },
              },
            },
          },
        },
      },
    },
  })

  if (!purchaseOrder) throw new NotFoundException('Purchase order not found')

  const headPharmacistPlacement = purchaseOrder.pharmacy.placements[0] ?? null

  return {
    orderNumber: purchaseOrder.orderNumber,
    orderedAt: purchaseOrder.orderedAt,
    kind: purchaseOrder.kind,
    distributor: purchaseOrder.distributor,
    pharmacy: {
      name: purchaseOrder.pharmacy.name,
      address: purchaseOrder.pharmacy.address,
      location: purchaseOrder.pharmacy.location,
      phone: purchaseOrder.pharmacy.phone,
      businessLicenseNumber: purchaseOrder.pharmacy.businessLicenses[0]?.licenseNumber ?? null,
    },
    headPharmacist: headPharmacistPlacement
      ? {
          name: headPharmacistPlacement.user.name,
          practiceLicenseNumber: headPharmacistPlacement.practiceLicenses[0]?.licenseNumber ?? null,
        }
      : null,
  }
}

export const getPurchaseOrdersDropdown = async (
  pharmacyId: number,
  search?: string
): Promise<PurchaseOrderDropdownItem[]> => {
  const rows = await prisma.purchaseOrder.findMany({
    where: {
      pharmacyId,
      deletedAt: null,
      status: { not: PurchaseOrderStatus.CANCELLED },
      ...(search && { orderNumber: { contains: search, mode: 'insensitive' as const } }),
    },
    select: {
      uuid: true,
      orderNumber: true,
      status: true,
      distributor: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return rows.map(r => ({
    uuid: r.uuid,
    orderNumber: r.orderNumber,
    status: r.status,
    distributorName: r.distributor.name,
  }))
}