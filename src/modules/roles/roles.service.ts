import { PlatformRole } from '@prisma/client'
import { prisma } from '@config/db'
import {
  RoleQueryInput,
  CreateRoleInput,
  UpdateRoleInput,
  SetRolePermissionsInput,
} from './roles.validation'
import { RoleResponse, RoleDetailResponse } from './roles.interface'
import { NotFoundException } from '@exceptions/NotFoundException'
import { ConflictException } from '@exceptions/ConflictException'
import { ForbiddenException } from '@exceptions/ForbiddenException'
import { BadRequestException } from '@exceptions/BadRequestException'
import { PaginationMeta } from '@interfaces/common.interface'

// ── Helpers ───────────────────────────────────────────

const roleSelect = {
  uuid: true,
  name: true,
  type: true,
  pharmacyId: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      rolePermissions: { where: { isEnabled: true } },
    },
  },
}

const permissionSelect = {
  uuid: true,
  name: true,
  module: true,
  description: true,
}

const formatResponse = (role: any): RoleResponse => ({
  uuid: role.uuid,
  name: role.name,
  type: role.type,
  isGlobal: role.pharmacyId === null,
  status: role.status,
  permissionCount: role._count?.rolePermissions ?? 0,
  createdAt: role.createdAt,
  updatedAt: role.updatedAt,
})

const checkDuplicate = async (
  name: string,
  pharmacyId: number | null,
  excludeUuid?: string
): Promise<void> => {
  const existing = await prisma.role.findFirst({
    where: {
      name: { equals: name, mode: 'insensitive' },
      pharmacyId,
      status: { not: 'DELETED' },
      ...(excludeUuid && { NOT: { uuid: excludeUuid } }),
    },
  })
  if (existing) throw new ConflictException('Role with this name already exists')
}

const checkGlobalAccess = (
  pharmacyId: number | null,
  platformRole: PlatformRole | null
): void => {
  if (pharmacyId === null && platformRole !== PlatformRole.PLATFORM_ADMIN) {
    throw new ForbiddenException('Global roles can only be modified by platform admin')
  }
}

const resolvePharmacyId = async (
  pharmacyUuid?: string
): Promise<number | null> => {
  if (!pharmacyUuid) return null

  const pharmacy = await prisma.pharmacy.findFirst({
    where: { uuid: pharmacyUuid, status: { not: 'DELETED' } },
    select: { id: true },
  })

  if (!pharmacy) throw new NotFoundException('Pharmacy not found')

  return pharmacy.id
}

// ── Services ──────────────────────────────────────────

export const getRoles = async (
  pharmacyId: number | null,
  platformRole: PlatformRole | null,
  query: RoleQueryInput
): Promise<{ data: RoleResponse[]; meta: PaginationMeta }> => {
  const { search, status, isGlobal, sortBy, sortOrder, page, limit } = query
  const skip = (page - 1) * limit

  let pharmacyFilter = {}

  if (platformRole === PlatformRole.PLATFORM_ADMIN) {
    if (isGlobal === 'true') pharmacyFilter = { pharmacyId: null }
    else if (isGlobal === 'false') pharmacyFilter = { pharmacyId: { not: null } }
  } else {
    pharmacyFilter = {
      OR: [{ pharmacyId: null }, { pharmacyId }],
    }
    if (isGlobal === 'true') pharmacyFilter = { pharmacyId: null }
    else if (isGlobal === 'false') pharmacyFilter = { pharmacyId }
  }

  const where = {
    ...pharmacyFilter,
    status: status ?? { not: 'DELETED' as const },
    ...(search && {
      name: { contains: search, mode: 'insensitive' as const },
    }),
  }

  const [roles, total] = await prisma.$transaction([
    prisma.role.findMany({
      where,
      select: roleSelect,
      orderBy: [{ pharmacyId: 'asc' }, { [sortBy]: sortOrder }],
      skip,
      take: limit,
    }),
    prisma.role.count({ where }),
  ])

  const meta: PaginationMeta = {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  }

  return { data: roles.map(formatResponse), meta }
}

export const getRoleByUuid = async (
  uuid: string,
  pharmacyId: number | null,
  platformRole: PlatformRole | null
): Promise<RoleDetailResponse> => {
  const where =
    platformRole === PlatformRole.PLATFORM_ADMIN
      ? { uuid, status: { not: 'DELETED' as const } }
      : {
          uuid,
          status: { not: 'DELETED' as const },
          OR: [{ pharmacyId: null }, { pharmacyId }],
        }

  const role = await prisma.role.findFirst({
    where,
    select: {
      ...roleSelect,
      rolePermissions: {
        where: { isEnabled: true },
        select: {
          permission: { select: permissionSelect },
        },
        orderBy: { permission: { module: 'asc' } },
      },
    },
  })

  if (!role) throw new NotFoundException('Role not found')

  return {
    ...formatResponse(role),
    permissions: role.rolePermissions.map((rp: any) => rp.permission),
  }
}

export const createRole = async (
  data: CreateRoleInput,
  pharmacyId: number | null,
  platformRole: PlatformRole | null,
  userId: number
): Promise<RoleResponse> => {
  let resolvedPharmacyId: number | null

  if (platformRole === PlatformRole.PLATFORM_ADMIN) {
    // platform admin: use pharmacyUuid from body or null (global)
    resolvedPharmacyId = data.pharmacyUuid
      ? await resolvePharmacyId(data.pharmacyUuid)
      : null
  } else {
    // pharmacy user: always scoped to their own pharmacy
    resolvedPharmacyId = pharmacyId
  }

  await checkDuplicate(data.name, resolvedPharmacyId)

  const role = await prisma.role.create({
    data: {
      name: data.name,
      type: data.type,
      pharmacyId: resolvedPharmacyId,
      createdById: userId,
      updatedById: userId,
    },
    select: roleSelect,
  })

  return formatResponse(role)
}

export const updateRole = async (
  uuid: string,
  data: UpdateRoleInput,
  pharmacyId: number | null,
  platformRole: PlatformRole | null,
  userId: number
): Promise<RoleResponse> => {
  const existing = await prisma.role.findFirst({
    where: { uuid, status: { not: 'DELETED' } },
    select: { id: true, pharmacyId: true },
  })

  if (!existing) throw new NotFoundException('Role not found')

  // global roles: only platform admin
  checkGlobalAccess(existing.pharmacyId, platformRole)

  // pharmacy users: only their own
  if (
    platformRole !== PlatformRole.PLATFORM_ADMIN &&
    existing.pharmacyId !== pharmacyId
  ) {
    throw new ForbiddenException('You can only edit your own pharmacy roles')
  }

  if (data.name) {
    await checkDuplicate(data.name, existing.pharmacyId, uuid)
  }

  const role = await prisma.role.update({
    where: { id: existing.id },
    data: { ...data, updatedById: userId },
    select: roleSelect,
  })

  return formatResponse(role)
}

export const deleteRole = async (
  uuid: string,
  pharmacyId: number | null,
  platformRole: PlatformRole | null,
  userId: number
): Promise<void> => {
  const existing = await prisma.role.findFirst({
    where: { uuid, status: { not: 'DELETED' } },
    select: { id: true, pharmacyId: true },
  })

  if (!existing) throw new NotFoundException('Role not found')

  checkGlobalAccess(existing.pharmacyId, platformRole)

  if (
    platformRole !== PlatformRole.PLATFORM_ADMIN &&
    existing.pharmacyId !== pharmacyId
  ) {
    throw new ForbiddenException('You can only delete your own pharmacy roles')
  }

  // block if any users still assigned
  const inUse = await prisma.userPharmacy.count({
    where: { roleId: existing.id, status: { not: 'DELETED' } },
  })
  if (inUse > 0) throw new ConflictException('Role is still assigned to active users')

  await prisma.role.update({
    where: { id: existing.id },
    data: {
      status: 'DELETED',
      deletedAt: new Date(),
      deletedById: userId,
    },
  })
}

export const setRolePermissions = async (
  uuid: string,
  data: SetRolePermissionsInput,
  pharmacyId: number | null,
  platformRole: PlatformRole | null,
  userId: number
): Promise<RoleDetailResponse> => {
  const existing = await prisma.role.findFirst({
    where: { uuid, status: { not: 'DELETED' } },
    select: { id: true, pharmacyId: true },
  })

  if (!existing) throw new NotFoundException('Role not found')

  checkGlobalAccess(existing.pharmacyId, platformRole)

  if (
    platformRole !== PlatformRole.PLATFORM_ADMIN &&
    existing.pharmacyId !== pharmacyId
  ) {
    throw new ForbiddenException('You can only manage your own pharmacy role permissions')
  }

  // validate all permission uuids exist
  const permissions = await prisma.permission.findMany({
    where: {
      uuid: { in: data.permissionUuids },
      status: { not: 'DELETED' },
    },
    select: { id: true, uuid: true },
  })

  if (permissions.length !== data.permissionUuids.length) {
    throw new BadRequestException('One or more permissions not found')
  }

  // replace all — delete existing, insert new
  await prisma.$transaction(async (tx) => {
    await tx.rolePermission.deleteMany({ where: { roleId: existing.id } })

    if (permissions.length > 0) {
      await tx.rolePermission.createMany({
        data: permissions.map((p) => ({
          roleId: existing.id,
          permissionId: p.id,
          isEnabled: true,
          createdById: userId,
          updatedById: userId,
        })),
      })
    }

    await tx.role.update({
      where: { id: existing.id },
      data: { updatedById: userId },
    })
  })

  return getRoleByUuid(uuid, pharmacyId, platformRole)
}