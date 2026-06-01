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
import { generateDocNumber } from '@utils/generateDocNumbers'

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
  const created = await prisma.$transaction(async (tx) => {

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

    const detailsData = await Promise.all(
      data.details.map(async (detail) => {
        const stockDetail = await resolveStockDetail(
          detail.stockDetailUuid,
          pharmacyId,
          detail.quantityPieces,
          tx
        )

        return {
          stockDetailId: stockDetail.id,
          medicineId: stockDetail.stock.medicineId,
          quantityPieces: detail.quantityPieces,
          quantityBox: Math.floor(
            detail.quantityPieces / stockDetail.quantityPerBox
          ),
          reason: detail.reason,
          createdById: userId,
        }
      })
    )

    return tx.stockDisposal.create({
      data: {
        pharmacyId,
        signedById,
        disposalNumber,
        status: StockDisposalStatus.DRAFT,
        description: data.description,
        createdById: userId,
        details: {
          create: detailsData,
        },
      },
      select: { id: true },
    })
  }, {
    timeout: 10000,
    maxWait: 5000,
  })

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
  const existing = await prisma.stockDisposal.findFirst({
    where: { uuid, pharmacyId, deletedAt: null },
    select: { id: true, status: true },
  })

  if (!existing) throw new NotFoundException('Stock disposal not found')

  if (existing.status !== StockDisposalStatus.DRAFT) {
    throw new BadRequestException(
      'Stock disposal can only be edited in DRAFT status'
    )
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
    if (!hasSignFull) throw new ForbiddenException('Only fully authorized personnel can sign disposal documents')
    signedById = signer.id
  }

  const stockDisposal = await prisma.stockDisposal.update({
    where: { id: existing.id },
    data: {
      ...(signedById && { signedById }),
      ...(data.description !== undefined && { description: data.description }),
      updatedById: userId,
      ...(data.details && {
        details: {
          deleteMany: {},
          create: await Promise.all(
            data.details.map(async (detail) => {
              const stockDetail = await prisma.stockDetail.findFirst({
                where: {
                  uuid: detail.stockDetailUuid,
                  stock: { pharmacyId },
                },
                select: {
                  id: true,
                  quantityPieces: true,
                  quantityPerBox: true,
                  stock: { select: { medicineId: true } },
                },
              })
              if (!stockDetail) {
                throw new NotFoundException(
                  `Stock detail not found: ${detail.stockDetailUuid}`
                )
              }
              if (stockDetail.quantityPieces < detail.quantityPieces) {
                throw new BadRequestException(
                  `Insufficient stock for batch: ${detail.stockDetailUuid}`
                )
              }
              return {
                stockDetailId: stockDetail.id,
                medicineId: stockDetail.stock.medicineId,
                quantityPieces: detail.quantityPieces,
                quantityBox: Math.floor(
                  detail.quantityPieces / stockDetail.quantityPerBox
                ),
                reason: detail.reason,
                createdById: userId,
              }
            })
          ),
        },
      }),
    },
    select: stockDisposalSelect,
  })

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
      select: {
        id: true,
        status: true,
        signedById: true,
        details: {
          select: {
            id: true,
            quantityPieces: true,
            reason: true,
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

    if (stockDisposal.status !== StockDisposalStatus.DRAFT) {
      throw new BadRequestException(
        'Stock disposal can only be completed from DRAFT status'
      )
    }

    if (!stockDisposal.signedById) {
      throw new BadRequestException(
        'Stock disposal must be signed before completing'
      )
    }

    // ── Deduct Stock per Detail ───────────────────
    for (const detail of stockDisposal.details) {
      const stockDetail = detail.stockDetail
      const quantityBefore = stockDetail.stock.totalPieces
      const quantityAfter = quantityBefore - detail.quantityPieces

      if (quantityAfter < 0) {
        throw new BadRequestException(
          'Insufficient stock for this disposal'
        )
      }

      const newDetailQuantity =
        stockDetail.quantityPieces - detail.quantityPieces

      // update stock detail
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

      // update stock header
      await tx.stock.update({
        where: { id: stockDetail.stockId },
        data: {
          totalPieces: { decrement: detail.quantityPieces },
          updatedById: userId,
        },
      })

      // determine movement reason
      const movementReason =
        detail.reason === 'DAMAGED' ? 'DAMAGED' : 'DISPOSAL'

      // create stock movement
      await tx.stockMovement.create({
        data: {
          pharmacyId,
          medicineId: detail.medicineId,
          stockId: stockDetail.stockId,
          stockDetailId: stockDetail.id,
          stockDisposalId: stockDisposal.id,
          type: 'OUT',
          reason: movementReason,
          quantity: detail.quantityPieces,
          quantityBefore,
          quantityAfter,
          createdById: userId,
        },
      })
    }

    // ── Update Status ─────────────────────────────
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

    // ── Restore Stock if COMPLETED ────────────────
    if (stockDisposal.status === StockDisposalStatus.COMPLETED) {
      for (const detail of stockDisposal.details) {
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

        // create stock movement (IN, ADJUSTMENT — restore)
        await tx.stockMovement.create({
          data: {
            pharmacyId,
            medicineId: detail.medicineId,
            stockId: stockDetail.stockId,
            stockDetailId: stockDetail.id,
            stockDisposalId: stockDisposal.id,
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
  const existing = await prisma.stockDisposal.findFirst({
    where: { uuid, pharmacyId, deletedAt: null },
    select: { id: true, status: true },
  })

  if (!existing) throw new NotFoundException('Stock disposal not found')

  if (existing.status !== StockDisposalStatus.DRAFT) {
    throw new BadRequestException(
      'Only DRAFT stock disposals can be deleted'
    )
  }

  await prisma.stockDisposal.update({
    where: { id: existing.id },
    data: {
      deletedAt: new Date(),
      deletedById: userId,
    },
  })
}