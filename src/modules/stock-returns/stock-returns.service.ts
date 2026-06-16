import { StockReturnStatus, Prisma } from '@prisma/client'
import { PERMISSIONS } from '@constants/permissions'
import { prisma } from '@config/db'
import {
  CreateStockReturnInput,
  UpdateStockReturnInput,
  CancelStockReturnInput,
  RejectStockReturnInput,
  StockReturnQueryInput,
} from './stock-returns.validation'
import { StockReturnResponse } from './stock-returns.interface'
import { NotFoundException } from '@exceptions/NotFoundException'
import { BadRequestException } from '@exceptions/BadRequestException'
import { ForbiddenException } from '@exceptions/ForbiddenException'
import { PaginationMeta } from '@interfaces/common.interface'
import { generateDocNumber, withDocNumberRetry } from '@utils/generateDocNumbers'
import { Decimal } from '@prisma/client/runtime/library'

// ── Helpers ───────────────────────────────────────────

const stockReturnSelect = {
  uuid: true,
  returnNumber: true,
  status: true,
  reason: true,
  description: true,
  totalAmount: true,
  cancellationReason: true,
  rejectionReason: true,
  returnedAt: true,
  createdAt: true,
  updatedAt: true,
  distributor: {
    select: { uuid: true, name: true },
  },
  signedByUser: {
    select: { uuid: true, name: true },
  },
  details: {
    select: {
      uuid: true,
      quantityPieces: true,
      quantityBox: true,
      price: true,
      totalAmount: true,
      reason: true,
      medicine: {
        select: { uuid: true, name: true, unit: true },
      },
      stockDetail: {
        select: {
          uuid: true,
          batchNumber: true,
          expiryDate: true,
          invoiceDetail: {
            select: {
              uuid: true,
              invoice: {
                select: { uuid: true, invoiceNumber: true },
              },
            },
          },
        },
      },
    },
  },
}

const resolveDistributor = async (
  distributorUuid: string,
  pharmacyId: number,
  tx: Prisma.TransactionClient
) => {
  const distributor = await tx.distributor.findFirst({
    where: { uuid: distributorUuid, pharmacyId, status: 'ACTIVE' },
    select: { id: true },
  })
  if (!distributor) throw new NotFoundException('Distributor not found')
  return distributor
}

const resolveSignedBy = async (
  signedByUuid: string,
  pharmacyId: number,
  tx: Prisma.TransactionClient
) => {
  const signer = await tx.user.findFirst({
    where: { uuid: signedByUuid, deletedAt: null },
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
  return signer
}

const resolveStockDetail = async (
  stockDetailUuid: string,
  pharmacyId: number,
  quantityPieces: number,
  tx: Prisma.TransactionClient
) => {
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
      invoiceDetail: {
        select: { finalPrice: true },
      },
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
    throw new NotFoundException(
      `Stock detail not found: ${stockDetailUuid}`
    )
  }

  if (stockDetail.quantityPieces < quantityPieces) {
    throw new BadRequestException(
      `Insufficient stock for batch: ${stockDetailUuid}`
    )
  }

  return stockDetail
}

const restoreStockForReturn = async (
  stockReturnId: number,
  pharmacyId: number,
  userId: number,
  tx: Prisma.TransactionClient
): Promise<void> => {
  const details = await tx.stockReturnDetail.findMany({
    where: { stockReturnId },
    select: {
      id: true,
      medicineId: true,
      quantityPieces: true,
      stockDetail: {
        select: {
          id: true,
          stockId: true,
          quantityPieces: true,
          quantityPerBox: true,
          stock: { select: { id: true, totalPieces: true } },
        },
      },
    },
  })

  for (const d of details) {
    const sd = d.stockDetail
    const restoredQty = sd.quantityPieces + d.quantityPieces
    await tx.stockDetail.update({
      where: { id: sd.id },
      data: {
        quantityPieces: restoredQty,
        quantityBox: Math.floor(restoredQty / sd.quantityPerBox),
        updatedById: userId,
      },
    })
    await tx.stock.update({
      where: { id: sd.stockId },
      data: { totalPieces: { increment: d.quantityPieces }, updatedById: userId },
    })
    await tx.stockMovement.create({
      data: {
        pharmacyId,
        medicineId: d.medicineId,
        stockId: sd.stockId,
        stockDetailId: sd.id,
        stockReturnDetailId: d.id,
        type: 'IN',
        reason: 'RETURN',
        quantity: d.quantityPieces,
        quantityBefore: sd.stock.totalPieces,
        quantityAfter: sd.stock.totalPieces + d.quantityPieces,
        createdById: userId,
      },
    })
  }
}

// ── Services ──────────────────────────────────────────

export const getStockReturns = async (
  pharmacyId: number,
  query: StockReturnQueryInput
): Promise<{ data: StockReturnResponse[]; meta: PaginationMeta }> => {
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

  const skip = (page - 1) * limit

  let distributorId: number | undefined
  if (distributorUuid) {
    const distributor = await prisma.distributor.findFirst({
      where: { uuid: distributorUuid, pharmacyId },
      select: { id: true },
    })
    distributorId = distributor?.id
  }

  const where: Prisma.StockReturnWhereInput = {
    pharmacyId,
    deletedAt: null,
    ...(status && { status }),
    ...(distributorId && { distributorId }),
    ...(dateFrom && { createdAt: { gte: new Date(dateFrom) } }),
    ...(dateTo && { createdAt: { lte: new Date(dateTo) } }),
    ...(search && {
      OR: [
        { returnNumber: { contains: search, mode: 'insensitive' } },
        {
          distributor: {
            name: { contains: search, mode: 'insensitive' },
          },
        },
      ],
    }),
  }

  const [stockReturns, total] = await prisma.$transaction([
    prisma.stockReturn.findMany({
      where,
      select: stockReturnSelect,
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    }),
    prisma.stockReturn.count({ where }),
  ])

  const meta: PaginationMeta = {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  }

  return { data: stockReturns as unknown as StockReturnResponse[], meta }
}

export const getStockReturnByUuid = async (
  uuid: string,
  pharmacyId: number
): Promise<StockReturnResponse> => {
  const stockReturn = await prisma.stockReturn.findFirst({
    where: { uuid, pharmacyId, deletedAt: null },
    select: stockReturnSelect,
  })

  if (!stockReturn) throw new NotFoundException('Stock return not found')

  return stockReturn as unknown as StockReturnResponse
}

export const createStockReturn = async (
  data: CreateStockReturnInput,
  pharmacyId: number,
  userId: number
): Promise<StockReturnResponse> => {
  const created = await withDocNumberRetry('SR', () => prisma.$transaction(async (tx) => {

    const distributor = await resolveDistributor(
      data.distributorUuid,
      pharmacyId,
      tx
    )

    let signedById: number | undefined
    if (data.signedByUuid) {
      const employee = await resolveSignedBy(
        data.signedByUuid,
        pharmacyId,
        tx
      )
      signedById = employee.id
    }

    const pharmacy = await tx.pharmacy.findUnique({
      where: { id: pharmacyId },
      select: { code: true },
    })
    if (!pharmacy) throw new NotFoundException('Pharmacy not found')

    const returnNumber = await generateDocNumber({
      type: 'SR',
      pharmacyId,
      pharmacyCode: pharmacy.code,
    })

    // Create header first so we have its ID for detail + movement linking
    const stockReturn = await tx.stockReturn.create({
      data: {
        pharmacyId,
        distributorId: distributor.id,
        signedById,
        returnNumber,
        status: StockReturnStatus.ON_PROCESS,
        reason: data.reason,
        description: data.description,
        totalAmount: 0,
        createdById: userId,
      },
      select: { id: true },
    })

    // Create each detail sequentially: lock stock + create movement
    let totalAmount = new Decimal(0)
    for (const item of data.details) {
      const sd = await resolveStockDetail(item.stockDetailUuid, pharmacyId, item.quantityPieces, tx)

      const price = sd.invoiceDetail.finalPrice
      const detailAmount = price.mul(item.quantityPieces)
      totalAmount = totalAmount.add(detailAmount)

      const quantityBefore = sd.stock.totalPieces
      const quantityAfter = quantityBefore - item.quantityPieces
      const newDetailQty = sd.quantityPieces - item.quantityPieces

      const createdDetail = await tx.stockReturnDetail.create({
        data: {
          stockReturnId: stockReturn.id,
          stockDetailId: sd.id,
          medicineId: sd.stock.medicineId,
          quantityPieces: item.quantityPieces,
          quantityBox: Math.floor(item.quantityPieces / sd.quantityPerBox),
          price,
          totalAmount: detailAmount,
          reason: item.reason,
          createdById: userId,
        },
        select: { id: true },
      })

      await tx.stockDetail.update({
        where: { id: sd.id },
        data: {
          quantityPieces: newDetailQty,
          quantityBox: Math.floor(newDetailQty / sd.quantityPerBox),
          updatedById: userId,
        },
      })
      await tx.stock.update({
        where: { id: sd.stockId },
        data: { totalPieces: { decrement: item.quantityPieces }, updatedById: userId },
      })
      await tx.stockMovement.create({
        data: {
          pharmacyId,
          medicineId: sd.stock.medicineId,
          stockId: sd.stockId,
          stockDetailId: sd.id,
          stockReturnDetailId: createdDetail.id,
          type: 'OUT',
          reason: 'RETURN',
          quantity: item.quantityPieces,
          quantityBefore,
          quantityAfter,
          createdById: userId,
        },
      })
    }

    // Update header with final totalAmount
    await tx.stockReturn.update({
      where: { id: stockReturn.id },
      data: { totalAmount: totalAmount.toDecimalPlaces(0, Decimal.ROUND_HALF_UP) },
    })

    return stockReturn
  }, { timeout: 10000, maxWait: 5000 }))

  const fullReturn = await prisma.stockReturn.findUnique({
    where: { id: created.id },
    select: stockReturnSelect,
  })

  return fullReturn as unknown as StockReturnResponse
}

export const updateStockReturn = async (
  uuid: string,
  data: UpdateStockReturnInput,
  pharmacyId: number,
  userId: number
): Promise<StockReturnResponse> => {
  const stockReturn = await prisma.$transaction(async (tx) => {
    const existing = await tx.stockReturn.findFirst({
      where: { uuid, pharmacyId, deletedAt: null },
      select: { id: true, status: true },
    })

    if (!existing) throw new NotFoundException('Stock return not found')

    if (existing.status !== StockReturnStatus.ON_PROCESS) {
      throw new BadRequestException('Stock return can only be edited in ON_PROCESS status')
    }

    let distributorId: number | undefined
    if (data.distributorUuid) {
      const distributor = await tx.distributor.findFirst({
        where: { uuid: data.distributorUuid, pharmacyId, status: 'ACTIVE' },
        select: { id: true },
      })
      if (!distributor) throw new NotFoundException('Distributor not found')
      distributorId = distributor.id
    }

    let signedById: number | undefined
    if (data.signedByUuid) {
      const signer = await resolveSignedBy(data.signedByUuid, pharmacyId, tx)
      signedById = signer.id
    }

    let newTotalAmount: Decimal | undefined
    if (data.details) {
      // Restore stock for existing details
      await restoreStockForReturn(existing.id, pharmacyId, userId, tx)

      // Delete old details
      await tx.stockReturnDetail.deleteMany({ where: { stockReturnId: existing.id } })

      // Create new details sequentially: lock stock + create movement
      newTotalAmount = new Decimal(0)
      for (const item of data.details) {
        const sd = await resolveStockDetail(item.stockDetailUuid, pharmacyId, item.quantityPieces, tx)

        const price = sd.invoiceDetail.finalPrice
        const detailAmount = price.mul(item.quantityPieces)
        newTotalAmount = newTotalAmount.add(detailAmount)

        const quantityBefore = sd.stock.totalPieces
        const quantityAfter = quantityBefore - item.quantityPieces
        const newDetailQty = sd.quantityPieces - item.quantityPieces

        const createdDetail = await tx.stockReturnDetail.create({
          data: {
            stockReturnId: existing.id,
            stockDetailId: sd.id,
            medicineId: sd.stock.medicineId,
            quantityPieces: item.quantityPieces,
            quantityBox: Math.floor(item.quantityPieces / sd.quantityPerBox),
            price,
            totalAmount: detailAmount,
            reason: item.reason,
            createdById: userId,
          },
          select: { id: true },
        })

        await tx.stockDetail.update({
          where: { id: sd.id },
          data: {
            quantityPieces: newDetailQty,
            quantityBox: Math.floor(newDetailQty / sd.quantityPerBox),
            updatedById: userId,
          },
        })
        await tx.stock.update({
          where: { id: sd.stockId },
          data: { totalPieces: { decrement: item.quantityPieces }, updatedById: userId },
        })
        await tx.stockMovement.create({
          data: {
            pharmacyId,
            medicineId: sd.stock.medicineId,
            stockId: sd.stockId,
            stockDetailId: sd.id,
            stockReturnDetailId: createdDetail.id,
            type: 'OUT',
            reason: 'RETURN',
            quantity: item.quantityPieces,
            quantityBefore,
            quantityAfter,
            createdById: userId,
          },
        })
      }

      newTotalAmount = newTotalAmount.toDecimalPlaces(0, Decimal.ROUND_HALF_UP)
    }

    return tx.stockReturn.update({
      where: { id: existing.id },
      data: {
        ...(distributorId && { distributorId }),
        ...(signedById && { signedById }),
        ...(data.reason !== undefined && { reason: data.reason }),
        ...(data.description !== undefined && { description: data.description }),
        ...(newTotalAmount !== undefined && { totalAmount: newTotalAmount }),
        updatedById: userId,
      },
      select: stockReturnSelect,
    })
  }, { timeout: 10000, maxWait: 5000 })

  return stockReturn as unknown as StockReturnResponse
}

export const completeStockReturn = async (
  uuid: string,
  pharmacyId: number,
  userId: number
): Promise<StockReturnResponse> => {
  const existing = await prisma.stockReturn.findFirst({
    where: { uuid, pharmacyId, deletedAt: null },
    select: { id: true, status: true, signedById: true },
  })

  if (!existing) throw new NotFoundException('Stock return not found')

  if (existing.status !== StockReturnStatus.ON_PROCESS) {
    throw new BadRequestException('Stock return can only be completed from ON_PROCESS status')
  }

  if (!existing.signedById) {
    throw new BadRequestException('Stock return must be signed before completing')
  }

  await prisma.stockReturn.update({
    where: { id: existing.id },
    data: { status: StockReturnStatus.COMPLETED, returnedAt: new Date(), updatedById: userId },
  })

  const fullReturn = await prisma.stockReturn.findUnique({
    where: { id: existing.id },
    select: stockReturnSelect,
  })

  return fullReturn as unknown as StockReturnResponse
}

export const rejectStockReturn = async (
  uuid: string,
  data: RejectStockReturnInput,
  pharmacyId: number,
  userId: number
): Promise<StockReturnResponse> => {
  const existing = await prisma.stockReturn.findFirst({
    where: { uuid, pharmacyId, deletedAt: null },
    select: { id: true, status: true },
  })

  if (!existing) throw new NotFoundException('Stock return not found')

  if (existing.status !== StockReturnStatus.ON_PROCESS) {
    throw new BadRequestException('Stock return can only be rejected while ON_PROCESS')
  }

  await prisma.$transaction(async (tx) => {
    await restoreStockForReturn(existing.id, pharmacyId, userId, tx)
    await tx.stockReturn.update({
      where: { id: existing.id },
      data: { status: StockReturnStatus.REJECTED, rejectionReason: data.description, updatedById: userId },
    })
  }, { timeout: 10000, maxWait: 5000 })

  const fullReturn = await prisma.stockReturn.findUnique({
    where: { id: existing.id },
    select: stockReturnSelect,
  })

  return fullReturn as unknown as StockReturnResponse
}

export const cancelStockReturn = async (
  uuid: string,
  data: CancelStockReturnInput,
  pharmacyId: number,
  userId: number
): Promise<StockReturnResponse> => {
  const existing = await prisma.stockReturn.findFirst({
    where: { uuid, pharmacyId, deletedAt: null },
    select: { id: true, status: true },
  })

  if (!existing) throw new NotFoundException('Stock return not found')

  if (existing.status !== StockReturnStatus.ON_PROCESS) {
    throw new BadRequestException('Stock return can only be cancelled while ON_PROCESS')
  }

  await prisma.$transaction(async (tx) => {
    await restoreStockForReturn(existing.id, pharmacyId, userId, tx)
    await tx.stockReturn.update({
      where: { id: existing.id },
      data: { status: StockReturnStatus.CANCELLED, cancellationReason: data.description, updatedById: userId },
    })
  }, { timeout: 10000, maxWait: 5000 })

  const fullReturn = await prisma.stockReturn.findUnique({
    where: { id: existing.id },
    select: stockReturnSelect,
  })

  return fullReturn as unknown as StockReturnResponse
}

export const deleteStockReturn = async (
  uuid: string,
  pharmacyId: number,
  userId: number
): Promise<void> => {
  const existing = await prisma.stockReturn.findFirst({
    where: { uuid, pharmacyId, deletedAt: null },
    select: { id: true, status: true },
  })

  if (!existing) throw new NotFoundException('Stock return not found')

  if (existing.status !== StockReturnStatus.ON_PROCESS) {
    throw new BadRequestException('Only ON_PROCESS stock returns can be deleted')
  }

  await prisma.$transaction(async (tx) => {
    await restoreStockForReturn(existing.id, pharmacyId, userId, tx)
    await tx.stockReturn.update({
      where: { id: existing.id },
      data: { deletedAt: new Date(), deletedById: userId },
    })
  }, { timeout: 10000, maxWait: 5000 })
}