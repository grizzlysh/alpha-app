import { prisma } from '@config/db'
import {
  CreateCustomerInput,
  UpdateCustomerInput,
  CustomerQueryInput,
} from './customers.validation'
import { CustomerResponse } from './customers.interface'
import { NotFoundException } from '@exceptions/NotFoundException'
import { ConflictException } from '@exceptions/ConflictException'
import { ForbiddenException } from '@exceptions/ForbiddenException'
import { PaginationMeta } from '@interfaces/common.interface'

// ── Helpers ───────────────────────────────────────────

const customerSelect = {
  uuid: true,
  name: true,
  phone: true,
  address: true,
  description: true,
  isWalkIn: true,
  status: true,
  createdAt: true,
  updatedAt: true,
}

const checkDuplicate = async (
  phone: string,
  pharmacyId: number,
  excludeUuid?: string
): Promise<void> => {
  const existing = await prisma.customer.findFirst({
    where: {
      phone,
      pharmacyId,
      status: { not: 'DELETED' },
      ...(excludeUuid && {
        NOT: { uuid: excludeUuid }
      })
    }
  })

  if (existing) {
    throw new ConflictException('Customer with this phone already exists')
  }
}

const checkIsWalkIn = async (
  uuid: string,
  pharmacyId: number
): Promise<void> => {
  const customer = await prisma.customer.findFirst({
    where: { uuid, pharmacyId },
    select: { isWalkIn: true }
  })

  if (customer?.isWalkIn) {
    throw new ForbiddenException('Walk-in customer cannot be modified or deleted')
  }
}

// ── Walk-in Customer ──────────────────────────────────

export const createWalkInCustomer = async (
  pharmacyId: number,
  userId: number
): Promise<void> => {
  await prisma.customer.create({
    data: {
      pharmacyId,
      name: 'Walk-in Customer',
      isWalkIn: true,
      createdById: userId,
    }
  })
}

export const getWalkInCustomer = async (
  pharmacyId: number
): Promise<CustomerResponse> => {
  const customer = await prisma.customer.findFirst({
    where: { pharmacyId, isWalkIn: true },
    select: customerSelect,
  })

  if (!customer) {
    throw new NotFoundException('Walk-in customer not found')
  }

  return customer as CustomerResponse
}

// ── Services ──────────────────────────────────────────

export const getCustomers = async (
  pharmacyId: number,
  query: CustomerQueryInput
): Promise<{ data: CustomerResponse[]; meta: PaginationMeta }> => {
  const {
    search,
    status,
    isWalkIn,
    sortBy,
    sortOrder,
    page,
    limit,
  } = query

  const skip: number = (page - 1) * limit

  const where = {
    pharmacyId,
    status: status ?? { not: 'DELETED' as const },
    ...(isWalkIn !== undefined && {
      isWalkIn: isWalkIn === 'true'
    }),
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' as const } },
        { phone: { contains: search, mode: 'insensitive' as const } },
      ]
    })
  }

  const [customers, total] = await prisma.$transaction([
    prisma.customer.findMany({
      where,
      select: customerSelect,
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    }),
    prisma.customer.count({ where }),
  ])

  const meta: PaginationMeta = {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  }

  return { data: customers as CustomerResponse[], meta }
}

export const getCustomerByUuid = async (
  uuid: string,
  pharmacyId: number
): Promise<CustomerResponse> => {
  const customer = await prisma.customer.findFirst({
    where: { uuid, pharmacyId, status: { not: 'DELETED' } },
    select: customerSelect,
  })

  if (!customer) {
    throw new NotFoundException('Customer not found')
  }

  return customer as CustomerResponse
}

export const createCustomer = async (
  data: CreateCustomerInput,
  pharmacyId: number,
  userId: number
): Promise<CustomerResponse> => {
  if (data.phone) {
    await checkDuplicate(data.phone, pharmacyId)
  }

  const customer = await prisma.customer.create({
    data: {
      pharmacyId,
      name: data.name,
      phone: data.phone,
      address: data.address,
      description: data.description,
      isWalkIn: false,
      createdById: userId,
    },
    select: customerSelect,
  })

  return customer as CustomerResponse
}

export const updateCustomer = async (
  uuid: string,
  data: UpdateCustomerInput,
  pharmacyId: number,
  userId: number
): Promise<CustomerResponse> => {
  const existing = await prisma.customer.findFirst({
    where: { uuid, pharmacyId, status: { not: 'DELETED' } },
    select: { id: true }
  })

  if (!existing) {
    throw new NotFoundException('Customer not found')
  }

  // block editing walk-in customer
  await checkIsWalkIn(uuid, pharmacyId)

  if (data.phone) {
    await checkDuplicate(data.phone, pharmacyId, uuid)
  }

  const customer = await prisma.customer.update({
    where: { id: existing.id },
    data: {
      ...data,
      updatedById: userId,
    },
    select: customerSelect,
  })

  return customer as CustomerResponse
}

export const deleteCustomer = async (
  uuid: string,
  pharmacyId: number,
  userId: number
): Promise<void> => {
  const existing = await prisma.customer.findFirst({
    where: { uuid, pharmacyId, status: { not: 'DELETED' } },
    select: { id: true }
  })

  if (!existing) {
    throw new NotFoundException('Customer not found')
  }

  // block deleting walk-in customer
  await checkIsWalkIn(uuid, pharmacyId)

  await prisma.customer.update({
    where: { id: existing.id },
    data: {
      status: 'DELETED',
      deletedAt: new Date(),
      deletedById: userId,
    }
  })
}