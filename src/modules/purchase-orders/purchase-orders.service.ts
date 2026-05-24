import { PurchaseOrderStatus, SignAuthority } from '@prisma/client'
import { prisma } from '@config/db'
import {
  CreatePurchaseOrderInput,
  UpdatePurchaseOrderInput,
  CancelPurchaseOrderInput,
  PurchaseOrderQueryInput,
} from './purchase-orders.validation'
import { PurchaseOrderResponse } from './purchase-orders.interface'
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
  signedByEmployee: {
    select: {
      uuid: true,
      name: true,
      position: {
        select: { name: true, signAuthority: true },
      },
    },
  },
  details: {
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
  pharmacyId: number,
  requiredAuthority: SignAuthority
) => {
  const employee = await prisma.employee.findFirst({
    where: { uuid: signedByUuid, pharmacyId, status: 'ACTIVE' },
    select: {
      id: true,
      position: { select: { signAuthority: true } },
    },
  })

  if (!employee) throw new NotFoundException('Employee not found')

  const authority = employee.position.signAuthority

  if (requiredAuthority === SignAuthority.FULL && authority !== SignAuthority.FULL) {
    throw new ForbiddenException(
      'Only authorized personnel can sign this document'
    )
  }

  if (
    requiredAuthority === SignAuthority.STANDARD &&
    authority === SignAuthority.NONE
  ) {
    throw new ForbiddenException(
      'Only authorized personnel can sign this document'
    )
  }

  return employee
}

const getPharmacyCode = async (pharmacyId: number): Promise<string> => {
  const pharmacy = await prisma.pharmacy.findUnique({
    where: { id: pharmacyId },
    select: { code: true },
  })
  if (!pharmacy) throw new NotFoundException('Pharmacy not found')
  return pharmacy.code
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
    status: status ?? { not: 'DELETED' as const },
    ...(distributorId && { distributorId }),
    ...(dateFrom && {
      orderedAt: { gte: new Date(dateFrom) },
    }),
    ...(dateTo && {
      orderedAt: { lte: new Date(dateTo) },
    }),
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
    where: { uuid, pharmacyId },
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
  const distributor = await resolveDistributor(data.distributorUuid, pharmacyId)

  let signedById: number | undefined
  if (data.signedByUuid) {
    const employee = await resolveSignedBy(
      data.signedByUuid,
      pharmacyId,
      SignAuthority.FULL  // PO requires FULL authority
    )
    signedById = employee.id
  }

  const pharmacyCode = await getPharmacyCode(pharmacyId)
  const orderNumber = await generateDocNumber({
    type: 'PO',
    pharmacyId,
    pharmacyCode,
  })

  // resolve all medicine IDs
  const details = await Promise.all(
    data.details.map(async (detail) => {
      const medicine = await resolveMedicine(detail.medicineUuid, pharmacyId)
      return {
        medicineId: medicine.id,
        quantity: detail.quantity,
        unit: detail.unit,
        description: detail.description,
        createdById: userId,
      }
    })
  )

  const purchaseOrder = await prisma.purchaseOrder.create({
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

  return purchaseOrder as unknown as PurchaseOrderResponse
}

export const updatePurchaseOrder = async (
  uuid: string,
  data: UpdatePurchaseOrderInput,
  pharmacyId: number,
  userId: number
): Promise<PurchaseOrderResponse> => {
  const existing = await prisma.purchaseOrder.findFirst({
    where: { uuid, pharmacyId },
    select: { id: true, status: true },
  })

  if (!existing) throw new NotFoundException('Purchase order not found')

  checkEditable(existing.status)

  let distributorId: number | undefined
  if (data.distributorUuid) {
    const distributor = await resolveDistributor(data.distributorUuid, pharmacyId)
    distributorId = distributor.id
  }

  let signedById: number | undefined
  if (data.signedByUuid) {
    const employee = await resolveSignedBy(
      data.signedByUuid,
      pharmacyId,
      SignAuthority.FULL
    )
    signedById = employee.id
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
          deleteMany: {},
          create: await Promise.all(
            data.details.map(async (detail) => {
              const medicine = await resolveMedicine(
                detail.medicineUuid,
                pharmacyId
              )
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
    where: { uuid, pharmacyId },
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
    where: { uuid, pharmacyId },
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
    where: { uuid, pharmacyId },
    select: { id: true, status: true },
  })

  if (!existing) throw new NotFoundException('Purchase order not found')

  if (existing.status !== PurchaseOrderStatus.DRAFT) {
    throw new BadRequestException(
      'Only DRAFT purchase orders can be deleted'
    )
  }

  await prisma.purchaseOrder.update({
    where: { id: existing.id },
    data: {
      status: 'CANCELLED',
      deletedAt: new Date(),
      deletedById: userId,
    },
  })
}