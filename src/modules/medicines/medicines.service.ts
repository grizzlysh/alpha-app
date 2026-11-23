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
import { buildMedicineName, combinedStrength, getMedicineNameFormat } from '@utils/medicineName'

// ── Helpers ───────────────────────────────────────────

const medicineSelect = {
  uuid: true,
  name: true,
  baseName: true,
  variant: true,
  isCustomName: true,
  orderLetterKind: true,
  unit: true,
  barcode: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  shape: {
    select: { uuid: true, name: true }
  },
  type: {
    select: { uuid: true, name: true, orderLetterKind: true }
  },
  medicineClass: {
    select: { uuid: true, name: true }
  },
  ingredients: {
    select: { uuid: true, name: true, strength: true },
    orderBy: { id: 'asc' as const },
  },
}

type Ingredient = { name: string; strength: string | null }

/**
 * The stored name: typed as is for a custom name, otherwise built from the
 * parts with the pharmacy's format (so "Amlodipin" + "10 mg" + "Tablet").
 */
const resolveName = async (
  pharmacyId: number,
  p: { isCustomName: boolean; name?: string | null; baseName?: string | null; variant?: string | null; shapeId: number; ingredients: Ingredient[] }
): Promise<string> => {
  if (p.isCustomName) return p.name!.trim()
  const [format, shape] = await Promise.all([
    getMedicineNameFormat(pharmacyId),
    prisma.medicineShape.findUniqueOrThrow({ where: { id: p.shapeId }, select: { name: true } }),
  ])
  return buildMedicineName(format, {
    baseName: p.baseName!,
    strengths: p.ingredients.map((i) => i.strength),
    shape: shape.name,
    variant: p.variant,
  })
}

const checkDuplicate = async (
  name: string,
  pharmacyId: number,
  excludeUuid?: string
): Promise<void> => {
  const existing = await prisma.medicine.findFirst({
    where: {
      name: { equals: name, mode: 'insensitive' },
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

/**
 * A medicine barcode must be unique in the pharmacy, among medicines and
 * among batch barcodes, so a scan always means one thing.
 */
const checkBarcode = async (barcode: string, pharmacyId: number, excludeUuid?: string): Promise<void> => {
  const [medicine, batch] = await Promise.all([
    prisma.medicine.findFirst({
      where: { pharmacyId, barcode, ...(excludeUuid && { NOT: { uuid: excludeUuid } }) },
      select: { name: true },
    }),
    prisma.stockDetail.findFirst({ where: { barcode, stock: { pharmacyId } }, select: { batchNumber: true } }),
  ])
  if (medicine) throw new ConflictException(`Barcode already used by ${medicine.name}`)
  if (batch) throw new ConflictException(`Barcode already used by batch ${batch.batchNumber}`)
}

const formatResponse = (m: Prisma.MedicineGetPayload<{ select: typeof medicineSelect }>): MedicineResponse => ({
  uuid: m.uuid,
  name: m.name,
  baseName: m.baseName,
  variant: m.variant,
  isCustomName: m.isCustomName,
  strength: combinedStrength(m.ingredients.map((i) => i.strength)),
  orderLetterKind: m.orderLetterKind,
  effectiveOrderLetterKind: m.orderLetterKind ?? m.type.orderLetterKind,
  unit: m.unit,
  barcode: m.barcode,
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
  medicineClassUuid: string,
  pharmacyId: number
): Promise<{ shapeId: number; typeId: number; medicineClassId: number }> => {
  const [shape, type, medicineClass] = await Promise.all([
    prisma.medicineShape.findFirst({ where: { uuid: medicineShapeUuid, deletedAt: null, pharmacyId }, select: { id: true } }),
    prisma.medicineType.findFirst({ where: { uuid: medicineTypeUuid, deletedAt: null, pharmacyId }, select: { id: true } }),
    prisma.medicineClass.findFirst({ where: { uuid: medicineClassUuid, deletedAt: null, pharmacyId }, select: { id: true } }),
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
        { barcode: search },
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
  if (data.barcode) await checkBarcode(data.barcode, pharmacyId)

  const { shapeId, typeId, medicineClassId } = await resolveMedicineRefs(
    data.medicineShapeUuid,
    data.medicineTypeUuid,
    data.medicineClassUuid,
    pharmacyId
  )
  const isCustomName = data.isCustomName ?? !data.baseName
  const name = await resolveName(pharmacyId, { ...data, isCustomName, shapeId })
  await checkDuplicate(name, pharmacyId)

  const medicine = await prisma.medicine.create({
    data: {
      pharmacyId,
      name,
      baseName: isCustomName ? null : data.baseName!,
      variant: isCustomName ? null : (data.variant ?? null),
      isCustomName,
      orderLetterKind: data.orderLetterKind ?? null,
      shapeId,
      typeId,
      medicineClassId,
      unit: data.unit,
      barcode: data.barcode ?? null,
      createdById: userId,
      ingredients: {
        create: data.ingredients.map((i) => ({ ...i, createdById: userId })),
      },
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
    select: {
      id: true,
      name: true,
      baseName: true,
      variant: true,
      isCustomName: true,
      shapeId: true,
      ingredients: { select: { name: true, strength: true }, orderBy: { id: 'asc' } },
    },
  })

  if (!existing) {
    throw new NotFoundException('Medicine not found')
  }

  if (data.barcode) await checkBarcode(data.barcode, pharmacyId, uuid)

  let shapeId: number | undefined
  let typeId: number | undefined
  let medicineClassId: number | undefined

  if (data.medicineShapeUuid || data.medicineTypeUuid || data.medicineClassUuid) {
    const [shape, type, medicineClass] = await Promise.all([
      data.medicineShapeUuid
        ? prisma.medicineShape.findFirst({ where: { uuid: data.medicineShapeUuid, deletedAt: null, pharmacyId }, select: { id: true } })
        : null,
      data.medicineTypeUuid
        ? prisma.medicineType.findFirst({ where: { uuid: data.medicineTypeUuid, deletedAt: null, pharmacyId }, select: { id: true } })
        : null,
      data.medicineClassUuid
        ? prisma.medicineClass.findFirst({ where: { uuid: data.medicineClassUuid, deletedAt: null, pharmacyId }, select: { id: true } })
        : null,
    ])

    if (data.medicineShapeUuid && !shape) throw new NotFoundException('Medicine shape not found')
    if (data.medicineTypeUuid && !type) throw new NotFoundException('Medicine type not found')
    if (data.medicineClassUuid && !medicineClass) throw new NotFoundException('Medicine class not found')

    shapeId = shape?.id
    typeId = type?.id
    medicineClassId = medicineClass?.id
  }

  // Sending only `name` (as older clients do) switches to a custom name.
  const isCustomName = data.isCustomName ?? (data.baseName ? false : data.name ? true : existing.isCustomName)
  const baseName = data.baseName ?? existing.baseName ?? existing.name
  const variant = data.variant !== undefined ? data.variant : existing.variant
  const name = await resolveName(pharmacyId, {
    isCustomName,
    name: data.name ?? existing.name,
    baseName,
    variant,
    shapeId: shapeId ?? existing.shapeId,
    ingredients: data.ingredients ?? existing.ingredients,
  })
  if (name.toLowerCase() !== existing.name.toLowerCase()) await checkDuplicate(name, pharmacyId, uuid)

  const medicine = await prisma.medicine.update({
    where: { id: existing.id },
    data: {
      name,
      baseName: isCustomName ? null : baseName,
      variant: isCustomName ? null : variant,
      isCustomName,
      ...(data.orderLetterKind !== undefined && { orderLetterKind: data.orderLetterKind }),
      ...(shapeId && { shapeId }),
      ...(typeId && { typeId }),
      ...(medicineClassId && { medicineClassId }),
      ...(data.unit && { unit: data.unit }),
      ...(data.barcode !== undefined && { barcode: data.barcode }),
      ...(data.status && { status: data.status }),
      updatedById: userId,
      ...(data.ingredients && {
        ingredients: {
          deleteMany: {},
          create: data.ingredients.map((i) => ({ ...i, createdById: userId })),
        },
      }),
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
