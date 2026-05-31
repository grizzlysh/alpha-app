import { PlatformRole } from '@prisma/client'
import { prisma } from '@config/db'
import {
  CreateMedicineClassInput,
  UpdateMedicineClassInput,
  MedicineClassQueryInput,
} from './medicine-classes.validation'
import { MedicineClassResponse, MedicineClassDropdownItem } from './medicine-classes.interface'
import { NotFoundException } from '@exceptions/NotFoundException'
import { ConflictException } from '@exceptions/ConflictException'
import { ForbiddenException } from '@exceptions/ForbiddenException'
import { PaginationMeta } from '@interfaces/common.interface'

// ── Helpers ───────────────────────────────────────────

const medicineClassSelect = {
  uuid: true,
  name: true,
  pharmacyId: true,
  status: true,
  createdAt: true,
  updatedAt: true,
}

const formatResponse = (medicine_class: any): MedicineClassResponse => ({
  uuid: medicine_class.uuid,
  name: medicine_class.name,
  isGlobal: medicine_class.pharmacyId === null,
  status: medicine_class.status,
  createdAt: medicine_class.createdAt,
  updatedAt: medicine_class.updatedAt,
})

const checkDuplicate = async (
  name: string,
  pharmacyId: number | null,
  excludeUuid?: string
): Promise<void> => {
  const existing = await prisma.medicineClass.findFirst({
    where: {
      name,
      pharmacyId,
      status: { not: 'DELETED' },
      ...(excludeUuid && { NOT: { uuid: excludeUuid } })
    }
  })

  if (existing) {
    throw new ConflictException('Medicine class with this name already exists')
  }
}

const checkGlobalAccess = async (
  uuid: string,
  platformRole: PlatformRole | null
): Promise<void> => {
  const medicine_class = await prisma.medicineClass.findUnique({
    where: { uuid },
    select: { pharmacyId: true }
  })

  if (medicine_class?.pharmacyId === null &&
    platformRole !== PlatformRole.PLATFORM_ADMIN) {
    throw new ForbiddenException(
      'Global records can only be modified by platform admin'
    )
  }
}

const resolvePharmacyId = async (
  pharmacyUuid?: string
): Promise<number | null> => {
  if (!pharmacyUuid) return null

  const pharmacy = await prisma.pharmacy.findUnique({
    where: { uuid: pharmacyUuid },
    select: { id: true }
  })

  if (!pharmacy) throw new NotFoundException('Pharmacy not found')

  return pharmacy.id
}

// ── Services ──────────────────────────────────────────

export const getMedicineClasses = async (
  pharmacyId: number | null,
  platformRole: PlatformRole | null,
  query: MedicineClassQueryInput
): Promise<{ data: MedicineClassResponse[]; meta: PaginationMeta }> => {
  const { search, status, isGlobal, sortBy, sortOrder, page, limit } = query

  const skip: number = (page - 1) * limit

  // build where based on role
  let pharmacyFilter = {}

  if (platformRole === PlatformRole.PLATFORM_ADMIN) {
    // platform admin sees all
    if (isGlobal === 'true') {
      pharmacyFilter = { pharmacyId: null }
    } else if (isGlobal === 'false') {
      pharmacyFilter = { pharmacyId: { not: null } }
    }
    // no filter = sees everything
  } else {
    // pharmacy user sees global + their own
    pharmacyFilter = {
      OR: [
        { pharmacyId: null },
        { pharmacyId }
      ]
    }

    if (isGlobal === 'true') {
      pharmacyFilter = { pharmacyId: null }
    } else if (isGlobal === 'false') {
      pharmacyFilter = { pharmacyId }
    }
  }

  const where = {
    ...pharmacyFilter,
    status: status ?? { not: 'DELETED' as const },
    ...(search && {
      name: { contains: search, mode: 'insensitive' as const }
    })
  }

  const [medicine_classes, total] = await prisma.$transaction([
    prisma.medicineClass.findMany({
      where,
      select: medicineClassSelect,
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    }),
    prisma.medicineClass.count({ where }),
  ])

  const meta: PaginationMeta = {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  }

  return {
    data: medicine_classes.map(formatResponse),
    meta
  }
}

export const getMedicineClassByUuid = async (
  uuid: string,
  pharmacyId: number | null,
  platformRole: PlatformRole | null
): Promise<MedicineClassResponse> => {
  const where =
    platformRole === PlatformRole.PLATFORM_ADMIN
      ? { uuid, status: { not: 'DELETED' as const } }
      : {
        uuid,
        status: { not: 'DELETED' as const },
        OR: [{ pharmacyId: null }, { pharmacyId }]
      }

  const medicine_class = await prisma.medicineClass.findFirst({
    where,
    select: medicineClassSelect,
  })

  if (!medicine_class) throw new NotFoundException('Medicine class not found')

  return formatResponse(medicine_class)
}

export const createMedicineClass = async (
  data: CreateMedicineClassInput,
  pharmacyId: number | null,
  platformRole: PlatformRole | null,
  userId: number
): Promise<MedicineClassResponse> => {
  let resolvedPharmacyId: number | null

  if (platformRole === PlatformRole.PLATFORM_ADMIN) {
    // platform admin: use pharmacyUuid from body or null (global)
    resolvedPharmacyId = data.pharmacyUuid
      ? await resolvePharmacyId(data.pharmacyUuid)
      : null
  } else {
    // pharmacy user: always use their own pharmacyId
    resolvedPharmacyId = pharmacyId
  }

  await checkDuplicate(data.name, resolvedPharmacyId)

  const medicine_class = await prisma.medicineClass.create({
    data: {
      name: data.name,
      status: data.status,
      pharmacyId: resolvedPharmacyId,
      createdById: userId,
    },
    select: medicineClassSelect,
  })

  return formatResponse(medicine_class)
}

export const updateMedicineClass = async (
  uuid: string,
  data: UpdateMedicineClassInput,
  pharmacyId: number | null,
  platformRole: PlatformRole | null,
  userId: number
): Promise<MedicineClassResponse> => {
  const existing = await prisma.medicineClass.findFirst({
    where: { uuid, status: { not: 'DELETED' } },
    select: { id: true, pharmacyId: true }
  })

  if (!existing) throw new NotFoundException('Medicine class not found')

  // check global access
  await checkGlobalAccess(uuid, platformRole)

  // check pharmacy user only edits their own custom
  if (
    platformRole !== PlatformRole.PLATFORM_ADMIN &&
    existing.pharmacyId !== pharmacyId
  ) {
    throw new ForbiddenException('You can only edit your own pharmacy records')
  }

  if (data.name) {
    await checkDuplicate(data.name, existing.pharmacyId, uuid)
  }

  const medicine_class = await prisma.medicineClass.update({
    where: { id: existing.id },
    data: { ...data, updatedById: userId },
    select: medicineClassSelect,
  })

  return formatResponse(medicine_class)
}

export const deleteMedicineClass = async (
  uuid: string,
  pharmacyId: number | null,
  platformRole: PlatformRole | null,
  userId: number
): Promise<void> => {
  const existing = await prisma.medicineClass.findFirst({
    where: { uuid, status: { not: 'DELETED' } },
    select: { id: true, pharmacyId: true }
  })

  if (!existing) throw new NotFoundException('Medicine class not found')

  // check global access
  await checkGlobalAccess(uuid, platformRole)

  // check pharmacy user only deletes their own custom
  if (
    platformRole !== PlatformRole.PLATFORM_ADMIN &&
    existing.pharmacyId !== pharmacyId
  ) {
    throw new ForbiddenException('You can only delete your own pharmacy records')
  }

  await prisma.medicineClass.update({
    where: { id: existing.id },
    data: {
      status: 'DELETED',
      deletedAt: new Date(),
      deletedById: userId,
    }
  })
}

export const getMedicineClassesDropdown = async (
  pharmacyId: number | null,
  platformRole: PlatformRole | null,
  search?: string
): Promise<MedicineClassDropdownItem[]> => {
  const pharmacyFilter =
    platformRole === PlatformRole.PLATFORM_ADMIN
      ? {}
      : { OR: [{ pharmacyId: null }, { pharmacyId }] }

  const rows = await prisma.medicineClass.findMany({
    where: {
      ...pharmacyFilter,
      status: { not: 'DELETED' },
      ...(search && { name: { contains: search, mode: 'insensitive' as const } }),
    },
    select: { uuid: true, name: true, pharmacyId: true },
    orderBy: { name: 'asc' },
  })

  return rows.map(r => ({ uuid: r.uuid, name: r.name, isGlobal: r.pharmacyId === null }))
}