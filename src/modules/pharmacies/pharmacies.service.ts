import { AppRole, PlatformRole, Prisma, RecordStatus } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'
import { prisma } from '@config/db'
import {
  PharmacyQueryInput,
  CreatePharmacyInput,
  UpdatePharmacyInput,
  BusinessLicenseQueryInput,
  CreateBusinessLicenseInput,
  UpdateBusinessLicenseInput,
} from './pharmacies.validation'
import { PharmacyResponse, PharmacyDdlItem, BusinessLicenseItem, PharmacyCreateResult, PharmacySetupStatus } from './pharmacies.interface'
import { BadRequestException } from '@exceptions/BadRequestException'
import { generateTemporaryPassword } from '@utils/tempPassword'
import { ensureBusinessParams, ensureWalkInCustomer, seedDefaultClassifications } from '@utils/pharmacyDefaults'
import { copyCatalog } from '@modules/catalog/catalog.service'
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
  location: true,
  email: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  businessLicenses: {
    where: { status: 'ACTIVE' as const, deletedAt: null },
    select: { uuid: true, licenseNumber: true, validFrom: true, validUntil: true, status: true },
    orderBy: { validFrom: 'desc' as const },
    take: 1,
  },
  placements: {
    where: {
      status: 'ACTIVE' as const,
      deletedAt: null,
      leftAt: null,
      isHeadPharmacist: true,
    },
    select: {
      uuid: true,
      user: { select: { uuid: true, name: true } },
      practiceLicenses: {
        where: { status: 'ACTIVE' as const, deletedAt: null },
        select: { uuid: true, licenseNumber: true, validFrom: true, validUntil: true, status: true },
        orderBy: { validFrom: 'desc' as const },
        take: 1,
      },
    },
    take: 1,
  },
  _count: {
    select: {
      placements: {
        where: { status: 'ACTIVE' as const, deletedAt: null, leftAt: null, role: { type: AppRole.OWNER } },
      },
    },
  },
}

const formatResponse = (pharmacy: Prisma.PharmacyGetPayload<{ select: typeof pharmacySelect }>): PharmacyResponse => ({
  uuid: pharmacy.uuid,
  name: pharmacy.name,
  code: pharmacy.code,
  category: pharmacy.category,
  phone: pharmacy.phone,
  address: pharmacy.address,
  location: pharmacy.location,
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
  hasOwner: pharmacy._count.placements > 0,
  createdAt: pharmacy.createdAt,
  updatedAt: pharmacy.updatedAt,
})

const ensureUniqueCode = async (code: string, excludeUuid?: string): Promise<void> => {
  // The unique index covers deleted pharmacies too, so their codes stay taken.
  const existing = await prisma.pharmacy.findFirst({
    where: { code, ...(excludeUuid && { NOT: { uuid: excludeUuid } }) },
    select: { id: true },
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

  if (platformRole !== PlatformRole.PLATFORM_ADMIN && !pharmacyId) {
    throw new ForbiddenException('You do not have access to this pharmacy')
  }

  // PLATFORM_ADMIN sees all, others see only their own
  const pharmacyFilter =
    platformRole === PlatformRole.PLATFORM_ADMIN
      ? {}
      : { id: pharmacyId! }

  const where = {
    ...pharmacyFilter,
    deletedAt: null,
    ...(status && { status }),
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
      ? { uuid, deletedAt: null }
      : { uuid, id: pharmacyId!, deletedAt: null }

  const pharmacy = await prisma.pharmacy.findFirst({
    where,
    select: pharmacySelect,
  })

  if (!pharmacy) throw new NotFoundException('Pharmacy not found')

  return formatResponse(pharmacy)
}

/**
 * Onboards a pharmacy in one transaction: the pharmacy, its business license,
 * its owner's account and placement, and its starting data (business
 * parameters, walk-in customer and medicine classifications — the default
 * template, or a copy of another pharmacy's catalog). Nothing is left
 * half-created if any step fails.
 */
export const createPharmacy = async (
  data: CreatePharmacyInput,
  userId: number
): Promise<PharmacyCreateResult> => {
  await ensureUniqueCode(data.code)

  // ── Resolve everything that can fail before writing ──
  const source = data.copyFromPharmacyUuid
    ? await prisma.pharmacy.findFirst({ where: { uuid: data.copyFromPharmacyUuid, deletedAt: null }, select: { id: true } })
    : null
  if (data.copyFromPharmacyUuid && !source) throw new NotFoundException('Pharmacy not found')

  const ownerRole = data.owner
    ? await prisma.role.findFirst({
        where: { type: AppRole.OWNER, pharmacyId: null, deletedAt: null, status: RecordStatus.ACTIVE },
        select: { id: true },
      })
    : null
  if (data.owner && !ownerRole) throw new NotFoundException('ROLE_NOT_FOUND')

  let existingOwner: { id: number; uuid: string; name: string; email: string } | null = null
  if (data.owner?.mode === 'existing') {
    existingOwner = await prisma.user.findFirst({
      where: { uuid: data.owner.userUuid, deletedAt: null },
      select: { id: true, uuid: true, name: true, email: true, platformRole: true, status: true },
    }).then((u) => {
      if (!u) throw new NotFoundException('USER_NOT_FOUND')
      if (u.platformRole !== null) throw new BadRequestException('PLATFORM_USER_CANNOT_OWN_PHARMACY')
      if (u.status !== RecordStatus.ACTIVE) throw new BadRequestException('USER_INACTIVE')
      return u
    })
  }
  if (data.owner?.mode === 'new') {
    const taken = await prisma.user.findFirst({ where: { email: data.owner.email }, select: { deletedAt: true } })
    if (taken) throw new ConflictException(taken.deletedAt ? 'EMAIL_BELONGS_TO_DELETED_USER' : 'EMAIL_ALREADY_EXISTS')
  }

  const temporaryPassword = data.owner?.mode === 'new' ? generateTemporaryPassword() : null
  const passwordHash = temporaryPassword ? await bcrypt.hash(temporaryPassword, 10) : null

  try {
    return await prisma.$transaction(
      async (tx) => {
        const created = await tx.pharmacy.create({
          data: {
            name: data.name,
            code: data.code,
            category: data.category,
            phone: data.phone,
            address: data.address,
            location: data.location,
            email: data.email,
            createdById: userId,
            updatedById: userId,
          },
        })

        if (data.license) {
          await tx.businessLicense.create({
            data: {
              pharmacyId: created.id,
              licenseNumber: data.license.licenseNumber,
              validFrom: data.license.validFrom,
              validUntil: data.license.validUntil,
              createdById: userId,
              updatedById: userId,
            },
          })
        }

        // ── Owner ──
        let owner: PharmacyCreateResult['owner'] = null
        if (data.owner && ownerRole) {
          const account =
            existingOwner ??
            (await tx.user.create({
              data: {
                name: data.owner.mode === 'new' ? data.owner.name : '',
                email: data.owner.mode === 'new' ? data.owner.email : '',
                phone: data.owner.mode === 'new' ? data.owner.phone : undefined,
                password: passwordHash!,
                mustChangePassword: true,
                createdById: userId,
                updatedById: userId,
              },
              select: { id: true, uuid: true, name: true, email: true },
            }))
          await tx.placement.create({
            data: {
              userId: account.id,
              pharmacyId: created.id,
              roleId: ownerRole.id,
              joinedAt: new Date(),
              createdById: userId,
              updatedById: userId,
            },
          })
          owner = { uuid: account.uuid, name: account.name, email: account.email, temporaryPassword }
        }

        // ── Starting data ──
        let copied: PharmacyCreateResult['copied'] = null
        if (source) {
          const result = await copyCatalog(tx, source.id, created.id, userId)
          copied = {
            medicines: result.medicines.created,
            shapes: result.shapes.created,
            types: result.types.created,
            classes: result.classes.created,
          }
          // Same pricing and policy settings as the source branch (receipt header excepted).
          const sourceParams = await tx.businessParameter.findMany({ where: { pharmacyId: source.id }, select: { key: true, value: true } })
          const values = Object.fromEntries(sourceParams.map((p) => [p.key, p.value]))
          await ensureBusinessParams(tx, created.id, userId, { ...values, RECEIPT_HEADER: data.name })
        } else {
          await seedDefaultClassifications(tx, created.id, userId)
          await ensureBusinessParams(tx, created.id, userId, { RECEIPT_HEADER: data.name })
        }
        await ensureWalkInCustomer(tx, created.id, userId)

        const pharmacy = await tx.pharmacy.findFirstOrThrow({ where: { id: created.id }, select: pharmacySelect })
        return { pharmacy: formatResponse(pharmacy), owner, copied }
      },
      { timeout: 60_000, maxWait: 10_000 }
    )
  } catch (e) {
    if (e instanceof PrismaClientKnownRequestError && e.code === 'P2002') {
      const target = (e.meta?.target as string[] | undefined) ?? []
      if (target.includes('code')) throw new ConflictException('Pharmacy code already exists')
      if (target.includes('email')) throw new ConflictException('EMAIL_ALREADY_EXISTS')
    }
    throw e
  }
}

export const updatePharmacy = async (
  uuid: string,
  data: UpdatePharmacyInput,
  pharmacyId: number | null,
  platformRole: PlatformRole | null,
  userId: number
): Promise<PharmacyResponse> => {
  const existing = await prisma.pharmacy.findFirst({
    where: { uuid, deletedAt: null },
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

  try {
    const pharmacy = await prisma.pharmacy.update({
      where: { id: existing.id },
      data: { ...data, updatedById: userId },
      select: pharmacySelect,
    })
    return formatResponse(pharmacy)
  } catch (e) {
    if (e instanceof PrismaClientKnownRequestError && e.code === 'P2002') {
      throw new ConflictException('Pharmacy code already exists')
    }
    throw e
  }
}


export const deletePharmacy = async (
  uuid: string,
  userId: number
): Promise<void> => {
  const existing = await prisma.pharmacy.findFirst({
    where: { uuid, deletedAt: null },
    select: { id: true },
  })
  if (!existing) throw new NotFoundException('Pharmacy not found')

  await prisma.pharmacy.update({
    where: { id: existing.id },
    data: {
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
    where: { uuid: pharmacyUuid, deletedAt: null },
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
    deletedAt: null,
    ...(status && { status }),
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
    where: { uuid, pharmacyId: pharmacy.id, deletedAt: null },
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
    where: { pharmacyId: pharmacy.id, licenseNumber: data.licenseNumber, deletedAt: null },
  })
  if (conflict) throw new ConflictException('Business license number already exists')

  const overlapping = await prisma.businessLicense.findFirst({
    where: {
      pharmacyId: pharmacy.id,
      deletedAt: null,
      validFrom: { lt: data.validUntil },
      validUntil: { gt: data.validFrom },
    },
    select: { licenseNumber: true, validFrom: true, validUntil: true },
  })
  if (overlapping) {
    throw new ConflictException(
      `License date range overlaps with existing license "${overlapping.licenseNumber}" (${overlapping.validFrom.toISOString().slice(0, 10)} – ${overlapping.validUntil.toISOString().slice(0, 10)})`
    )
  }

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
    where: { uuid, pharmacyId: pharmacy.id, deletedAt: null },
    select: { id: true, licenseNumber: true },
  })
  if (!existing) throw new NotFoundException('Business license not found')

  if (data.licenseNumber && data.licenseNumber !== existing.licenseNumber) {
    const conflict = await prisma.businessLicense.findFirst({
      where: {
        pharmacyId: pharmacy.id,
        licenseNumber: data.licenseNumber,
        deletedAt: null,
        NOT: { uuid },
      },
    })
    if (conflict) throw new ConflictException('Business license number already exists')
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
    where: { uuid, pharmacyId: pharmacy.id, deletedAt: null },
    select: { id: true },
  })
  if (!existing) throw new NotFoundException('Business license not found')

  await prisma.businessLicense.update({
    where: { id: existing.id },
    data: { deletedAt: new Date(), deletedById: userId },
  })
}

export const getPharmaciesDdl = async (
  pharmacyId: number | null,
  platformRole: PlatformRole | null
): Promise<PharmacyDdlItem[]> => {
  const where =
    platformRole === PlatformRole.PLATFORM_ADMIN
      ? { status: 'ACTIVE' as const, deletedAt: null }
      : { id: pharmacyId ?? -1, status: 'ACTIVE' as const, deletedAt: null }

  return prisma.pharmacy.findMany({
    where,
    select: { uuid: true, name: true, code: true },
    orderBy: { name: 'asc' },
  })
}
// ── Setup status (onboarding checklist) ───────────────

/** What a newly onboarded pharmacy still has to set up before it can run. */
export const getSetupStatus = async (pharmacyId: number): Promise<PharmacySetupStatus> => {
  const now = new Date()
  const [license, headPharmacist, staff, medicines, distributors, cabinets, stock] = await Promise.all([
    prisma.businessLicense.count({ where: { pharmacyId, deletedAt: null, status: 'ACTIVE', validUntil: { gte: now } } }),
    prisma.placement.count({ where: { pharmacyId, deletedAt: null, leftAt: null, status: 'ACTIVE', isHeadPharmacist: true } }),
    prisma.placement.count({ where: { pharmacyId, deletedAt: null, leftAt: null, status: 'ACTIVE', role: { type: { not: AppRole.OWNER } } } }),
    prisma.medicine.count({ where: { pharmacyId, deletedAt: null } }),
    prisma.distributor.count({ where: { pharmacyId, deletedAt: null } }),
    prisma.storageCabinet.count({ where: { pharmacyId, deletedAt: null } }),
    prisma.stock.count({ where: { pharmacyId, totalPieces: { gt: 0 } } }),
  ])
  return {
    hasActiveLicense: license > 0,
    hasHeadPharmacist: headPharmacist > 0,
    staffCount: staff,
    medicineCount: medicines,
    distributorCount: distributors,
    storageCabinetCount: cabinets,
    stockedMedicineCount: stock,
  }
}
