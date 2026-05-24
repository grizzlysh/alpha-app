import { prisma } from '../../config/db'
import {
  CreateMedicineInput,
  UpdateMedicineInput,
  MedicineQueryInput,
} from './medicines.validation'
import {
  MedicineResponse,
} from './medicines.interface'
import { NotFoundException } from '@exceptions/NotFoundException'
import { ConflictException } from '@exceptions/ConflictException'
import { PaginationMeta } from '@interfaces/common.interface'

// ── Helpers ───────────────────────────────────────────

const medicineSelect = {
  uuid: true,
  name: true,
  unit: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  shape: {
    select: { uuid: true, name: true }
  },
  type: {
    select: { uuid: true, name: true }
  },
  medicineClass: {
    select: { uuid: true, name: true }
  },
  ingredients: {
    select: { uuid: true, name: true }
  },
}

const checkDuplicate = async (
  name: string,
  pharmacyId: number,
  excludeUuid?: string
): Promise<void> => {
  const existing = await prisma.medicine.findFirst({
    where: {
      name,
      pharmacyId,
      status: { not: 'DELETED' },
      ...(excludeUuid && {
        NOT: { uuid: excludeUuid }
      })
    }
  })

  if (existing) {
    throw new ConflictException('Medicine with this name already exists')
  }
}

// ── Services ──────────────────────────────────────────

export const getMedicines = async (
  pharmacyId: number,
  query: MedicineQueryInput
): Promise<{ data: MedicineResponse[]; meta: PaginationMeta }> => {
  const {
    search,
    shapeId,
    typeId,
    medicineClassId,
    status,
    sortBy,
    sortOrder,
    page,
    limit,
  } = query

  const skip: number = (page - 1) * limit

  const where = {
    pharmacyId,
    status: status ?? { not: 'DELETED' as const },
    ...(shapeId && { shapeId }),
    ...(typeId && { typeId }),
    ...(medicineClassId && { medicineClassId }),
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' as const } },
        {
          ingredients: {
            some: {
              name: { contains: search, mode: 'insensitive' as const }
            }
          }
        }
      ]
    })
  }

  const [medicines, total] = await prisma.$transaction([
    prisma.medicine.findMany({
      where,
      select: medicineSelect,
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    }),
    prisma.medicine.count({ where }),
  ])

  const meta: PaginationMeta = {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  }

  return { data: medicines as MedicineResponse[], meta }
}

export const getMedicineByUuid = async (
  uuid: string,
  pharmacyId: number
): Promise<MedicineResponse> => {
  const medicine = await prisma.medicine.findFirst({
    where: { uuid, pharmacyId, status: { not: 'DELETED' } },
    select: medicineSelect,
  })

  if (!medicine) {
    throw new NotFoundException('Medicine not found')
  }

  return medicine as MedicineResponse
}

export const createMedicine = async (
  data: CreateMedicineInput,
  pharmacyId: number,
  userUuid: string,
  userId: number
): Promise<MedicineResponse> => {
  await checkDuplicate(data.name, pharmacyId)

  const medicine = await prisma.medicine.create({
    data: {
      pharmacyId,
      name: data.name,
      shapeId: data.shapeId,
      typeId: data.typeId,
      medicineClassId: data.medicineClassId,
      unit: data.unit,
      createdById: userId,
      ingredients: {
        create: data.ingredients.map((name) => ({
          name,
          createdById: userId,
        }))
      }
    },
    select: medicineSelect,
  })

  return medicine as MedicineResponse
}

export const updateMedicine = async (
  uuid: string,
  data: UpdateMedicineInput,
  pharmacyId: number,
  userId: number
): Promise<MedicineResponse> => {
  const existing = await prisma.medicine.findFirst({
    where: { uuid, pharmacyId, status: { not: 'DELETED' } },
    select: { id: true }
  })

  if (!existing) {
    throw new NotFoundException('Medicine not found')
  }

  if (data.name) {
    await checkDuplicate(data.name, pharmacyId, uuid)
  }

  // handle ingredients update — delete all and recreate
  const medicine = await prisma.medicine.update({
    where: { id: existing.id },
    data: {
      ...(data.name && { name: data.name }),
      ...(data.shapeId && { shapeId: data.shapeId }),
      ...(data.typeId && { typeId: data.typeId }),
      ...(data.medicineClassId && { medicineClassId: data.medicineClassId }),
      ...(data.unit && { unit: data.unit }),
      ...(data.status && { status: data.status }),
      updatedById: userId,
      ...(data.ingredients && {
        ingredients: {
          deleteMany: {},    // ← delete all existing
          create: data.ingredients.map((name) => ({
            name,
            createdById: userId,
          }))
        }
      })
    },
    select: medicineSelect,
  })

  return medicine as MedicineResponse
}

export const deleteMedicine = async (
  uuid: string,
  pharmacyId: number,
  userId: number
): Promise<void> => {
  const existing = await prisma.medicine.findFirst({
    where: { uuid, pharmacyId, status: { not: 'DELETED' } },
    select: { id: true }
  })

  if (!existing) {
    throw new NotFoundException('Medicine not found')
  }

  await prisma.medicine.update({
    where: { id: existing.id },
    data: {
      status: 'DELETED',
      deletedAt: new Date(),
      deletedById: userId,
    }
  })
}