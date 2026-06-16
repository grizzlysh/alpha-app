import { PlatformRole, Prisma } from '@prisma/client'
import { prisma } from '@config/db'
import {
  CreateMedicineTypeInput,
  UpdateMedicineTypeInput,
  MedicineTypeQueryInput,
} from './medicine-types.validation'
import { MedicineTypeResponse, MedicineTypeDropdownItem } from './medicine-types.interface'
import { NotFoundException } from '@exceptions/NotFoundException'
import { ConflictException } from '@exceptions/ConflictException'
import { ForbiddenException } from '@exceptions/ForbiddenException'
import { PaginationMeta } from '@interfaces/common.interface'

// ── Helpers ───────────────────────────────────────────

const medicineTypeSelect = {
  uuid: true,
  name: true,
  requiredPrescription: true,
  pharmacyId: true,
  status: true,
  createdAt: true,
  updatedAt: true,
}

const formatResponse = (medicine_type: Prisma.MedicineTypeGetPayload<{ select: typeof medicineTypeSelect }>): MedicineTypeResponse => ({
  uuid: medicine_type.uuid,
  name: medicine_type.name,
  requiredPrescription: medicine_type.requiredPrescription,
  isGlobal: medicine_type.pharmacyId === null,
  status: medicine_type.status,
  createdAt: medicine_type.createdAt,
  updatedAt: medicine_type.updatedAt,
})

const checkDuplicate = async (
  name: string,
  pharmacyId: number | null,
  excludeUuid?: string
): Promise<void> => {
  const existing = await prisma.medicineType.findFirst({
    where: {
      name,
      pharmacyId,
      deletedAt: null,
      ...(excludeUuid && { NOT: { uuid: excludeUuid } })
    }
  })

  if (existing) {
    throw new ConflictException('Medicine type with this name already exists')
  }
}

const checkGlobalAccess = async (
  uuid: string,
  platformRole: PlatformRole | null
): Promise<void> => {
  const medicine_type = await prisma.medicineType.findUnique({
    where: { uuid },
    select: { pharmacyId: true }
  })

  if (medicine_type?.pharmacyId === null &&
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

export const getMedicineTypes = async (
  pharmacyId: number | null,
  platformRole: PlatformRole | null,
  query: MedicineTypeQueryInput
): Promise<{ data: MedicineTypeResponse[]; meta: PaginationMeta }> => {
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
    deletedAt: null,
    ...(status && { status }),
    ...(search && {
      name: { contains: search, mode: 'insensitive' as const }
    })
  }

  const [medicine_types, total] = await prisma.$transaction([
    prisma.medicineType.findMany({
      where,
      select: medicineTypeSelect,
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    }),
    prisma.medicineType.count({ where }),
  ])

  const meta: PaginationMeta = {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  }

  return {
    data: medicine_types.map(formatResponse),
    meta
  }
}

export const getMedicineTypeByUuid = async (
  uuid: string,
  pharmacyId: number | null,
  platformRole: PlatformRole | null
): Promise<MedicineTypeResponse> => {
  const where =
    platformRole === PlatformRole.PLATFORM_ADMIN
      ? { uuid, deletedAt: null }
      : {
        uuid,
        deletedAt: null,
        OR: [{ pharmacyId: null }, { pharmacyId }]
      }

  const medicine_type = await prisma.medicineType.findFirst({
    where,
    select: medicineTypeSelect,
  })

  if (!medicine_type) throw new NotFoundException('Medicine type not found')

  return formatResponse(medicine_type)
}

export const createMedicineType = async (
  data: CreateMedicineTypeInput,
  pharmacyId: number | null,
  platformRole: PlatformRole | null,
  userId: number
): Promise<MedicineTypeResponse> => {
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

  const medicine_type = await prisma.medicineType.create({
    data: {
      name: data.name,
      requiredPrescription: data.requiredPrescription,
      status: data.status,
      pharmacyId: resolvedPharmacyId,
      createdById: userId,
    },
    select: medicineTypeSelect,
  })

  return formatResponse(medicine_type)
}

export const updateMedicineType = async (
  uuid: string,
  data: UpdateMedicineTypeInput,
  pharmacyId: number | null,
  platformRole: PlatformRole | null,
  userId: number
): Promise<MedicineTypeResponse> => {
  const existing = await prisma.medicineType.findFirst({
    where: { uuid, deletedAt: null },
    select: { id: true, pharmacyId: true }
  })

  if (!existing) throw new NotFoundException('Medicine type not found')

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

  const medicine_type = await prisma.medicineType.update({
    where: { id: existing.id },
    data: { ...data, updatedById: userId },
    select: medicineTypeSelect,
  })

  return formatResponse(medicine_type)
}

export const deleteMedicineType = async (
  uuid: string,
  pharmacyId: number | null,
  platformRole: PlatformRole | null,
  userId: number
): Promise<void> => {
  const existing = await prisma.medicineType.findFirst({
    where: { uuid, deletedAt: null },
    select: { id: true, pharmacyId: true }
  })

  if (!existing) throw new NotFoundException('Medicine type not found')

  // check global access
  await checkGlobalAccess(uuid, platformRole)

  // check pharmacy user only deletes their own custom
  if (
    platformRole !== PlatformRole.PLATFORM_ADMIN &&
    existing.pharmacyId !== pharmacyId
  ) {
    throw new ForbiddenException('You can only delete your own pharmacy records')
  }

  await prisma.medicineType.update({
    where: { id: existing.id },
    data: {
      deletedAt: new Date(),
      deletedById: userId,
    }
  })
}

export const getMedicineTypesDropdown = async (
  pharmacyId: number | null,
  platformRole: PlatformRole | null,
  search?: string
): Promise<MedicineTypeDropdownItem[]> => {
  const pharmacyFilter =
    platformRole === PlatformRole.PLATFORM_ADMIN
      ? {}
      : { OR: [{ pharmacyId: null }, { pharmacyId }] }

  const rows = await prisma.medicineType.findMany({
    where: {
      ...pharmacyFilter,
      deletedAt: null,
      ...(search && { name: { contains: search, mode: 'insensitive' as const } }),
    },
    select: { uuid: true, name: true, requiredPrescription: true, pharmacyId: true },
    orderBy: { name: 'asc' },
  })

  return rows.map(r => ({ uuid: r.uuid, name: r.name, requiredPrescription: r.requiredPrescription, isGlobal: r.pharmacyId === null }))
}