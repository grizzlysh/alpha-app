import { Prisma } from '@prisma/client'
import { prisma } from '@config/db'
import {
  SystemParameterQueryInput,
  UpdateSystemParameterInput,
} from './system-parameters.validation'
import { SystemParameterResponse } from './system-parameters.interface'
import { NotFoundException } from '@exceptions/NotFoundException'
import { PaginationMeta } from '@interfaces/common.interface'

// ── Helpers ───────────────────────────────────────────

const systemParameterSelect = {
  uuid: true,
  key: true,
  value: true,
  description: true,
  createdAt: true,
  updatedAt: true,
}

const formatResponse = (param: Prisma.SystemParameterGetPayload<{ select: typeof systemParameterSelect }>): SystemParameterResponse => ({
  uuid: param.uuid,
  key: param.key,
  value: param.value,
  description: param.description,
  createdAt: param.createdAt,
  updatedAt: param.updatedAt,
})

// ── Services ──────────────────────────────────────────

export const getSystemParameters = async (
  query: SystemParameterQueryInput
): Promise<{ data: SystemParameterResponse[]; meta: PaginationMeta }> => {
  const { search, sortBy, sortOrder, page, limit } = query
  const skip = (page - 1) * limit

  const where = {
    ...(search && {
      key: { contains: search, mode: 'insensitive' as const },
    }),
  }

  const [params, total] = await prisma.$transaction([
    prisma.systemParameter.findMany({
      where,
      select: systemParameterSelect,
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    }),
    prisma.systemParameter.count({ where }),
  ])

  const meta: PaginationMeta = {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  }

  return { data: params.map(formatResponse), meta }
}

export const getSystemParameterByUuid = async (
  uuid: string
): Promise<SystemParameterResponse> => {
  const param = await prisma.systemParameter.findFirst({
    where: { uuid },
    select: systemParameterSelect,
  })

  if (!param) throw new NotFoundException('System parameter not found')

  return formatResponse(param)
}

export const updateSystemParameter = async (
  uuid: string,
  data: UpdateSystemParameterInput,
  userId: number
): Promise<SystemParameterResponse> => {
  const existing = await prisma.systemParameter.findFirst({
    where: { uuid },
    select: { id: true },
  })

  if (!existing) throw new NotFoundException('System parameter not found')

  const param = await prisma.systemParameter.update({
    where: { id: existing.id },
    data: { ...data, updatedById: userId },
    select: systemParameterSelect,
  })

  return formatResponse(param)
}