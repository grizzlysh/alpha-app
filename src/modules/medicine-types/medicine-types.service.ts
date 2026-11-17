import { Prisma } from '@prisma/client'
import { prisma } from '@config/db'
import {
  CreateMedicineTypeInput,
  UpdateMedicineTypeInput,
  MedicineTypeQueryInput,
} from './medicine-types.validation'
import { MedicineTypeResponse, MedicineTypeDropdownItem } from './medicine-types.interface'
import { NotFoundException } from '@exceptions/NotFoundException'
import { ConflictException } from '@exceptions/ConflictException'
import { PaginationMeta } from '@interfaces/common.interface'

// Every pharmacy owns its own list — there are no shared/global rows. A new
// pharmacy starts from the default template (see constants/defaultCatalog).

// ── Helpers ───────────────────────────────────────────

const medicineTypeSelect = {
  uuid: true,
  name: true,
  requiredPrescription: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { medicines: { where: { deletedAt: null } } } },
} satisfies Prisma.MedicineTypeSelect

const formatResponse = (row: Prisma.MedicineTypeGetPayload<{ select: typeof medicineTypeSelect }>): MedicineTypeResponse => ({
  uuid: row.uuid,
  name: row.name,
  requiredPrescription: row.requiredPrescription,
  status: row.status,
  medicineCount: row._count.medicines,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
})

const checkDuplicate = async (name: string, pharmacyId: number, excludeUuid?: string): Promise<void> => {
  const existing = await prisma.medicineType.findFirst({
    where: {
      name: { equals: name, mode: 'insensitive' },
      pharmacyId,
      deletedAt: null,
      ...(excludeUuid && { NOT: { uuid: excludeUuid } }),
    },
    select: { id: true },
  })
  if (existing) throw new ConflictException('Medicine type with this name already exists')
}

const findOwn = async (uuid: string, pharmacyId: number): Promise<{ id: number }> => {
  const row = await prisma.medicineType.findFirst({
    where: { uuid, pharmacyId, deletedAt: null },
    select: { id: true },
  })
  if (!row) throw new NotFoundException('Medicine type not found')
  return row
}

// ── Services ──────────────────────────────────────────

export const getMedicineTypes = async (
  pharmacyId: number,
  query: MedicineTypeQueryInput
): Promise<{ data: MedicineTypeResponse[]; meta: PaginationMeta }> => {
  const { search, status, sortBy, sortOrder, page, limit } = query

  const where: Prisma.MedicineTypeWhereInput = {
    pharmacyId,
    deletedAt: null,
    ...(status && { status }),
    ...(search && { name: { contains: search, mode: 'insensitive' as const } }),
  }

  const [rows, total] = await prisma.$transaction([
    prisma.medicineType.findMany({
      where,
      select: medicineTypeSelect,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.medicineType.count({ where }),
  ])

  return {
    data: rows.map(formatResponse),
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  }
}

export const getMedicineTypeByUuid = async (uuid: string, pharmacyId: number): Promise<MedicineTypeResponse> => {
  const row = await prisma.medicineType.findFirst({
    where: { uuid, pharmacyId, deletedAt: null },
    select: medicineTypeSelect,
  })
  if (!row) throw new NotFoundException('Medicine type not found')
  return formatResponse(row)
}

export const createMedicineType = async (
  data: CreateMedicineTypeInput,
  pharmacyId: number,
  userId: number
): Promise<MedicineTypeResponse> => {
  await checkDuplicate(data.name, pharmacyId)

  const row = await prisma.medicineType.create({
    data: {
      name: data.name,
      requiredPrescription: data.requiredPrescription,
      status: data.status,
      pharmacyId,
      createdById: userId,
    },
    select: medicineTypeSelect,
  })

  return formatResponse(row)
}

export const updateMedicineType = async (
  uuid: string,
  data: UpdateMedicineTypeInput,
  pharmacyId: number,
  userId: number
): Promise<MedicineTypeResponse> => {
  const existing = await findOwn(uuid, pharmacyId)
  if (data.name) await checkDuplicate(data.name, pharmacyId, uuid)

  const row = await prisma.medicineType.update({
    where: { id: existing.id },
    data: { ...data, updatedById: userId },
    select: medicineTypeSelect,
  })

  return formatResponse(row)
}

export const deleteMedicineType = async (uuid: string, pharmacyId: number, userId: number): Promise<void> => {
  const existing = await findOwn(uuid, pharmacyId)

  const inUse = await prisma.medicine.count({ where: { typeId: existing.id, deletedAt: null } })
  if (inUse > 0) {
    throw new ConflictException(`Medicine type is still used by ${inUse} medicine(s)`)
  }

  await prisma.medicineType.update({
    where: { id: existing.id },
    data: { deletedAt: new Date(), deletedById: userId },
  })
}

export const getMedicineTypesDropdown = async (
  pharmacyId: number,
  search?: string
): Promise<MedicineTypeDropdownItem[]> => {
  return prisma.medicineType.findMany({
    where: {
      pharmacyId,
      deletedAt: null,
      ...(search && { name: { contains: search, mode: 'insensitive' as const } }),
    },
    select: { uuid: true, name: true, requiredPrescription: true },
    orderBy: { name: 'asc' },
  })
}
