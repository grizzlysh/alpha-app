import { Prisma } from '@prisma/client'
import { prisma } from '@config/db'
import {
  CreateMedicineShapeInput,
  UpdateMedicineShapeInput,
  MedicineShapeQueryInput,
} from './medicine-shapes.validation'
import { MedicineShapeResponse, MedicineShapeDropdownItem } from './medicine-shapes.interface'
import { NotFoundException } from '@exceptions/NotFoundException'
import { ConflictException } from '@exceptions/ConflictException'
import { PaginationMeta } from '@interfaces/common.interface'

// Every pharmacy owns its own list — there are no shared/global rows. A new
// pharmacy starts from the default template (see constants/defaultCatalog).

// ── Helpers ───────────────────────────────────────────

const medicineShapeSelect = {
  uuid: true,
  name: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { medicines: { where: { deletedAt: null } } } },
} satisfies Prisma.MedicineShapeSelect

const formatResponse = (row: Prisma.MedicineShapeGetPayload<{ select: typeof medicineShapeSelect }>): MedicineShapeResponse => ({
  uuid: row.uuid,
  name: row.name,
  status: row.status,
  medicineCount: row._count.medicines,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
})

const checkDuplicate = async (name: string, pharmacyId: number, excludeUuid?: string): Promise<void> => {
  const existing = await prisma.medicineShape.findFirst({
    where: {
      name: { equals: name, mode: 'insensitive' },
      pharmacyId,
      deletedAt: null,
      ...(excludeUuid && { NOT: { uuid: excludeUuid } }),
    },
    select: { id: true },
  })
  if (existing) throw new ConflictException('Medicine shape with this name already exists')
}

const findOwn = async (uuid: string, pharmacyId: number): Promise<{ id: number }> => {
  const row = await prisma.medicineShape.findFirst({
    where: { uuid, pharmacyId, deletedAt: null },
    select: { id: true },
  })
  if (!row) throw new NotFoundException('Medicine shape not found')
  return row
}

// ── Services ──────────────────────────────────────────

export const getMedicineShapes = async (
  pharmacyId: number,
  query: MedicineShapeQueryInput
): Promise<{ data: MedicineShapeResponse[]; meta: PaginationMeta }> => {
  const { search, status, sortBy, sortOrder, page, limit } = query

  const where: Prisma.MedicineShapeWhereInput = {
    pharmacyId,
    deletedAt: null,
    ...(status && { status }),
    ...(search && { name: { contains: search, mode: 'insensitive' as const } }),
  }

  const [rows, total] = await prisma.$transaction([
    prisma.medicineShape.findMany({
      where,
      select: medicineShapeSelect,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.medicineShape.count({ where }),
  ])

  return {
    data: rows.map(formatResponse),
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  }
}

export const getMedicineShapeByUuid = async (uuid: string, pharmacyId: number): Promise<MedicineShapeResponse> => {
  const row = await prisma.medicineShape.findFirst({
    where: { uuid, pharmacyId, deletedAt: null },
    select: medicineShapeSelect,
  })
  if (!row) throw new NotFoundException('Medicine shape not found')
  return formatResponse(row)
}

export const createMedicineShape = async (
  data: CreateMedicineShapeInput,
  pharmacyId: number,
  userId: number
): Promise<MedicineShapeResponse> => {
  await checkDuplicate(data.name, pharmacyId)

  const row = await prisma.medicineShape.create({
    data: {
      name: data.name,
      status: data.status,
      pharmacyId,
      createdById: userId,
    },
    select: medicineShapeSelect,
  })

  return formatResponse(row)
}

export const updateMedicineShape = async (
  uuid: string,
  data: UpdateMedicineShapeInput,
  pharmacyId: number,
  userId: number
): Promise<MedicineShapeResponse> => {
  const existing = await findOwn(uuid, pharmacyId)
  if (data.name) await checkDuplicate(data.name, pharmacyId, uuid)

  const row = await prisma.medicineShape.update({
    where: { id: existing.id },
    data: { ...data, updatedById: userId },
    select: medicineShapeSelect,
  })

  return formatResponse(row)
}

export const deleteMedicineShape = async (uuid: string, pharmacyId: number, userId: number): Promise<void> => {
  const existing = await findOwn(uuid, pharmacyId)

  const inUse = await prisma.medicine.count({ where: { shapeId: existing.id, deletedAt: null } })
  if (inUse > 0) {
    throw new ConflictException(`Medicine shape is still used by ${inUse} medicine(s)`)
  }

  await prisma.medicineShape.update({
    where: { id: existing.id },
    data: { deletedAt: new Date(), deletedById: userId },
  })
}

export const getMedicineShapesDropdown = async (
  pharmacyId: number,
  search?: string
): Promise<MedicineShapeDropdownItem[]> => {
  return prisma.medicineShape.findMany({
    where: {
      pharmacyId,
      deletedAt: null,
      ...(search && { name: { contains: search, mode: 'insensitive' as const } }),
    },
    select: { uuid: true, name: true },
    orderBy: { name: 'asc' },
  })
}
