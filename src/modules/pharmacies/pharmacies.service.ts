import { PlatformRole, Prisma } from '@prisma/client'
import { prisma } from '@config/db'
import {
  PharmacyQueryInput,
  CreatePharmacyInput,
  UpdatePharmacyInput,
  UpdatePharmacyOwnerInput,
} from './pharmacies.validation'
import { PharmacyResponse } from './pharmacies.interface'
import { NotFoundException } from '@exceptions/NotFoundException'
import { ConflictException } from '@exceptions/ConflictException'
import { ForbiddenException } from '@exceptions/ForbiddenException'
import { PaginationMeta } from '@interfaces/common.interface'

// ── Helpers ───────────────────────────────────────────

const pharmacySelect = {
  uuid: true,
  name: true,
  code: true,
  category: true,
  permitNumber: true,
  phone: true,
  address: true,
  email: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  owner: {
    select: {
      uuid: true,
      name: true,
      email: true,
    },
  },
}

const formatResponse = (pharmacy: Prisma.PharmacyGetPayload<{ select: typeof pharmacySelect }>): PharmacyResponse => ({
  uuid: pharmacy.uuid,
  name: pharmacy.name,
  code: pharmacy.code,
  category: pharmacy.category,
  permitNumber: pharmacy.permitNumber,
  phone: pharmacy.phone,
  address: pharmacy.address,
  email: pharmacy.email,
  status: pharmacy.status,
  owner: pharmacy.owner,
  createdAt: pharmacy.createdAt,
  updatedAt: pharmacy.updatedAt,
})

const generateCode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  return Array.from({ length: 5 }, () =>
    chars.charAt(Math.floor(Math.random() * chars.length))
  ).join('')
}

const ensureUniqueCode = async (code: string, excludeUuid?: string): Promise<void> => {
  const existing = await prisma.pharmacy.findFirst({
    where: {
      code,
      status: { not: 'DELETED' },
      ...(excludeUuid && { NOT: { uuid: excludeUuid } }),
    },
  })
  if (existing) throw new ConflictException('Pharmacy code already exists')
}

// ── Services ──────────────────────────────────────────

export const getPharmacies = async (
  pharmacyId: number | null,
  platformRole: PlatformRole | null,
  query: PharmacyQueryInput
): Promise<{ data: PharmacyResponse[]; meta: PaginationMeta }> => {
  const { search, status, category, sortBy, sortOrder, page, limit } = query
  const skip = (page - 1) * limit

  // PLATFORM_ADMIN sees all, others see only their own
  const pharmacyFilter =
    platformRole === PlatformRole.PLATFORM_ADMIN
      ? {}
      : { id: pharmacyId! }

  const where = {
    ...pharmacyFilter,
    status: status ?? { not: 'DELETED' as const },
    ...(category && { category }),
    ...(search && {
      name: { contains: search, mode: 'insensitive' as const },
    }),
  }

  const [pharmacies, total] = await prisma.$transaction([
    prisma.pharmacy.findMany({
      where,
      select: pharmacySelect,
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    }),
    prisma.pharmacy.count({ where }),
  ])

  const meta: PaginationMeta = {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  }

  return { data: pharmacies.map(formatResponse), meta }
}

export const getPharmacyByUuid = async (
  uuid: string,
  pharmacyId: number | null,
  platformRole: PlatformRole | null
): Promise<PharmacyResponse> => {
  const where =
    platformRole === PlatformRole.PLATFORM_ADMIN
      ? { uuid, status: { not: 'DELETED' as const } }
      : { uuid, id: pharmacyId!, status: { not: 'DELETED' as const } }

  const pharmacy = await prisma.pharmacy.findFirst({
    where,
    select: pharmacySelect,
  })

  if (!pharmacy) throw new NotFoundException('Pharmacy not found')

  return formatResponse(pharmacy)
}

export const createPharmacy = async (
  data: CreatePharmacyInput,
  userId: number
): Promise<PharmacyResponse> => {
  // Resolve owner
  const owner = await prisma.user.findFirst({
    where: { uuid: data.ownerUuid, status: { not: 'DELETED' } },
    select: { id: true },
  })
  if (!owner) throw new NotFoundException('Owner not found')

  // Generate or validate code
  let code = data.code ?? generateCode()

  // Ensure uniqueness — regenerate if auto-generated and collides
  let attempts = 0
  while (attempts < 5) {
    const exists = await prisma.pharmacy.findFirst({
      where: { code, status: { not: 'DELETED' } },
    })
    if (!exists) break
    if (data.code) throw new ConflictException('Pharmacy code already exists')
    code = generateCode()
    attempts++
  }

  const pharmacy = await prisma.pharmacy.create({
    data: {
      name: data.name,
      code,
      category: data.category,
      permitNumber: data.permitNumber,
      phone: data.phone,
      address: data.address,
      email: data.email,
      ownerId: owner.id,
      createdById: userId,
      updatedById: userId,
    },
    select: pharmacySelect,
  })

  return formatResponse(pharmacy)
}

export const updatePharmacy = async (
  uuid: string,
  data: UpdatePharmacyInput,
  pharmacyId: number | null,
  platformRole: PlatformRole | null,
  userId: number
): Promise<PharmacyResponse> => {
  const existing = await prisma.pharmacy.findFirst({
    where: { uuid, status: { not: 'DELETED' } },
    select: { id: true },
  })
  if (!existing) throw new NotFoundException('Pharmacy not found')

  // Non-admin can only update their own pharmacy
  if (
    platformRole !== PlatformRole.PLATFORM_ADMIN &&
    existing.id !== pharmacyId
  ) {
    throw new ForbiddenException('You can only update your own pharmacy')
  }

  // Non-admin cannot change code
  if (platformRole !== PlatformRole.PLATFORM_ADMIN && data.code) {
    throw new ForbiddenException('Only platform admin can change pharmacy code')
  }

  if (data.code) {
    await ensureUniqueCode(data.code, uuid)
  }

  const pharmacy = await prisma.pharmacy.update({
    where: { id: existing.id },
    data: { ...data, updatedById: userId },
    select: pharmacySelect,
  })

  return formatResponse(pharmacy)
}

export const updatePharmacyOwner = async (
  uuid: string,
  data: UpdatePharmacyOwnerInput,
  userId: number
): Promise<PharmacyResponse> => {
  const existing = await prisma.pharmacy.findFirst({
    where: { uuid, status: { not: 'DELETED' } },
    select: { id: true },
  })
  if (!existing) throw new NotFoundException('Pharmacy not found')

  const owner = await prisma.user.findFirst({
    where: { uuid: data.ownerUuid, status: { not: 'DELETED' } },
    select: { id: true },
  })
  if (!owner) throw new NotFoundException('Owner not found')

  const pharmacy = await prisma.pharmacy.update({
    where: { id: existing.id },
    data: { ownerId: owner.id, updatedById: userId },
    select: pharmacySelect,
  })

  return formatResponse(pharmacy)
}

export const deletePharmacy = async (
  uuid: string,
  userId: number
): Promise<void> => {
  const existing = await prisma.pharmacy.findFirst({
    where: { uuid, status: { not: 'DELETED' } },
    select: { id: true },
  })
  if (!existing) throw new NotFoundException('Pharmacy not found')

  await prisma.pharmacy.update({
    where: { id: existing.id },
    data: {
      status: 'DELETED',
      deletedAt: new Date(),
      deletedById: userId,
    },
  })
}