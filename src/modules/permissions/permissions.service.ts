import { Prisma } from '@prisma/client'
import { prisma } from '@config/db'
import { PermissionQueryInput } from './permissions.validation'
import {
  PermissionResponse,
  PermissionGroupedResponse,
} from './permissions.interface'
import { NotFoundException } from '@exceptions/NotFoundException'
import { PaginationMeta } from '@interfaces/common.interface'

// ── Helpers ───────────────────────────────────────────

const permissionSelect = {
  uuid: true,
  action: true,
  module: true,
  description: true,
}

const formatResponse = (permission: Prisma.PermissionGetPayload<{ select: typeof permissionSelect }>): PermissionResponse => ({
  uuid: permission.uuid,
  name: `${permission.module}.${permission.action}`,
  module: permission.module,
  description: permission.description,
})

// ── Services ──────────────────────────────────────────

export const getPermissions = async (
  query: PermissionQueryInput
): Promise<{ data: PermissionGroupedResponse[]; meta: PaginationMeta }> => {
  const { search, module, sortBy, sortOrder, page, limit } = query
  const skip = (page - 1) * limit

  const where = {
    status: { not: 'DELETED' as const },
    ...(module && { module: { equals: module, mode: 'insensitive' as const } }),
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' as const } },
        { module: { contains: search, mode: 'insensitive' as const } },
      ],
    }),
  }

  const [permissions, total] = await prisma.$transaction([
    prisma.permission.findMany({
      where,
      select: permissionSelect,
      orderBy: [{ module: 'asc' }, { [sortBy]: sortOrder }],
      skip,
      take: limit,
    }),
    prisma.permission.count({ where }),
  ])

  // group by module
  const grouped = permissions.reduce<Record<string, PermissionResponse[]>>(
    (acc, p) => {
      if (!acc[p.module]) acc[p.module] = []
      acc[p.module].push(formatResponse(p))
      return acc
    },
    {}
  )

  const data: PermissionGroupedResponse[] = Object.entries(grouped).map(
    ([module, permissions]) => ({ module, permissions })
  )

  const meta: PaginationMeta = {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  }

  return { data, meta }
}

export const getPermissionByUuid = async (
  uuid: string
): Promise<PermissionResponse> => {
  const permission = await prisma.permission.findFirst({
    where: { uuid, status: { not: 'DELETED' } },
    select: permissionSelect,
  })

  if (!permission) throw new NotFoundException('Permission not found')

  return formatResponse(permission)
}