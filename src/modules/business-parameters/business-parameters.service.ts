import { DataType, Prisma } from '@prisma/client'
import { prisma } from '@config/db'
import { NAME_CASES, NAME_DISPLAY_CASE_KEY } from '@constants/defaultCatalog'
import {
  BusinessParameterQueryInput,
  UpdateBusinessParameterInput,
} from './business-parameters.validation'
import { BusinessParameterResponse } from './business-parameters.interface'
import { NotFoundException } from '@exceptions/NotFoundException'
import { BadRequestException } from '@exceptions/BadRequestException'
import { PaginationMeta } from '@interfaces/common.interface'

// ── Helpers ───────────────────────────────────────────

const businessParameterSelect = {
  uuid: true,
  key: true,
  value: true,
  description: true,
  createdAt: true,
  updatedAt: true,
}

const formatResponse = (param: Prisma.BusinessParameterGetPayload<{ select: typeof businessParameterSelect }>): BusinessParameterResponse => ({
  uuid: param.uuid,
  key: param.key,
  value: param.value,
  description: param.description,
  createdAt: param.createdAt,
  updatedAt: param.updatedAt,
})

// ── Services ──────────────────────────────────────────
// Parameters always belong to the pharmacy selected in the token — platform
// admins included — so one pharmacy's settings never leak into another's list.

export const getBusinessParameters = async (
  pharmacyId: number,
  query: BusinessParameterQueryInput
): Promise<{ data: BusinessParameterResponse[]; meta: PaginationMeta }> => {
  const { search, sortBy, sortOrder, page, limit } = query

  const where: Prisma.BusinessParameterWhereInput = {
    pharmacyId,
    ...(search && { key: { contains: search, mode: 'insensitive' as const } }),
  }

  const [params, total] = await prisma.$transaction([
    prisma.businessParameter.findMany({
      where,
      select: businessParameterSelect,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.businessParameter.count({ where }),
  ])

  return {
    data: params.map(formatResponse),
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  }
}

export const getBusinessParameterByUuid = async (
  uuid: string,
  pharmacyId: number
): Promise<BusinessParameterResponse> => {
  const param = await prisma.businessParameter.findFirst({
    where: { uuid, pharmacyId },
    select: businessParameterSelect,
  })
  if (!param) throw new NotFoundException('Business parameter not found')
  return formatResponse(param)
}

/** Rejects values the code reading the parameter couldn't use (e.g. a margin of "abc"). */
const assertValueMatchesType = (dataType: DataType, value: string): void => {
  if (dataType === DataType.NUMBER || dataType === DataType.PERCENTAGE) {
    const n = Number(value)
    if (!Number.isFinite(n) || n < 0) throw new BadRequestException('Value must be a number of 0 or more')
    if (dataType === DataType.PERCENTAGE && n > 100) throw new BadRequestException('Percentage must be between 0 and 100')
  }
  if (dataType === DataType.BOOLEAN && value !== 'true' && value !== 'false') {
    throw new BadRequestException('Value must be true or false')
  }
}

export const updateBusinessParameter = async (
  uuid: string,
  data: UpdateBusinessParameterInput,
  pharmacyId: number,
  userId: number
): Promise<BusinessParameterResponse> => {
  const existing = await prisma.businessParameter.findFirst({
    where: { uuid, pharmacyId },
    select: { id: true, key: true, dataType: true },
  })
  if (!existing) throw new NotFoundException('Business parameter not found')

  assertValueMatchesType(existing.dataType, data.value)
  if (existing.key === NAME_DISPLAY_CASE_KEY && !(NAME_CASES as readonly string[]).includes(data.value)) {
    throw new BadRequestException('Value must be one of UPPER, TITLE, LOWER, AS_TYPED')
  }

  return prisma.$transaction(async (tx) => {
    const param = await tx.businessParameter.update({
      where: { id: existing.id },
      data: { ...data, updatedById: userId },
      select: businessParameterSelect,
    })

    if (existing.key === 'MARGIN_PERCENTAGE') {
      const margin = Number(param.value)
      await tx.$executeRaw`
        UPDATE inv_stocks
        SET calculated_price = base_price + (base_price * ${margin} / 100),
            updated_at = NOW()
        WHERE pharmacy_id = ${pharmacyId}
      `
    }

    return formatResponse(param)
  })
}
