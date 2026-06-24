import { prisma } from '@config/db'
import {
  CreateCabinetInput, UpdateCabinetInput, CabinetQueryInput,
  CreateShelfInput, UpdateShelfInput, ShelfQueryInput,
  CreateBinInput, UpdateBinInput, BinQueryInput,
} from './storage.validation'
import {
  CabinetResponse, ShelfResponse, BinResponse,
} from './storage.interface'
import { NotFoundException } from '@exceptions/NotFoundException'
import { ConflictException } from '@exceptions/ConflictException'
import { BadRequestException } from '@exceptions/BadRequestException'
import { PaginationMeta } from '@interfaces/common.interface'

// ── Selects ───────────────────────────────────────────────

const cabinetSelect = {
  uuid: true,
  name: true,
  code: true,
  description: true,
  status: true,
  createdAt: true,
  updatedAt: true,
}

const shelfSelect = {
  uuid: true,
  name: true,
  code: true,
  level: true,
  description: true,
  status: true,
  createdAt: true,
  updatedAt: true,
}

const binSelect = {
  uuid: true,
  name: true,
  code: true,
  description: true,
  status: true,
  createdAt: true,
  updatedAt: true,
}

// ── Cabinet helpers ───────────────────────────────────────

const findCabinet = async (uuid: string, pharmacyId: number) => {
  const cabinet = await prisma.storageCabinet.findFirst({
    where: { uuid, pharmacyId, deletedAt: null },
    select: { id: true },
  })
  if (!cabinet) throw new NotFoundException('Storage cabinet not found')
  return cabinet
}

const checkCabinetCodeDuplicate = async (
  code: string,
  pharmacyId: number,
  excludeUuid?: string
) => {
  const existing = await prisma.storageCabinet.findFirst({
    where: {
      code,
      pharmacyId,
      deletedAt: null,
      ...(excludeUuid && { NOT: { uuid: excludeUuid } }),
    },
  })
  if (existing) throw new ConflictException('A cabinet with this code already exists')
}

// ── Shelf helpers ─────────────────────────────────────────

const findShelf = async (uuid: string, pharmacyId: number) => {
  const shelf = await prisma.storageShelf.findFirst({
    where: { uuid, deletedAt: null, cabinet: { pharmacyId } },
    select: { id: true, cabinetId: true },
  })
  if (!shelf) throw new NotFoundException('Storage shelf not found')
  return shelf
}

const checkShelfCodeDuplicate = async (
  code: string,
  cabinetId: number,
  excludeUuid?: string
) => {
  const existing = await prisma.storageShelf.findFirst({
    where: {
      code,
      cabinetId,
      deletedAt: null,
      ...(excludeUuid && { NOT: { uuid: excludeUuid } }),
    },
  })
  if (existing) throw new ConflictException('A shelf with this code already exists in this cabinet')
}

// ── Bin helpers ───────────────────────────────────────────

const findBin = async (uuid: string, pharmacyId: number) => {
  const bin = await prisma.storageBin.findFirst({
    where: { uuid, deletedAt: null, shelf: { cabinet: { pharmacyId } } },
    select: { id: true, shelfId: true },
  })
  if (!bin) throw new NotFoundException('Storage bin not found')
  return bin
}

const checkBinCodeDuplicate = async (
  code: string,
  shelfId: number,
  excludeUuid?: string
) => {
  const existing = await prisma.storageBin.findFirst({
    where: {
      code,
      shelfId,
      deletedAt: null,
      ...(excludeUuid && { NOT: { uuid: excludeUuid } }),
    },
  })
  if (existing) throw new ConflictException('A bin with this code already exists on this shelf')
}

// ── Cabinet services ──────────────────────────────────────

export const getCabinets = async (
  pharmacyId: number,
  query: CabinetQueryInput
): Promise<{ data: CabinetResponse[]; meta: PaginationMeta }> => {
  const { search, status, sortBy, sortOrder, page, limit } = query
  const skip = (page - 1) * limit

  const where = {
    pharmacyId,
    deletedAt: null,
    ...(status && { status }),
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' as const } },
        { code: { contains: search, mode: 'insensitive' as const } },
      ],
    }),
  }

  const [data, total] = await prisma.$transaction([
    prisma.storageCabinet.findMany({ where, select: cabinetSelect, orderBy: { [sortBy]: sortOrder }, skip, take: limit }),
    prisma.storageCabinet.count({ where }),
  ])

  return {
    data: data as CabinetResponse[],
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  }
}

export const getCabinetByUuid = async (
  uuid: string,
  pharmacyId: number
): Promise<CabinetResponse> => {
  const cabinet = await prisma.storageCabinet.findFirst({
    where: { uuid, pharmacyId, deletedAt: null },
    select: cabinetSelect,
  })
  if (!cabinet) throw new NotFoundException('Storage cabinet not found')
  return cabinet as CabinetResponse
}

export const createCabinet = async (
  data: CreateCabinetInput,
  pharmacyId: number,
  userId: number
): Promise<CabinetResponse> => {
  await checkCabinetCodeDuplicate(data.code, pharmacyId)

  const cabinet = await prisma.storageCabinet.create({
    data: { pharmacyId, name: data.name, code: data.code, description: data.description, createdById: userId },
    select: cabinetSelect,
  })
  return cabinet as CabinetResponse
}

export const updateCabinet = async (
  uuid: string,
  data: UpdateCabinetInput,
  pharmacyId: number,
  userId: number
): Promise<CabinetResponse> => {
  const existing = await findCabinet(uuid, pharmacyId)

  if (data.code) await checkCabinetCodeDuplicate(data.code, pharmacyId, uuid)

  const cabinet = await prisma.storageCabinet.update({
    where: { id: existing.id },
    data: { ...data, updatedById: userId },
    select: cabinetSelect,
  })
  return cabinet as CabinetResponse
}

export const deleteCabinet = async (
  uuid: string,
  pharmacyId: number,
  userId: number
): Promise<void> => {
  const existing = await findCabinet(uuid, pharmacyId)

  const shelfCount = await prisma.storageShelf.count({
    where: { cabinetId: existing.id, deletedAt: null },
  })
  if (shelfCount > 0) throw new BadRequestException('Cabinet cannot be deleted because it has shelves')

  await prisma.storageCabinet.update({
    where: { id: existing.id },
    data: { deletedAt: new Date(), deletedById: userId },
  })
}

export const getCabinetsDropdown = async (
  pharmacyId: number,
  search?: string
): Promise<Pick<CabinetResponse, 'uuid' | 'name' | 'code'>[]> => {
  return prisma.storageCabinet.findMany({
    where: {
      pharmacyId,
      status: 'ACTIVE',
      deletedAt: null,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { code: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    },
    select: { uuid: true, name: true, code: true },
    orderBy: { name: 'asc' },
  })
}

// ── Shelf services ────────────────────────────────────────

export const getShelves = async (
  cabinetUuid: string,
  pharmacyId: number,
  query: ShelfQueryInput
): Promise<{ data: ShelfResponse[]; meta: PaginationMeta }> => {
  const cabinet = await findCabinet(cabinetUuid, pharmacyId)
  const { search, status, sortBy, sortOrder, page, limit } = query
  const skip = (page - 1) * limit

  const where = {
    cabinetId: cabinet.id,
    deletedAt: null,
    ...(status && { status }),
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' as const } },
        { code: { contains: search, mode: 'insensitive' as const } },
      ],
    }),
  }

  const [data, total] = await prisma.$transaction([
    prisma.storageShelf.findMany({ where, select: shelfSelect, orderBy: { [sortBy]: sortOrder }, skip, take: limit }),
    prisma.storageShelf.count({ where }),
  ])

  return {
    data: data as ShelfResponse[],
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  }
}

export const getShelfByUuid = async (
  uuid: string,
  pharmacyId: number
): Promise<ShelfResponse> => {
  const shelf = await prisma.storageShelf.findFirst({
    where: { uuid, deletedAt: null, cabinet: { pharmacyId } },
    select: shelfSelect,
  })
  if (!shelf) throw new NotFoundException('Storage shelf not found')
  return shelf as ShelfResponse
}

export const createShelf = async (
  cabinetUuid: string,
  data: CreateShelfInput,
  pharmacyId: number,
  userId: number
): Promise<ShelfResponse> => {
  const cabinet = await findCabinet(cabinetUuid, pharmacyId)
  await checkShelfCodeDuplicate(data.code, cabinet.id)

  const shelf = await prisma.storageShelf.create({
    data: { cabinetId: cabinet.id, name: data.name, code: data.code, level: data.level, description: data.description, createdById: userId },
    select: shelfSelect,
  })
  return shelf as ShelfResponse
}

export const updateShelf = async (
  uuid: string,
  data: UpdateShelfInput,
  pharmacyId: number,
  userId: number
): Promise<ShelfResponse> => {
  const existing = await findShelf(uuid, pharmacyId)

  if (data.code) await checkShelfCodeDuplicate(data.code, existing.cabinetId, uuid)

  const shelf = await prisma.storageShelf.update({
    where: { id: existing.id },
    data: { ...data, updatedById: userId },
    select: shelfSelect,
  })
  return shelf as ShelfResponse
}

export const deleteShelf = async (
  uuid: string,
  pharmacyId: number,
  userId: number
): Promise<void> => {
  const existing = await findShelf(uuid, pharmacyId)

  const binCount = await prisma.storageBin.count({
    where: { shelfId: existing.id, deletedAt: null },
  })
  if (binCount > 0) throw new BadRequestException('Shelf cannot be deleted because it has bins')

  await prisma.storageShelf.update({
    where: { id: existing.id },
    data: { deletedAt: new Date(), deletedById: userId },
  })
}

export const getShelvesDropdown = async (
  cabinetUuid: string,
  pharmacyId: number,
  search?: string
): Promise<Pick<ShelfResponse, 'uuid' | 'name' | 'code'>[]> => {
  const cabinet = await findCabinet(cabinetUuid, pharmacyId)

  return prisma.storageShelf.findMany({
    where: {
      cabinetId: cabinet.id,
      status: 'ACTIVE',
      deletedAt: null,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { code: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    },
    select: { uuid: true, name: true, code: true },
    orderBy: [{ level: 'asc' }, { name: 'asc' }],
  })
}

// ── Bin services ──────────────────────────────────────────

export const getBins = async (
  shelfUuid: string,
  pharmacyId: number,
  query: BinQueryInput
): Promise<{ data: BinResponse[]; meta: PaginationMeta }> => {
  const shelf = await findShelf(shelfUuid, pharmacyId)
  const { search, status, sortBy, sortOrder, page, limit } = query
  const skip = (page - 1) * limit

  const where = {
    shelfId: shelf.id,
    deletedAt: null,
    ...(status && { status }),
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' as const } },
        { code: { contains: search, mode: 'insensitive' as const } },
      ],
    }),
  }

  const [data, total] = await prisma.$transaction([
    prisma.storageBin.findMany({ where, select: binSelect, orderBy: { [sortBy]: sortOrder }, skip, take: limit }),
    prisma.storageBin.count({ where }),
  ])

  return {
    data: data as BinResponse[],
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  }
}

export const getBinByUuid = async (
  uuid: string,
  pharmacyId: number
): Promise<BinResponse> => {
  const bin = await prisma.storageBin.findFirst({
    where: { uuid, deletedAt: null, shelf: { cabinet: { pharmacyId } } },
    select: binSelect,
  })
  if (!bin) throw new NotFoundException('Storage bin not found')
  return bin as BinResponse
}

export const createBin = async (
  shelfUuid: string,
  data: CreateBinInput,
  pharmacyId: number,
  userId: number
): Promise<BinResponse> => {
  const shelf = await findShelf(shelfUuid, pharmacyId)
  await checkBinCodeDuplicate(data.code, shelf.id)

  const bin = await prisma.storageBin.create({
    data: { shelfId: shelf.id, name: data.name, code: data.code, description: data.description, createdById: userId },
    select: binSelect,
  })
  return bin as BinResponse
}

export const updateBin = async (
  uuid: string,
  data: UpdateBinInput,
  pharmacyId: number,
  userId: number
): Promise<BinResponse> => {
  const existing = await findBin(uuid, pharmacyId)

  if (data.code) await checkBinCodeDuplicate(data.code, existing.shelfId, uuid)

  const bin = await prisma.storageBin.update({
    where: { id: existing.id },
    data: { ...data, updatedById: userId },
    select: binSelect,
  })
  return bin as BinResponse
}

export const deleteBin = async (
  uuid: string,
  pharmacyId: number,
  userId: number
): Promise<void> => {
  const existing = await findBin(uuid, pharmacyId)

  const [medicineCount, stockDetailCount] = await prisma.$transaction([
    prisma.medicine.count({ where: { defaultBinId: existing.id, deletedAt: null } }),
    prisma.stockDetail.count({ where: { binId: existing.id } }),
  ])

  if (medicineCount > 0 || stockDetailCount > 0) {
    throw new BadRequestException('Bin cannot be deleted because it is assigned to medicines or stock batches')
  }

  await prisma.storageBin.update({
    where: { id: existing.id },
    data: { deletedAt: new Date(), deletedById: userId },
  })
}

export const getBinsDropdown = async (
  shelfUuid: string,
  pharmacyId: number,
  search?: string
): Promise<Pick<BinResponse, 'uuid' | 'name' | 'code'>[]> => {
  const shelf = await findShelf(shelfUuid, pharmacyId)

  return prisma.storageBin.findMany({
    where: {
      shelfId: shelf.id,
      status: 'ACTIVE',
      deletedAt: null,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { code: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    },
    select: { uuid: true, name: true, code: true },
    orderBy: { code: 'asc' },
  })
}
