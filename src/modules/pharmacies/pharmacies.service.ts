import { PlatformRole, Prisma } from '@prisma/client'
import { prisma } from '@config/db'
import {
  PharmacyQueryInput,
  CreatePharmacyInput,
  UpdatePharmacyInput,
  BusinessLicenseQueryInput,
  CreateBusinessLicenseInput,
  UpdateBusinessLicenseInput,
} from './pharmacies.validation'
import { PharmacyResponse, PharmacyDdlItem, BusinessLicenseItem } from './pharmacies.interface'
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
  phone: true,
  address: true,
  email: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  businessLicenses: {
    where: { status: 'ACTIVE' as const, deletedAt: null },
    select: { uuid: true, licenseNumber: true, validFrom: true, validUntil: true, status: true },
    orderBy: { validUntil: 'desc' as const },
    take: 1,
  },
  placements: {
    where: {
      status: 'ACTIVE' as const,
      deletedAt: null,
      leftAt: null,
      role: { type: 'PHARMACIST_IN_CHARGE' as const },
    },
    select: {
      uuid: true,
      user: { select: { uuid: true, name: true } },
      practiceLicenses: {
        where: { status: 'ACTIVE' as const, deletedAt: null },
        select: { uuid: true, licenseNumber: true, validFrom: true, validUntil: true, status: true },
        orderBy: { validUntil: 'desc' as const },
        take: 1,
      },
    },
    take: 1,
  },
}

const formatResponse = (pharmacy: Prisma.PharmacyGetPayload<{ select: typeof pharmacySelect }>): PharmacyResponse => ({
  uuid: pharmacy.uuid,
  name: pharmacy.name,
  code: pharmacy.code,
  category: pharmacy.category,
  phone: pharmacy.phone,
  address: pharmacy.address,
  email: pharmacy.email,
  status: pharmacy.status,
  activeLicense: pharmacy.businessLicenses[0] ?? null,
  pharmacistInCharge: pharmacy.placements[0]
    ? {
        placementUuid: pharmacy.placements[0].uuid,
        user: pharmacy.placements[0].user,
        activeLicense: pharmacy.placements[0].practiceLicenses[0] ?? null,
      }
    : null,
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
  let code = data.code ?? generateCode()

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
      phone: data.phone,
      address: data.address,
      email: data.email,
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

// ── Business License Helpers ──────────────────────────

const businessLicenseSelect = {
  uuid: true,
  pharmacy: { select: { uuid: true } },
  licenseNumber: true,
  validFrom: true,
  validUntil: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.BusinessLicenseSelect

type BusinessLicensePayload = Prisma.BusinessLicenseGetPayload<{ select: typeof businessLicenseSelect }>

const formatBusinessLicense = (license: BusinessLicensePayload): BusinessLicenseItem => ({
  uuid: license.uuid,
  pharmacyUuid: license.pharmacy.uuid,
  licenseNumber: license.licenseNumber,
  validFrom: license.validFrom,
  validUntil: license.validUntil,
  status: license.status,
  createdAt: license.createdAt,
  updatedAt: license.updatedAt,
})

async function resolvePharmacyForLicense(
  pharmacyUuid: string,
  pharmacyId: number | null,
  platformRole: PlatformRole | null
) {
  const pharmacy = await prisma.pharmacy.findFirst({
    where: { uuid: pharmacyUuid, status: { not: 'DELETED' } },
    select: { id: true },
  })
  if (!pharmacy) throw new NotFoundException('Pharmacy not found')
  if (platformRole !== PlatformRole.PLATFORM_ADMIN && pharmacy.id !== pharmacyId) {
    throw new ForbiddenException('You can only manage licenses for your own pharmacy')
  }
  return pharmacy
}

// ── Business License Services ─────────────────────────

export const getBusinessLicenses = async (
  pharmacyUuid: string,
  pharmacyId: number | null,
  platformRole: PlatformRole | null,
  query: BusinessLicenseQueryInput
): Promise<{ data: BusinessLicenseItem[]; meta: PaginationMeta }> => {
  const { status, sortBy, sortOrder, page, limit } = query
  const skip = (page - 1) * limit

  const pharmacy = await resolvePharmacyForLicense(pharmacyUuid, pharmacyId, platformRole)

  const where: Prisma.BusinessLicenseWhereInput = {
    pharmacyId: pharmacy.id,
    status: status ?? { not: 'DELETED' },
  }

  const [licenses, total] = await prisma.$transaction([
    prisma.businessLicense.findMany({
      where,
      select: businessLicenseSelect,
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    }),
    prisma.businessLicense.count({ where }),
  ])

  return {
    data: licenses.map(formatBusinessLicense),
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  }
}

export const getBusinessLicenseByUuid = async (
  uuid: string,
  pharmacyUuid: string,
  pharmacyId: number | null,
  platformRole: PlatformRole | null
): Promise<BusinessLicenseItem> => {
  const pharmacy = await resolvePharmacyForLicense(pharmacyUuid, pharmacyId, platformRole)

  const license = await prisma.businessLicense.findFirst({
    where: { uuid, pharmacyId: pharmacy.id, status: { not: 'DELETED' } },
    select: businessLicenseSelect,
  })
  if (!license) throw new NotFoundException('Business license not found')

  return formatBusinessLicense(license)
}

export const createBusinessLicense = async (
  pharmacyUuid: string,
  data: CreateBusinessLicenseInput,
  pharmacyId: number | null,
  platformRole: PlatformRole | null,
  userId: number
): Promise<BusinessLicenseItem> => {
  const pharmacy = await resolvePharmacyForLicense(pharmacyUuid, pharmacyId, platformRole)

  const conflict = await prisma.businessLicense.findFirst({
    where: { pharmacyId: pharmacy.id, licenseNumber: data.licenseNumber, status: { not: 'DELETED' } },
  })
  if (conflict) throw new ConflictException('BUSINESS_LICENSE_NUMBER_ALREADY_EXISTS')

  const license = await prisma.businessLicense.create({
    data: {
      pharmacyId: pharmacy.id,
      licenseNumber: data.licenseNumber,
      validFrom: data.validFrom,
      validUntil: data.validUntil,
      createdById: userId,
      updatedById: userId,
    },
    select: businessLicenseSelect,
  })

  return formatBusinessLicense(license)
}

export const updateBusinessLicense = async (
  uuid: string,
  pharmacyUuid: string,
  data: UpdateBusinessLicenseInput,
  pharmacyId: number | null,
  platformRole: PlatformRole | null,
  userId: number
): Promise<BusinessLicenseItem> => {
  const pharmacy = await resolvePharmacyForLicense(pharmacyUuid, pharmacyId, platformRole)

  const existing = await prisma.businessLicense.findFirst({
    where: { uuid, pharmacyId: pharmacy.id, status: { not: 'DELETED' } },
    select: { id: true, licenseNumber: true },
  })
  if (!existing) throw new NotFoundException('Business license not found')

  if (data.licenseNumber && data.licenseNumber !== existing.licenseNumber) {
    const conflict = await prisma.businessLicense.findFirst({
      where: {
        pharmacyId: pharmacy.id,
        licenseNumber: data.licenseNumber,
        status: { not: 'DELETED' },
        NOT: { uuid },
      },
    })
    if (conflict) throw new ConflictException('BUSINESS_LICENSE_NUMBER_ALREADY_EXISTS')
  }

  const license = await prisma.businessLicense.update({
    where: { id: existing.id },
    data: { ...data, updatedById: userId },
    select: businessLicenseSelect,
  })

  return formatBusinessLicense(license)
}

export const deleteBusinessLicense = async (
  uuid: string,
  pharmacyUuid: string,
  pharmacyId: number | null,
  platformRole: PlatformRole | null,
  userId: number
): Promise<void> => {
  const pharmacy = await resolvePharmacyForLicense(pharmacyUuid, pharmacyId, platformRole)

  const existing = await prisma.businessLicense.findFirst({
    where: { uuid, pharmacyId: pharmacy.id, status: { not: 'DELETED' } },
    select: { id: true },
  })
  if (!existing) throw new NotFoundException('Business license not found')

  await prisma.businessLicense.update({
    where: { id: existing.id },
    data: { status: 'DELETED', deletedAt: new Date(), deletedById: userId },
  })
}

export const getPharmaciesDdl = async (
  pharmacyId: number | null,
  platformRole: PlatformRole | null
): Promise<PharmacyDdlItem[]> => {
  const where =
    platformRole === PlatformRole.PLATFORM_ADMIN
      ? { status: 'ACTIVE' as const }
      : { id: pharmacyId!, status: 'ACTIVE' as const }

  return prisma.pharmacy.findMany({
    where,
    select: { uuid: true, name: true, code: true },
    orderBy: { name: 'asc' },
  })
}