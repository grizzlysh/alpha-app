import { prisma } from '@config/db'
import {
  CreateDistributorInput,
  UpdateDistributorInput,
  DistributorQueryInput,
} from './distributors.validation'
import { DistributorResponse, DistributorDropdownItem } from './distributors.interface'
import { NotFoundException } from '@exceptions/NotFoundException'
import { ConflictException } from '@exceptions/ConflictException'
import { PaginationMeta } from '@interfaces/common.interface'

// ── Helpers ───────────────────────────────────────────

const distributorSelect = {
  uuid: true,
  name: true,
  phone: true,
  email: true,
  address: true,
  contactPerson: true,
  permitNumber: true,
  description: true,
  status: true,
  createdAt: true,
  updatedAt: true,
}

const checkDuplicate = async (
  name: string,
  pharmacyId: number,
  excludeUuid?: string
): Promise<void> => {
  const existing = await prisma.distributor.findFirst({
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
    throw new ConflictException('Distributor with this name already exists')
  }
}

// ── Services ──────────────────────────────────────────

export const getDistributors = async (
  pharmacyId: number,
  query: DistributorQueryInput
): Promise<{ data: DistributorResponse[]; meta: PaginationMeta }> => {
  const {
    search,
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
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' as const } },
        { email: { contains: search, mode: 'insensitive' as const } },
        { contactPerson: { contains: search, mode: 'insensitive' as const } },
      ]
    })
  }

  const [distributors, total] = await prisma.$transaction([
    prisma.distributor.findMany({
      where,
      select: distributorSelect,
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    }),
    prisma.distributor.count({ where }),
  ])

  const meta: PaginationMeta = {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  }

  return { data: distributors as DistributorResponse[], meta }
}

export const getDistributorByUuid = async (
  uuid: string,
  pharmacyId: number
): Promise<DistributorResponse> => {
  const distributor = await prisma.distributor.findFirst({
    where: { uuid, pharmacyId, deletedAt: null },
    select: distributorSelect,
  })

  if (!distributor) {
    throw new NotFoundException('Distributor not found')
  }

  return distributor as DistributorResponse
}

export const createDistributor = async (
  data: CreateDistributorInput,
  pharmacyId: number,
  userId: number
): Promise<DistributorResponse> => {
  await checkDuplicate(data.name, pharmacyId)

  const distributor = await prisma.distributor.create({
    data: {
      pharmacyId,
      name: data.name,
      phone: data.phone,
      email: data.email,
      address: data.address,
      contactPerson: data.contactPerson,
      permitNumber: data.permitNumber,
      description: data.description,
      createdById: userId,
    },
    select: distributorSelect,
  })

  return distributor as DistributorResponse
}

export const updateDistributor = async (
  uuid: string,
  data: UpdateDistributorInput,
  pharmacyId: number,
  userId: number
): Promise<DistributorResponse> => {
  const existing = await prisma.distributor.findFirst({
    where: { uuid, pharmacyId, deletedAt: null },
    select: { id: true }
  })

  if (!existing) {
    throw new NotFoundException('Distributor not found')
  }

  if (data.name) {
    await checkDuplicate(data.name, pharmacyId, uuid)
  }

  const distributor = await prisma.distributor.update({
    where: { id: existing.id },
    data: {
      ...data,
      updatedById: userId,
    },
    select: distributorSelect,
  })

  return distributor as DistributorResponse
}

export const deleteDistributor = async (
  uuid: string,
  pharmacyId: number,
  userId: number
): Promise<void> => {
  const existing = await prisma.distributor.findFirst({
    where: { uuid, pharmacyId, deletedAt: null },
    select: { id: true }
  })

  if (!existing) {
    throw new NotFoundException('Distributor not found')
  }

  await prisma.distributor.update({
    where: { id: existing.id },
    data: {
      deletedAt: new Date(),
      deletedById: userId,
    }
  })
}

export const getDistributorsDropdown = async (
  pharmacyId: number,
  search?: string
): Promise<DistributorDropdownItem[]> => {
  return prisma.distributor.findMany({
    where: {
      pharmacyId,
      deletedAt: null,
      ...(search && { name: { contains: search, mode: 'insensitive' as const } }),
    },
    select: { uuid: true, name: true },
    orderBy: { name: 'asc' },
  })
}