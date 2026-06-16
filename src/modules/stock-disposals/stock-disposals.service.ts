import { StockDisposalStatus, Prisma } from '@prisma/client'
import { PERMISSIONS } from '@constants/permissions'
import { prisma } from '@config/db'
import {
  CreateStockDisposalInput,
  UpdateStockDisposalInput,
  CancelStockDisposalInput,
  StockDisposalQueryInput,
} from './stock-disposals.validation'
import { StockDisposalResponse } from './stock-disposals.interface'
import { NotFoundException } from '@exceptions/NotFoundException'
import { BadRequestException } from '@exceptions/BadRequestException'
import { ForbiddenException } from '@exceptions/ForbiddenException'
import { PaginationMeta } from '@interfaces/common.interface'
import { generateDocNumber, withDocNumberRetry } from '@utils/generateDocNumbers'

// ── Helpers ───────────────────────────────────────────

const stockDisposalSelect = {
  uuid: true,
  disposalNumber: true,
  status: true,
  description: true,
  cancellationReason: true,
  disposedAt: true,
  createdAt: true,
  updatedAt: true,
  signedByUser: {
    select: { uuid: true, name: true },
  },
  details: {
    select: {
      uuid: true,
      quantityPieces: true,
      quantityBox: true,
      reason: true,
      medicine: {
        select: { uuid: true, name: true, unit: true },
      },
      stockDetail: {
        select: {
          uuid: true,
          batchNumber: true,
          expiryDate: true,
        },
      },
    },
  },
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
  const hasSignFull = signer.placements[0].role.rolePermissions.some(
    (rp) => `${rp.permission.module}.${rp.permission.action}` === PERMISSIONS.SIGN_FULL
  )
  if (!hasSignFull) throw new ForbiddenException('Only fully authorized personnel can sign disposal documents')
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

// ── Services ──────────────────────────────────────────

export const getStockDisposals = async (
  pharmacyId: number,
  query: StockDisposalQueryInput
): Promise<{ data: StockDisposalResponse[]; meta: PaginationMeta }> => {
  const {
    search,
    status,
    dateFrom,
    dateTo,
    sortBy,
    sortOrder,
    page,
    limit,
  } = query

  const skip = (page - 1) * limit

  const where: Prisma.StockDisposalWhereInput = {
    pharmacyId,
    deletedAt: null,
    ...(status && { status }),
    ...(dateFrom && { createdAt: { gte: new Date(dateFrom) } }),
    ...(dateTo && { createdAt: { lte: new Date(dateTo) } }),
    ...(search && {
      disposalNumber: { contains: search, mode: 'insensitive' },
    }),
  }

  const [stockDisposals, total] = await prisma.$transaction([
    prisma.stockDisposal.findMany({
      where,
      select: stockDisposalSelect,
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    }),
    prisma.stockDisposal.count({ where }),
  ])

  const meta: PaginationMeta = {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  }

  return { data: stockDisposals as unknown as StockDisposalResponse[], meta }
}

export const getStockDisposalByUuid = async (
  uuid: string,
  pharmacyId: number
): Promise<StockDisposalResponse> => {
  const stockDisposal = await prisma.stockDisposal.findFirst({
    where: { uuid, pharmacyId, deletedAt: null },
    select: stockDisposalSelect,
  })

  if (!stockDisposal) throw new NotFoundException('Stock disposal not found')

  return stockDisposal as unknown as StockDisposalResponse
}

export const createStockDisposal = async (
  data: CreateStockDisposalInput,
  pharmacyId: number,
  userId: number
): Promise<StockDisposalResponse> => {
  const created = await withDocNumberRetry('SD', () => prisma.$transaction(async (tx) => {

    let signedById: number | undefined
    if (data.signedByUuid) {
      const signer = await resolveSignedBy(data.signedByUuid, pharmacyId, tx)
      signedById = signer.id
    }

    const pharmacy = await tx.pharmacy.findUnique({
      where: { id: pharmacyId },
      select: { code: true },
    })
    if (!pharmacy) throw new NotFoundException('Pharmacy not found')

    const disposalNumber = await generateDocNumber({
      type: 'SD',
      pharmacyId,
      pharmacyCode: pharmacy.code,
    })

    const disposal = await tx.stockDisposal.create({
      data: {
        pharmacyId,
        signedById,
        disposalNumber,
        status: StockDisposalStatus.DRAFT,
        description: data.description,
        createdById: userId,
      },
      select: { id: true },
    })

    // Create each detail sequentially: lock stock + create movement
    for (const item of data.details) {
      const stockDetail = await resolveStockDetail(item.stockDetailUuid, pharmacyId, item.quantityPieces, tx)

      const quantityBefore = stockDetail.stock.totalPieces
      const quantityAfter = quantityBefore - item.quantityPieces
      const newDetailQty = stockDetail.quantityPieces - item.quantityPieces

      const createdDetail = await tx.stockDisposalDetail.create({
        data: {
          stockDisposalId: disposal.id,
          stockDetailId: stockDetail.id,
          medicineId: stockDetail.stock.medicineId,
          quantityPieces: item.quantityPieces,
          quantityBox: Math.floor(item.quantityPieces / stockDetail.quantityPerBox),
          reason: item.reason,
          createdById: userId,
        },
        select: { id: true },
      })

      await tx.stockDetail.update({
        where: { id: stockDetail.id },
        data: {
          quantityPieces: newDetailQty,
          quantityBox: Math.floor(newDetailQty / stockDetail.quantityPerBox),
          updatedById: userId,
        },
      })

      await tx.stock.update({
        where: { id: stockDetail.stockId },
        data: { totalPieces: { decrement: item.quantityPieces }, updatedById: userId },
      })

      const movementReason = item.reason === 'DAMAGED' ? 'DAMAGED' : 'DISPOSAL'
      await tx.stockMovement.create({
        data: {
          pharmacyId,
          medicineId: stockDetail.stock.medicineId,
          stockId: stockDetail.stockId,
          stockDetailId: stockDetail.id,
          stockDisposalDetailId: createdDetail.id,
          type: 'OUT',
          reason: movementReason,
          quantity: item.quantityPieces,
          quantityBefore,
          quantityAfter,
          createdById: userId,
        },
      })
    }

    return disposal
  }, { timeout: 10000, maxWait: 5000 }))

  const fullDisposal = await prisma.stockDisposal.findUnique({
    where: { id: created.id },
    select: stockDisposalSelect,
  })

  return fullDisposal as unknown as StockDisposalResponse
}

export const updateStockDisposal = async (
  uuid: string,
  data: UpdateStockDisposalInput,
  pharmacyId: number,
  userId: number
): Promise<StockDisposalResponse> => {
  const stockDisposal = await prisma.$transaction(async (tx) => {
    const existing = await tx.stockDisposal.findFirst({
      where: { uuid, pharmacyId, deletedAt: null },
      select: {
        id: true,
        status: true,
        details: {
          select: {
            id: true,
            quantityPieces: true,
            medicineId: true,
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
        },
      },
    })

    if (!existing) throw new NotFoundException('Stock disposal not found')
    if (existing.status !== StockDisposalStatus.DRAFT) {
      throw new BadRequestException('Stock disposal can only be edited in DRAFT status')
    }

    let signedById: number | undefined
    if (data.signedByUuid) {
      const signer = await resolveSignedBy(data.signedByUuid, pharmacyId, tx)
      signedById = signer.id
    }

    if (data.details) {
      const oldDetailIds = existing.details.map((d) => d.id)

      // Restore stock for existing details
      for (const oldDetail of existing.details) {
        const stockDetail = oldDetail.stockDetail
        const quantityBefore = stockDetail.stock.totalPieces
        const quantityAfter = quantityBefore + oldDetail.quantityPieces
        const newDetailQty = stockDetail.quantityPieces + oldDetail.quantityPieces

        await tx.stockDetail.update({
          where: { id: stockDetail.id },
          data: {
            quantityPieces: newDetailQty,
            quantityBox: Math.floor(newDetailQty / stockDetail.quantityPerBox),
            updatedById: userId,
          },
        })
        await tx.stock.update({
          where: { id: stockDetail.stockId },
          data: { totalPieces: { increment: oldDetail.quantityPieces }, updatedById: userId },
        })
        await tx.stockMovement.create({
          data: {
            pharmacyId,
            medicineId: oldDetail.medicineId,
            stockId: stockDetail.stockId,
            stockDetailId: stockDetail.id,
            stockDisposalDetailId: oldDetail.id,
            type: 'IN',
            reason: 'ADJUSTMENT',
            quantity: oldDetail.quantityPieces,
            quantityBefore,
            quantityAfter,
            description: 'Disposal draft updated - stock released',
            createdById: userId,
          },
        })
      }

      // Unlink movements before deleting old details (nullable FK)
      if (oldDetailIds.length > 0) {
        await tx.stockMovement.updateMany({
          where: { stockDisposalDetailId: { in: oldDetailIds } },
          data: { stockDisposalDetailId: null },
        })
      }
      await tx.stockDisposalDetail.deleteMany({ where: { stockDisposalId: existing.id } })

      // Create new details + lock stock
      for (const item of data.details) {
        const stockDetail = await resolveStockDetail(item.stockDetailUuid, pharmacyId, item.quantityPieces, tx)
        const quantityBefore = stockDetail.stock.totalPieces
        const quantityAfter = quantityBefore - item.quantityPieces
        const newDetailQty = stockDetail.quantityPieces - item.quantityPieces

        const createdDetail = await tx.stockDisposalDetail.create({
          data: {
            stockDisposalId: existing.id,
            stockDetailId: stockDetail.id,
            medicineId: stockDetail.stock.medicineId,
            quantityPieces: item.quantityPieces,
            quantityBox: Math.floor(item.quantityPieces / stockDetail.quantityPerBox),
            reason: item.reason,
            createdById: userId,
          },
          select: { id: true },
        })

        await tx.stockDetail.update({
          where: { id: stockDetail.id },
          data: {
            quantityPieces: newDetailQty,
            quantityBox: Math.floor(newDetailQty / stockDetail.quantityPerBox),
            updatedById: userId,
          },
        })
        await tx.stock.update({
          where: { id: stockDetail.stockId },
          data: { totalPieces: { decrement: item.quantityPieces }, updatedById: userId },
        })

        const movementReason = item.reason === 'DAMAGED' ? 'DAMAGED' : 'DISPOSAL'
        await tx.stockMovement.create({
          data: {
            pharmacyId,
            medicineId: stockDetail.stock.medicineId,
            stockId: stockDetail.stockId,
            stockDetailId: stockDetail.id,
            stockDisposalDetailId: createdDetail.id,
            type: 'OUT',
            reason: movementReason,
            quantity: item.quantityPieces,
            quantityBefore,
            quantityAfter,
            createdById: userId,
          },
        })
      }
    }

    return tx.stockDisposal.update({
      where: { id: existing.id },
      data: {
        ...(signedById && { signedById }),
        ...(data.description !== undefined && { description: data.description }),
        updatedById: userId,
      },
      select: stockDisposalSelect,
    })
  }, { timeout: 15000, maxWait: 5000 })

  return stockDisposal as unknown as StockDisposalResponse
}

export const completeStockDisposal = async (
  uuid: string,
  pharmacyId: number,
  userId: number
): Promise<StockDisposalResponse> => {
  const result = await prisma.$transaction(async (tx) => {

    const stockDisposal = await tx.stockDisposal.findFirst({
      where: { uuid, pharmacyId, deletedAt: null },
      select: { id: true, status: true, signedById: true },
    })

    if (!stockDisposal) throw new NotFoundException('Stock disposal not found')

    if (stockDisposal.status !== StockDisposalStatus.DRAFT) {
      throw new BadRequestException('Stock disposal can only be completed from DRAFT status')
    }

    if (!stockDisposal.signedById) {
      throw new BadRequestException('Stock disposal must be signed before completing')
    }

    // Stock was already locked when the draft was created — just finalize status
    await tx.stockDisposal.update({
      where: { id: stockDisposal.id },
      data: {
        status: StockDisposalStatus.COMPLETED,
        disposedAt: new Date(),
        updatedById: userId,
      },
    })

    return stockDisposal.id
  }, {
    timeout: 10000,
    maxWait: 5000,
  })

  const fullDisposal = await prisma.stockDisposal.findUnique({
    where: { id: result },
    select: stockDisposalSelect,
  })

  return fullDisposal as unknown as StockDisposalResponse
}

export const cancelStockDisposal = async (
  uuid: string,
  data: CancelStockDisposalInput,
  pharmacyId: number,
  userId: number
): Promise<StockDisposalResponse> => {
  const result = await prisma.$transaction(async (tx) => {

    const stockDisposal = await tx.stockDisposal.findFirst({
      where: { uuid, pharmacyId, deletedAt: null },
      select: {
        id: true,
        status: true,
        details: {
          select: {
            id: true,
            quantityPieces: true,
            medicineId: true,
            stockDetailId: true,
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
      },
    })

    if (!stockDisposal) throw new NotFoundException('Stock disposal not found')

    if (stockDisposal.status === StockDisposalStatus.CANCELLED) {
      throw new BadRequestException('Stock disposal is already cancelled')
    }

    // Stock was locked at draft time — always restore it on cancel
    for (const detail of stockDisposal.details) {
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
        data: { totalPieces: { increment: detail.quantityPieces }, updatedById: userId },
      })
      await tx.stockMovement.create({
        data: {
          pharmacyId,
          medicineId: detail.medicineId,
          stockId: stockDetail.stockId,
          stockDetailId: stockDetail.id,
          stockDisposalDetailId: detail.id,
          type: 'IN',
          reason: 'ADJUSTMENT',
          quantity: detail.quantityPieces,
          quantityBefore,
          quantityAfter,
          description: data.description,
          createdById: userId,
        },
      })
    }

    // ── Update Status ─────────────────────────────
    await tx.stockDisposal.update({
      where: { id: stockDisposal.id },
      data: {
        status: StockDisposalStatus.CANCELLED,
        cancellationReason: data.description,
        updatedById: userId,
      },
    })

    return stockDisposal.id
  }, {
    timeout: 10000,
    maxWait: 5000,
  })

  const fullDisposal = await prisma.stockDisposal.findUnique({
    where: { id: result },
    select: stockDisposalSelect,
  })

  return fullDisposal as unknown as StockDisposalResponse
}

export const deleteStockDisposal = async (
  uuid: string,
  pharmacyId: number,
  userId: number
): Promise<void> => {
  await prisma.$transaction(async (tx) => {
    const existing = await tx.stockDisposal.findFirst({
      where: { uuid, pharmacyId, deletedAt: null },
      select: {
        id: true,
        status: true,
        details: {
          select: {
            id: true,
            quantityPieces: true,
            medicineId: true,
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
        },
      },
    })

    if (!existing) throw new NotFoundException('Stock disposal not found')

    if (existing.status !== StockDisposalStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT stock disposals can be deleted')
    }

    // Restore stock locked at draft time
    for (const detail of existing.details) {
      const stockDetail = detail.stockDetail
      const quantityBefore = stockDetail.stock.totalPieces
      const quantityAfter = quantityBefore + detail.quantityPieces
      const newDetailQty = stockDetail.quantityPieces + detail.quantityPieces

      await tx.stockDetail.update({
        where: { id: stockDetail.id },
        data: {
          quantityPieces: newDetailQty,
          quantityBox: Math.floor(newDetailQty / stockDetail.quantityPerBox),
          updatedById: userId,
        },
      })
      await tx.stock.update({
        where: { id: stockDetail.stockId },
        data: { totalPieces: { increment: detail.quantityPieces }, updatedById: userId },
      })
      await tx.stockMovement.create({
        data: {
          pharmacyId,
          medicineId: detail.medicineId,
          stockId: stockDetail.stockId,
          stockDetailId: stockDetail.id,
          stockDisposalDetailId: detail.id,
          type: 'IN',
          reason: 'ADJUSTMENT',
          quantity: detail.quantityPieces,
          quantityBefore,
          quantityAfter,
          description: 'Disposal draft deleted - stock released',
          createdById: userId,
        },
      })
    }

    await tx.stockDisposal.update({
      where: { id: existing.id },
      data: { deletedAt: new Date(), deletedById: userId },
    })
  }, { timeout: 10000, maxWait: 5000 })
}