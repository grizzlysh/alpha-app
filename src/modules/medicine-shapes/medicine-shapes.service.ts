import { PlatformRole, Prisma } from '@prisma/client'
import { prisma } from '@config/db'
import {
  CreateMedicineShapeInput,
  UpdateMedicineShapeInput,
  MedicineShapeQueryInput,
} from './medicine-shapes.validation'
import { MedicineShapeResponse, MedicineShapeDropdownItem } from './medicine-shapes.interface'
import { NotFoundException } from '@exceptions/NotFoundException'
import { ConflictException } from '@exceptions/ConflictException'
import { ForbiddenException } from '@exceptions/ForbiddenException'
import { PaginationMeta } from '@interfaces/common.interface'

// ── Helpers ───────────────────────────────────────────

const medicineShapeSelect = {
  uuid: true,
  name: true,
  pharmacyId: true,
  status: true,
  createdAt: true,
  updatedAt: true,
}

const formatResponse = (medicine_shape: Prisma.MedicineShapeGetPayload<{ select: typeof medicineShapeSelect }>): MedicineShapeResponse => ({
  uuid: medicine_shape.uuid,
  name: medicine_shape.name,
  isGlobal: medicine_shape.pharmacyId === null,
  status: medicine_shape.status,
  createdAt: medicine_shape.createdAt,
  updatedAt: medicine_shape.updatedAt,
})

const checkDuplicate = async (
  name: string,
  pharmacyId: number | null,
  excludeUuid?: string
): Promise<void> => {
  const existing = await prisma.medicineShape.findFirst({
    where: {
      name,
      pharmacyId,
      status: { not: 'DELETED' },
      ...(excludeUuid && { NOT: { uuid: excludeUuid } })
    }
  })

  if (existing) {
    throw new ConflictException('Medicine shape with this name already exists')
  }
}

const checkGlobalAccess = async (
  uuid: string,
  platformRole: PlatformRole | null
): Promise<void> => {
  const medicine_shape = await prisma.medicineShape.findUnique({
    where: { uuid },
    select: { pharmacyId: true }
  })

  if (medicine_shape?.pharmacyId === null &&
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

export const getMedicineShapes = async (
  pharmacyId: number | null,
  platformRole: PlatformRole | null,
  query: MedicineShapeQueryInput
): Promise<{ data: MedicineShapeResponse[]; meta: PaginationMeta }> => {
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

  const [medicine_shapes, total] = await prisma.$transaction([
    prisma.medicineShape.findMany({
      where,
      select: medicineShapeSelect,
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    }),
    prisma.medicineShape.count({ where }),
  ])

  const meta: PaginationMeta = {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  }

  return {
    data: medicine_shapes.map(formatResponse),
    meta
  }
}

export const getMedicineShapeByUuid = async (
  uuid: string,
  pharmacyId: number | null,
  platformRole: PlatformRole | null
): Promise<MedicineShapeResponse> => {
  const where =
    platformRole === PlatformRole.PLATFORM_ADMIN
      ? { uuid, status: { not: 'DELETED' as const } }
      : {
        uuid,
        status: { not: 'DELETED' as const },
        OR: [{ pharmacyId: null }, { pharmacyId }]
      }

  const medicine_shape = await prisma.medicineShape.findFirst({
    where,
    select: medicineShapeSelect,
  })

  if (!medicine_shape) throw new NotFoundException('Medicine shape not found')

  return formatResponse(medicine_shape)
}

export const createMedicineShape = async (
  data: CreateMedicineShapeInput,
  pharmacyId: number | null,
  platformRole: PlatformRole | null,
  userId: number
): Promise<MedicineShapeResponse> => {
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

  const medicine_shape = await prisma.medicineShape.create({
    data: {
      name: data.name,
      status: data.status,
      pharmacyId: resolvedPharmacyId,
      createdById: userId,
    },
    select: medicineShapeSelect,
  })

  return formatResponse(medicine_shape)
}

export const updateMedicineShape = async (
  uuid: string,
  data: UpdateMedicineShapeInput,
  pharmacyId: number | null,
  platformRole: PlatformRole | null,
  userId: number
): Promise<MedicineShapeResponse> => {
  const existing = await prisma.medicineShape.findFirst({
    where: { uuid, status: { not: 'DELETED' } },
    select: { id: true, pharmacyId: true }
  })

  if (!existing) throw new NotFoundException('Medicine shape not found')

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

  const medicine_shape = await prisma.medicineShape.update({
    where: { id: existing.id },
    data: { ...data, updatedById: userId },
    select: medicineShapeSelect,
  })

  return formatResponse(medicine_shape)
}

export const deleteMedicineShape = async (
  uuid: string,
  pharmacyId: number | null,
  platformRole: PlatformRole | null,
  userId: number
): Promise<void> => {
  const existing = await prisma.medicineShape.findFirst({
    where: { uuid, status: { not: 'DELETED' } },
    select: { id: true, pharmacyId: true }
  })

  if (!existing) throw new NotFoundException('Medicine shape not found')

  // check global access
  await checkGlobalAccess(uuid, platformRole)

  // check pharmacy user only deletes their own custom
  if (
    platformRole !== PlatformRole.PLATFORM_ADMIN &&
    existing.pharmacyId !== pharmacyId
  ) {
    throw new ForbiddenException('You can only delete your own pharmacy records')
  }

  await prisma.medicineShape.update({
    where: { id: existing.id },
    data: {
      status: 'DELETED',
      deletedAt: new Date(),
      deletedById: userId,
    }
  })
}

export const getMedicineShapesDropdown = async (
  pharmacyId: number | null,
  platformRole: PlatformRole | null,
  search?: string
): Promise<MedicineShapeDropdownItem[]> => {
  const pharmacyFilter =
    platformRole === PlatformRole.PLATFORM_ADMIN
      ? {}
      : { OR: [{ pharmacyId: null }, { pharmacyId }] }

  const rows = await prisma.medicineShape.findMany({
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