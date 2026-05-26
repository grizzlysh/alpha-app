import { StockReturnStatus, SignAuthority, Prisma } from '@prisma/client'
import { prisma } from '@config/db'
import {
  CreateStockReturnInput,
  UpdateStockReturnInput,
  CancelStockReturnInput,
  StockReturnQueryInput,
} from './stock-returns.validation'
import { StockReturnResponse } from './stock-returns.interface'
import { NotFoundException } from '@exceptions/NotFoundException'
import { BadRequestException } from '@exceptions/BadRequestException'
import { ForbiddenException } from '@exceptions/ForbiddenException'
import { PaginationMeta } from '@interfaces/common.interface'
import { generateDocNumber } from '@utils/generateDocNumbers'
import { Decimal } from '@prisma/client/runtime/library'

// ── Helpers ───────────────────────────────────────────

const stockReturnSelect = {
  uuid: true,
  returnNumber: true,
  status: true,
  description: true,
  cancellationReason: true,
  returnedAt: true,
  createdAt: true,
  updatedAt: true,
  distributor: {
    select: { uuid: true, name: true },
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
  tx: any
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
  tx: any
) => {
  const employee = await tx.employee.findFirst({
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

const resolveStockDetail = async (
  stockDetailUuid: string,
  pharmacyId: number,
  quantityPieces: number,
  tx: any
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
  const created = await prisma.$transaction(async (tx) => {

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

    // resolve all details
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

    return tx.stockReturn.create({
      data: {
        pharmacyId,
        distributorId: distributor.id,
        signedById,
        returnNumber,
        status: StockReturnStatus.DRAFT,
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
  const existing = await prisma.stockReturn.findFirst({
    where: { uuid, pharmacyId, deletedAt: null },
    select: { id: true, status: true },
  })

  if (!existing) throw new NotFoundException('Stock return not found')

  if (existing.status !== StockReturnStatus.DRAFT) {
    throw new BadRequestException(
      'Stock return can only be edited in DRAFT status'
    )
  }

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
    const employee = await prisma.employee.findFirst({
      where: { uuid: data.signedByUuid, pharmacyId, status: 'ACTIVE' },
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
    signedById = employee.id
  }

  const stockReturn = await prisma.stockReturn.update({
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
    select: stockReturnSelect,
  })

  return stockReturn as unknown as StockReturnResponse
}

export const completeStockReturn = async (
  uuid: string,
  pharmacyId: number,
  userId: number
): Promise<StockReturnResponse> => {
  const result = await prisma.$transaction(async (tx) => {

    const stockReturn = await tx.stockReturn.findFirst({
      where: { uuid, pharmacyId, deletedAt: null },
      select: {
        id: true,
        status: true,
        signedById: true,
        details: {
          select: {
            id: true,
            quantityPieces: true,
            quantityBox: true,
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

    if (!stockReturn) throw new NotFoundException('Stock return not found')

    if (stockReturn.status !== StockReturnStatus.DRAFT) {
      throw new BadRequestException(
        'Stock return can only be completed from DRAFT status'
      )
    }

    if (!stockReturn.signedById) {
      throw new BadRequestException(
        'Stock return must be signed before completing'
      )
    }

    // ── Deduct Stock per Detail ───────────────────
    for (const detail of stockReturn.details) {
      const stockDetail = detail.stockDetail
      const quantityBefore = stockDetail.stock.totalPieces
      const quantityAfter = quantityBefore - detail.quantityPieces

      if (quantityAfter < 0) {
        throw new BadRequestException(
          `Insufficient stock for this return`
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

      // create stock movement
      await tx.stockMovement.create({
        data: {
          pharmacyId,
          medicineId: detail.medicineId,
          stockId: stockDetail.stockId,
          stockDetailId: stockDetail.id,
          stockReturnId: stockReturn.id,
          type: 'OUT',
          reason: 'RETURN',
          quantity: detail.quantityPieces,
          quantityBefore,
          quantityAfter,
          createdById: userId,
        },
      })
    }

    // ── Update Stock Return Status ────────────────
    await tx.stockReturn.update({
      where: { id: stockReturn.id },
      data: {
        status: StockReturnStatus.COMPLETED,
        returnedAt: new Date(),
        updatedById: userId,
      },
    })

    return stockReturn.id
  }, {
    timeout: 10000,
    maxWait: 5000,
  })

  const fullReturn = await prisma.stockReturn.findUnique({
    where: { id: result },
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
  const result = await prisma.$transaction(async (tx) => {

    const stockReturn = await tx.stockReturn.findFirst({
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

    if (!stockReturn) throw new NotFoundException('Stock return not found')

    if (stockReturn.status === StockReturnStatus.CANCELLED) {
      throw new BadRequestException('Stock return is already cancelled')
    }

    // ── Restore Stock if COMPLETED ────────────────
    if (stockReturn.status === StockReturnStatus.COMPLETED) {
      for (const detail of stockReturn.details) {
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

        // create stock movement (IN, RETURN — restore)
        await tx.stockMovement.create({
          data: {
            pharmacyId,
            medicineId: detail.medicineId,
            stockId: stockDetail.stockId,
            stockDetailId: stockDetail.id,
            stockReturnId: stockReturn.id,
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
    }

    // ── Update Status ─────────────────────────────
    await tx.stockReturn.update({
      where: { id: stockReturn.id },
      data: {
        status: StockReturnStatus.CANCELLED,
        cancellationReason: data.description,
        updatedById: userId,
      },
    })

    return stockReturn.id
  }, {
    timeout: 10000,
    maxWait: 5000,
  })

  const fullReturn = await prisma.stockReturn.findUnique({
    where: { id: result },
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

  if (existing.status !== StockReturnStatus.DRAFT) {
    throw new BadRequestException(
      'Only DRAFT stock returns can be deleted'
    )
  }

  await prisma.stockReturn.update({
    where: { id: existing.id },
    data: {
      deletedAt: new Date(),
      deletedById: userId,
    },
  })
}