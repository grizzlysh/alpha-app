import { Prisma } from '@prisma/client'
import { prisma } from '@config/db'
import {
  CreateMedicineClassInput,
  UpdateMedicineClassInput,
  MedicineClassQueryInput,
} from './medicine-classes.validation'
import { MedicineClassResponse, MedicineClassDropdownItem } from './medicine-classes.interface'
import { NotFoundException } from '@exceptions/NotFoundException'
import { ConflictException } from '@exceptions/ConflictException'
import { PaginationMeta } from '@interfaces/common.interface'

// Every pharmacy owns its own list — there are no shared/global rows. A new
// pharmacy starts from the default template (see constants/defaultCatalog).

// ── Helpers ───────────────────────────────────────────

const medicineClassSelect = {
  uuid: true,
  name: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { medicines: { where: { deletedAt: null } } } },
} satisfies Prisma.MedicineClassSelect

const formatResponse = (row: Prisma.MedicineClassGetPayload<{ select: typeof medicineClassSelect }>): MedicineClassResponse => ({
  uuid: row.uuid,
  name: row.name,
  status: row.status,
  medicineCount: row._count.medicines,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
})

const checkDuplicate = async (name: string, pharmacyId: number, excludeUuid?: string): Promise<void> => {
  const existing = await prisma.medicineClass.findFirst({
    where: {
      name: { equals: name, mode: 'insensitive' },
      pharmacyId,
      deletedAt: null,
      ...(excludeUuid && { NOT: { uuid: excludeUuid } }),
    },
    select: { id: true },
  })
  if (existing) throw new ConflictException('Medicine class with this name already exists')
}

const findOwn = async (uuid: string, pharmacyId: number): Promise<{ id: number }> => {
  const row = await prisma.medicineClass.findFirst({
    where: { uuid, pharmacyId, deletedAt: null },
    select: { id: true },
  })
  if (!row) throw new NotFoundException('Medicine class not found')
  return row
}

// ── Services ──────────────────────────────────────────

export const getMedicineClasses = async (
  pharmacyId: number,
  query: MedicineClassQueryInput
): Promise<{ data: MedicineClassResponse[]; meta: PaginationMeta }> => {
  const { search, status, sortBy, sortOrder, page, limit } = query

  const where: Prisma.MedicineClassWhereInput = {
    pharmacyId,
    deletedAt: null,
    ...(status && { status }),
    ...(search && { name: { contains: search, mode: 'insensitive' as const } }),
  }

  const [rows, total] = await prisma.$transaction([
    prisma.medicineClass.findMany({
      where,
      select: medicineClassSelect,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.medicineClass.count({ where }),
  ])

  return {
    data: rows.map(formatResponse),
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  }
}

export const getMedicineClassByUuid = async (uuid: string, pharmacyId: number): Promise<MedicineClassResponse> => {
  const row = await prisma.medicineClass.findFirst({
    where: { uuid, pharmacyId, deletedAt: null },
    select: medicineClassSelect,
  })
  if (!row) throw new NotFoundException('Medicine class not found')
  return formatResponse(row)
}

export const createMedicineClass = async (
  data: CreateMedicineClassInput,
  pharmacyId: number,
  userId: number
): Promise<MedicineClassResponse> => {
  await checkDuplicate(data.name, pharmacyId)

  const row = await prisma.medicineClass.create({
    data: {
      name: data.name,
      status: data.status,
      pharmacyId,
      createdById: userId,
    },
    select: medicineClassSelect,
  })

  return formatResponse(row)
}

export const updateMedicineClass = async (
  uuid: string,
  data: UpdateMedicineClassInput,
  pharmacyId: number,
  userId: number
): Promise<MedicineClassResponse> => {
  const existing = await findOwn(uuid, pharmacyId)
  if (data.name) await checkDuplicate(data.name, pharmacyId, uuid)

  const row = await prisma.medicineClass.update({
    where: { id: existing.id },
    data: { ...data, updatedById: userId },
    select: medicineClassSelect,
  })

  return formatResponse(row)
}

export const deleteMedicineClass = async (uuid: string, pharmacyId: number, userId: number): Promise<void> => {
  const existing = await findOwn(uuid, pharmacyId)

  const inUse = await prisma.medicine.count({ where: { medicineClassId: existing.id, deletedAt: null } })
  if (inUse > 0) {
    throw new ConflictException(`Medicine class is still used by ${inUse} medicine(s)`)
  }

  await prisma.medicineClass.update({
    where: { id: existing.id },
    data: { deletedAt: new Date(), deletedById: userId },
  })
}

export const getMedicineClassesDropdown = async (
  pharmacyId: number,
  search?: string
): Promise<MedicineClassDropdownItem[]> => {
  return prisma.medicineClass.findMany({
    where: {
      pharmacyId,
      deletedAt: null,
      ...(search && { name: { contains: search, mode: 'insensitive' as const } }),
    },
    select: { uuid: true, name: true },
    orderBy: { name: 'asc' },
  })
}
