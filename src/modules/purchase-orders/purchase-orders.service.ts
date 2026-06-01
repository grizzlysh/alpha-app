import { PurchaseOrderStatus } from '@prisma/client'
import { PERMISSIONS } from '@constants/permissions'
import { prisma } from '@config/db'
import {
  CreatePurchaseOrderInput,
  UpdatePurchaseOrderInput,
  CancelPurchaseOrderInput,
  PurchaseOrderQueryInput,
} from './purchase-orders.validation'
import { PurchaseOrderResponse, PurchaseOrderDropdownItem } from './purchase-orders.interface'
import { NotFoundException } from '@exceptions/NotFoundException'
import { BadRequestException } from '@exceptions/BadRequestException'
import { ForbiddenException } from '@exceptions/ForbiddenException'
import { PaginationMeta } from '@interfaces/common.interface'
import { generateDocNumber } from '@utils/generateDocNumbers'

// ── Helpers ───────────────────────────────────────────

const purchaseOrderSelect = {
  uuid: true,
  orderNumber: true,
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
        select: { uuid: true, name: true, unit: true },
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
  const purchaseOrder = await prisma.$transaction(async (tx) => {

    // ── Resolve Distributor ───────────────────────
    const distributor = await tx.distributor.findFirst({
      where: { uuid: data.distributorUuid, pharmacyId, status: 'ACTIVE' },
      select: { id: true },
    })
    if (!distributor) throw new NotFoundException('Distributor not found')

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
      const hasSignFull = signer.placements[0].role.rolePermissions.some(
        (rp) => `${rp.permission.module}.${rp.permission.action}` === PERMISSIONS.SIGN_FULL
      )
      if (!hasSignFull) throw new ForbiddenException('Only fully authorized personnel can sign purchase orders')
      signedById = signer.id
    }

    // ── Generate Order Number ─────────────────────
    const pharmacy = await tx.pharmacy.findUnique({
      where: { id: pharmacyId },
      select: { code: true },
    })
    if (!pharmacy) throw new NotFoundException('Pharmacy not found')

    const orderNumber = await generateDocNumber({
      type: 'PO',
      pharmacyId,
      pharmacyCode: pharmacy.code,
    })

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

    // ── Create Purchase Order + Details ───────────
    return tx.purchaseOrder.create({
      data: {
        pharmacyId,
        distributorId: distributor.id,
        signedById,
        orderNumber,
        description: data.description,
        createdById: userId,
        details: {
          create: details,
        },
      },
      select: purchaseOrderSelect,
    })
  }, {
    timeout: 10000,
    maxWait: 5000,
  })

  return purchaseOrder as unknown as PurchaseOrderResponse
}

export const updatePurchaseOrder = async (
  uuid: string,
  data: UpdatePurchaseOrderInput,
  pharmacyId: number,
  userId: number
): Promise<PurchaseOrderResponse> => {
  const existing = await prisma.purchaseOrder.findFirst({
    where: { uuid, pharmacyId, deletedAt: null },
    select: { id: true, status: true },
  })

  if (!existing) throw new NotFoundException('Purchase order not found')
  checkEditable(existing.status)

  let distributorId: number | undefined
  if (data.distributorUuid) {
    const distributor = await prisma.distributor.findFirst({
      where: { uuid: data.distributorUuid, pharmacyId, status: 'ACTIVE' },
      select: { id: true },
    })
    if (!distributor) throw new NotFoundException('Distributor not found')
    distributorId = distributor.id
  }

  let signedById: number | undefined
  if (data.signedByUuid) {
    const signer = await prisma.user.findFirst({
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
    const hasSignFull = signer.placements[0].role.rolePermissions.some(
      (rp) => `${rp.permission.module}.${rp.permission.action}` === PERMISSIONS.SIGN_FULL
    )
    if (!hasSignFull) throw new ForbiddenException('Only fully authorized personnel can sign purchase orders')
    signedById = signer.id
  }

  const purchaseOrder = await prisma.purchaseOrder.update({
    where: { id: existing.id },
    data: {
      ...(distributorId && { distributorId }),
      ...(signedById && { signedById }),
      ...(data.description !== undefined && { description: data.description }),
      updatedById: userId,
      ...(data.details && {
        details: {
          updateMany: {
            where: { deletedAt: null },
            data: { deletedAt: new Date(), deletedById: userId },
          },
          create: await Promise.all(
            data.details.map(async (detail) => {
              const medicine = await prisma.medicine.findFirst({
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
          ),
        },
      }),
    },
    select: purchaseOrderSelect,
  })

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