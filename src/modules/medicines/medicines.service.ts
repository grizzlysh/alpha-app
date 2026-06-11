import { Prisma } from '@prisma/client'
import { prisma } from '@config/db'
import {
  CreateMedicineInput,
  UpdateMedicineInput,
  MedicineQueryInput,
} from './medicines.validation'
import {
  MedicineResponse,
  MedicineDropdownItem,
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
      deletedAt: null,
      ...(excludeUuid && {
        NOT: { uuid: excludeUuid }
      })
    }
  })

  if (existing) {
    throw new ConflictException('Medicine with this name already exists')
  }
}

const formatResponse = (m: Prisma.MedicineGetPayload<{ select: typeof medicineSelect }>): MedicineResponse => ({
  uuid: m.uuid,
  name: m.name,
  unit: m.unit,
  status: m.status,
  medicineShape: m.shape,
  medicineType: m.type,
  medicineClass: m.medicineClass,
  ingredients: m.ingredients,
  createdAt: m.createdAt,
  updatedAt: m.updatedAt,
})

const resolveMedicineRefs = async (
  medicineShapeUuid: string,
  medicineTypeUuid: string,
  medicineClassUuid: string
): Promise<{ shapeId: number; typeId: number; medicineClassId: number }> => {
  const [shape, type, medicineClass] = await Promise.all([
    prisma.medicineShape.findFirst({ where: { uuid: medicineShapeUuid, deletedAt: null }, select: { id: true } }),
    prisma.medicineType.findFirst({ where: { uuid: medicineTypeUuid, deletedAt: null }, select: { id: true } }),
    prisma.medicineClass.findFirst({ where: { uuid: medicineClassUuid, deletedAt: null }, select: { id: true } }),
  ])

  if (!shape) throw new NotFoundException('Medicine shape not found')
  if (!type) throw new NotFoundException('Medicine type not found')
  if (!medicineClass) throw new NotFoundException('Medicine class not found')

  return { shapeId: shape.id, typeId: type.id, medicineClassId: medicineClass.id }
}

// ── Services ──────────────────────────────────────────

export const getMedicines = async (
  pharmacyId: number,
  query: MedicineQueryInput
): Promise<{ data: MedicineResponse[]; meta: PaginationMeta }> => {
  const {
    search,
    medicineShapeUuid,
    medicineTypeUuid,
    medicineClassUuid,
    status,
    sortBy,
    sortOrder,
    page,
    limit,
  } = query

  const skip: number = (page - 1) * limit

  const where = {
    pharmacyId,
    deletedAt: null,
    ...(status && { status }),
    ...(medicineShapeUuid && { shape: { uuid: medicineShapeUuid } }),
    ...(medicineTypeUuid && { type: { uuid: medicineTypeUuid } }),
    ...(medicineClassUuid && { medicineClass: { uuid: medicineClassUuid } }),
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

  return { data: medicines.map(formatResponse), meta }
}

export const getMedicineByUuid = async (
  uuid: string,
  pharmacyId: number
): Promise<MedicineResponse> => {
  const medicine = await prisma.medicine.findFirst({
    where: { uuid, pharmacyId, deletedAt: null },
    select: medicineSelect,
  })

  if (!medicine) {
    throw new NotFoundException('Medicine not found')
  }

  return formatResponse(medicine)
}

export const createMedicine = async (
  data: CreateMedicineInput,
  pharmacyId: number,
  userUuid: string,
  userId: number
): Promise<MedicineResponse> => {
  await checkDuplicate(data.name, pharmacyId)

  const { shapeId, typeId, medicineClassId } = await resolveMedicineRefs(
    data.medicineShapeUuid,
    data.medicineTypeUuid,
    data.medicineClassUuid
  )

  const medicine = await prisma.medicine.create({
    data: {
      pharmacyId,
      name: data.name,
      shapeId,
      typeId,
      medicineClassId,
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

  return formatResponse(medicine)
}

export const updateMedicine = async (
  uuid: string,
  data: UpdateMedicineInput,
  pharmacyId: number,
  userId: number
): Promise<MedicineResponse> => {
  const existing = await prisma.medicine.findFirst({
    where: { uuid, pharmacyId, deletedAt: null },
    select: { id: true }
  })

  if (!existing) {
    throw new NotFoundException('Medicine not found')
  }

  if (data.name) {
    await checkDuplicate(data.name, pharmacyId, uuid)
  }

  let shapeId: number | undefined
  let typeId: number | undefined
  let medicineClassId: number | undefined

  if (data.medicineShapeUuid || data.medicineTypeUuid || data.medicineClassUuid) {
    const [shape, type, medicineClass] = await Promise.all([
      data.medicineShapeUuid
        ? prisma.medicineShape.findFirst({ where: { uuid: data.medicineShapeUuid, deletedAt: null }, select: { id: true } })
        : null,
      data.medicineTypeUuid
        ? prisma.medicineType.findFirst({ where: { uuid: data.medicineTypeUuid, deletedAt: null }, select: { id: true } })
        : null,
      data.medicineClassUuid
        ? prisma.medicineClass.findFirst({ where: { uuid: data.medicineClassUuid, deletedAt: null }, select: { id: true } })
        : null,
    ])

    if (data.medicineShapeUuid && !shape) throw new NotFoundException('Medicine shape not found')
    if (data.medicineTypeUuid && !type) throw new NotFoundException('Medicine type not found')
    if (data.medicineClassUuid && !medicineClass) throw new NotFoundException('Medicine class not found')

    shapeId = shape?.id
    typeId = type?.id
    medicineClassId = medicineClass?.id
  }

  const medicine = await prisma.medicine.update({
    where: { id: existing.id },
    data: {
      ...(data.name && { name: data.name }),
      ...(shapeId && { shapeId }),
      ...(typeId && { typeId }),
      ...(medicineClassId && { medicineClassId }),
      ...(data.unit && { unit: data.unit }),
      ...(data.status && { status: data.status }),
      updatedById: userId,
      ...(data.ingredients && {
        ingredients: {
          deleteMany: {},
          create: data.ingredients.map((name) => ({
            name,
            createdById: userId,
          }))
        }
      })
    },
    select: medicineSelect,
  })

  return formatResponse(medicine)
}

export const deleteMedicine = async (
  uuid: string,
  pharmacyId: number,
  userId: number
): Promise<void> => {
  const existing = await prisma.medicine.findFirst({
    where: { uuid, pharmacyId, deletedAt: null },
    select: { id: true }
  })

  if (!existing) {
    throw new NotFoundException('Medicine not found')
  }

  await prisma.medicine.update({
    where: { id: existing.id },
    data: {
      deletedAt: new Date(),
      deletedById: userId,
    }
  })
}

export const getMedicinesDropdown = async (
  pharmacyId: number,
  search?: string
): Promise<MedicineDropdownItem[]> => {
  return prisma.medicine.findMany({
    where: {
      pharmacyId,
      deletedAt: null,
      ...(search && { name: { contains: search, mode: 'insensitive' as const } }),
    },
    select: { uuid: true, name: true, unit: true },
    orderBy: { name: 'asc' },
  })
}
