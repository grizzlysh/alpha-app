import { Prisma } from '@prisma/client'
import { prisma } from '@config/db'
import { PermissionQueryInput } from './permissions.validation'
import {
  PermissionResponse,
  PermissionGroupedResponse,
} from './permissions.interface'
import { NotFoundException } from '@exceptions/NotFoundException'

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
): Promise<PermissionGroupedResponse[]> => {
  const { search, module, sortBy, sortOrder } = query

  const where = {
    ...(module && { module: { equals: module, mode: 'insensitive' as const } }),
    ...(search && {
      OR: [
        { module: { contains: search, mode: 'insensitive' as const } },
        { action: { contains: search, mode: 'insensitive' as const } },
      ],
    }),
  }

  const permissions = await prisma.permission.findMany({
    where,
    select: permissionSelect,
    orderBy: [{ module: 'asc' }, { [sortBy]: sortOrder }],
  })

  const grouped = permissions.reduce<Record<string, PermissionResponse[]>>(
    (acc, p) => {
      if (!acc[p.module]) acc[p.module] = []
      acc[p.module].push(formatResponse(p))
      return acc
    },
    {}
  )

  return Object.entries(grouped).map(([module, permissions]) => ({ module, permissions }))
}

export const getPermissionByUuid = async (
  uuid: string
): Promise<PermissionResponse> => {
  const permission = await prisma.permission.findFirst({
    where: { uuid },
    select: permissionSelect,
  })

  if (!permission) throw new NotFoundException('Permission not found')

  return formatResponse(permission)
}