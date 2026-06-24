import { PlatformRole, Prisma } from '@prisma/client'
import { prisma } from '@config/db'
import {
  BusinessParameterQueryInput,
  UpdateBusinessParameterInput,
} from './business-parameters.validation'
import { BusinessParameterResponse } from './business-parameters.interface'
import { NotFoundException } from '@exceptions/NotFoundException'
import { ForbiddenException } from '@exceptions/ForbiddenException'
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

export const getBusinessParameters = async (
  pharmacyId: number | null,
  platformRole: PlatformRole | null,
  query: BusinessParameterQueryInput
): Promise<{ data: BusinessParameterResponse[]; meta: PaginationMeta }> => {
  const { search, pharmacyUuid, sortBy, sortOrder, page, limit } = query
  const skip = (page - 1) * limit

  let effectivePharmacyId: number | null
  if (platformRole === PlatformRole.PLATFORM_ADMIN) {
    if (pharmacyUuid) {
      const pharmacy = await prisma.pharmacy.findFirst({
        where: { uuid: pharmacyUuid, deletedAt: null },
        select: { id: true },
      })
      if (!pharmacy) throw new NotFoundException('Pharmacy not found')
      effectivePharmacyId = pharmacy.id
    } else {
      effectivePharmacyId = null
    }
  } else {
    effectivePharmacyId = pharmacyId!
  }

  const where = {
    ...(effectivePharmacyId !== null && { pharmacyId: effectivePharmacyId }),
    ...(search && {
      key: { contains: search, mode: 'insensitive' as const },
    }),
  }

  const [params, total] = await prisma.$transaction([
    prisma.businessParameter.findMany({
      where,
      select: businessParameterSelect,
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    }),
    prisma.businessParameter.count({ where }),
  ])

  const meta: PaginationMeta = {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  }

  return { data: params.map(formatResponse), meta }
}

export const getBusinessParameterByUuid = async (
  uuid: string,
  pharmacyId: number | null,
  platformRole: PlatformRole | null
): Promise<BusinessParameterResponse> => {
  const where =
    platformRole === PlatformRole.PLATFORM_ADMIN
      ? { uuid }
      : { uuid, pharmacyId: pharmacyId! }

  const param = await prisma.businessParameter.findFirst({
    where,
    select: businessParameterSelect,
  })

  if (!param) throw new NotFoundException('Business parameter not found')

  return formatResponse(param)
}

export const updateBusinessParameter = async (
  uuid: string,
  data: UpdateBusinessParameterInput,
  pharmacyId: number | null,
  platformRole: PlatformRole | null,
  userId: number
): Promise<BusinessParameterResponse> => {
  const existing = await prisma.businessParameter.findFirst({
    where: { uuid },
    select: { id: true, key: true, pharmacyId: true },
  })

  if (!existing) throw new NotFoundException('Business parameter not found')

  // non-admin can only update their own pharmacy's parameters
  if (
    platformRole !== PlatformRole.PLATFORM_ADMIN &&
    existing.pharmacyId !== pharmacyId
  ) {
    throw new ForbiddenException('You can only update your own pharmacy parameters')
  }

  const param = await prisma.businessParameter.update({
    where: { id: existing.id },
    data: { ...data, updatedById: userId },
    select: businessParameterSelect,
  })

  if (existing.key === 'MARGIN_PERCENTAGE' && existing.pharmacyId !== null) {
    const margin = parseFloat(param.value)
    await prisma.$executeRaw`
      UPDATE inv_stocks
      SET calculated_price = base_price + (base_price * ${margin} / 100),
          updated_at = NOW()
      WHERE pharmacy_id = ${existing.pharmacyId}
    `
  }

  return formatResponse(param)
}