import { prisma } from '@config/db'
import { CustomerType } from '@prisma/client'
import { CreateCustomerInput, UpdateCustomerInput, CustomerQueryInput } from './customers.validation'
import { CustomerDetailResponse, CustomerDropdownItem } from './customers.interface'
import { NotFoundException } from '@exceptions/NotFoundException'
import { ConflictException } from '@exceptions/ConflictException'
import { ForbiddenException } from '@exceptions/ForbiddenException'
import { PaginationMeta } from '@interfaces/common.interface'
import { generateDocNumber, withDocNumberRetry } from '@utils/generateDocNumbers'

// ── Selects ───────────────────────────────────────────

const customerDetailSelect = {
  uuid: true,
  customerType: true,
  name: true,
  phone: true,
  address: true,
  description: true,
  isWalkIn: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  medicalRecord: {
    select: {
      uuid: true,
      number: true,
    },
  },
  patientDetail: {
    select: {
      nik: true,
      gender: true,
      dateOfBirth: true,
      bpjsNumber: true,
    },
  },
  professionalDetail: {
    select: {
      strNumber: true,
      sipNumber: true,
      profession: true,
    },
  },
}

// ── Helpers ───────────────────────────────────────────

const checkDuplicate = async (phone: string, pharmacyId: number, excludeUuid?: string): Promise<void> => {
  const existing = await prisma.customer.findFirst({
    where: {
      phone,
      pharmacyId,
      deletedAt: null,
      ...(excludeUuid && { NOT: { uuid: excludeUuid } }),
    },
  })
  if (existing) throw new ConflictException('Customer with this phone already exists')
}

const checkIsWalkIn = async (uuid: string, pharmacyId: number): Promise<void> => {
  const customer = await prisma.customer.findFirst({
    where: { uuid, pharmacyId },
    select: { isWalkIn: true },
  })
  if (customer?.isWalkIn) throw new ForbiddenException('Walk-in customer cannot be modified or deleted')
}

// ── Walk-in Customer ──────────────────────────────────

export const createWalkInCustomer = async (pharmacyId: number, userId: number): Promise<void> => {
  await prisma.customer.create({
    data: {
      pharmacyId,
      customerType: CustomerType.PATIENT,
      name: 'Walk-in Patient',
      isWalkIn: true,
      createdById: userId,
    },
  })
}

export const getWalkInCustomer = async (pharmacyId: number): Promise<{ id: number; uuid: string }> => {
  const customer = await prisma.customer.findFirst({
    where: { pharmacyId, isWalkIn: true },
    select: { id: true, uuid: true },
  })
  if (!customer) throw new NotFoundException('Walk-in customer not found')
  return customer
}

// ── Services ──────────────────────────────────────────

export const getCustomers = async (
  pharmacyId: number,
  query: CustomerQueryInput
): Promise<{ data: CustomerDetailResponse[]; meta: PaginationMeta }> => {
  const { search, customerType, status, isWalkIn, sortBy, sortOrder, page, limit } = query
  const skip = (page - 1) * limit

  const where = {
    pharmacyId,
    deletedAt: null,
    ...(customerType && { customerType }),
    ...(status && { status }),
    ...(isWalkIn !== undefined && { isWalkIn: isWalkIn === 'true' }),
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' as const } },
        { phone: { contains: search, mode: 'insensitive' as const } },
      ],
    }),
  }

  const [customers, total] = await prisma.$transaction([
    prisma.customer.findMany({ where, select: customerDetailSelect, orderBy: { [sortBy]: sortOrder }, skip, take: limit }),
    prisma.customer.count({ where }),
  ])

  return {
    data: customers as unknown as CustomerDetailResponse[],
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  }
}

export const getCustomerByUuid = async (uuid: string, pharmacyId: number): Promise<CustomerDetailResponse> => {
  const customer = await prisma.customer.findFirst({
    where: { uuid, pharmacyId, deletedAt: null },
    select: customerDetailSelect,
  })
  if (!customer) throw new NotFoundException('Customer not found')
  return customer as unknown as CustomerDetailResponse
}

export const createCustomer = async (
  data: CreateCustomerInput,
  pharmacyId: number,
  userId: number
): Promise<CustomerDetailResponse> => {
  if (data.phone) await checkDuplicate(data.phone, pharmacyId)

  const pharmacy = await prisma.pharmacy.findUnique({
    where: { id: pharmacyId },
    select: { code: true },
  })
  if (!pharmacy) throw new NotFoundException('Pharmacy not found')

  return withDocNumberRetry('MR', async () => {
    const mrNumber = data.customerType === CustomerType.PATIENT
      ? await generateDocNumber({ type: 'MR', pharmacyId, pharmacyCode: pharmacy.code })
      : null

    const customer = await prisma.customer.create({
      data: {
        pharmacyId,
        customerType: data.customerType,
        name: data.name,
        phone: data.phone,
        address: data.address,
        description: data.description,
        isWalkIn: false,
        createdById: userId,
        ...(data.customerType === CustomerType.PATIENT && {
          medicalRecord: {
            create: {
              pharmacyId,
              number: mrNumber!,
              createdById: userId,
            },
          },
          ...(data.patientDetail && {
            patientDetail: {
              create: {
                nik: data.patientDetail.nik,
                gender: data.patientDetail.gender,
                dateOfBirth: data.patientDetail.dateOfBirth ? new Date(data.patientDetail.dateOfBirth) : undefined,
                bpjsNumber: data.patientDetail.bpjsNumber,
              },
            },
          }),
        }),
        ...(data.customerType === CustomerType.PROFESSIONAL && data.professionalDetail && {
          professionalDetail: {
            create: {
              strNumber: data.professionalDetail.strNumber,
              sipNumber: data.professionalDetail.sipNumber,
              profession: data.professionalDetail.profession,
            },
          },
        }),
      },
      select: customerDetailSelect,
    })
    return customer as unknown as CustomerDetailResponse
  })
}

export const updateCustomer = async (
  uuid: string,
  data: UpdateCustomerInput,
  pharmacyId: number,
  userId: number
): Promise<CustomerDetailResponse> => {
  const existing = await prisma.customer.findFirst({
    where: { uuid, pharmacyId, deletedAt: null },
    select: { id: true, customerType: true },
  })
  if (!existing) throw new NotFoundException('Customer not found')

  await checkIsWalkIn(uuid, pharmacyId)
  if (data.phone) await checkDuplicate(data.phone, pharmacyId, uuid)

  const { patientDetail, professionalDetail, ...coreData } = data

  const customer = await prisma.customer.update({
    where: { id: existing.id },
    data: {
      ...coreData,
      updatedById: userId,
      ...(existing.customerType === CustomerType.PATIENT && patientDetail && {
        patientDetail: {
          upsert: {
            create: {
              nik: patientDetail.nik,
              gender: patientDetail.gender,
              dateOfBirth: patientDetail.dateOfBirth ? new Date(patientDetail.dateOfBirth) : undefined,
              bpjsNumber: patientDetail.bpjsNumber,
            },
            update: {
              nik: patientDetail.nik,
              gender: patientDetail.gender,
              dateOfBirth: patientDetail.dateOfBirth ? new Date(patientDetail.dateOfBirth) : undefined,
              bpjsNumber: patientDetail.bpjsNumber,
            },
          },
        },
      }),
      ...(existing.customerType === CustomerType.PROFESSIONAL && professionalDetail && {
        professionalDetail: {
          upsert: {
            create: {
              strNumber: professionalDetail.strNumber,
              sipNumber: professionalDetail.sipNumber,
              profession: professionalDetail.profession,
            },
            update: {
              strNumber: professionalDetail.strNumber,
              sipNumber: professionalDetail.sipNumber,
              profession: professionalDetail.profession,
            },
          },
        },
      }),
    },
    select: customerDetailSelect,
  })
  return customer as unknown as CustomerDetailResponse
}

export const deleteCustomer = async (uuid: string, pharmacyId: number, userId: number): Promise<void> => {
  const existing = await prisma.customer.findFirst({
    where: { uuid, pharmacyId, deletedAt: null },
    select: { id: true },
  })
  if (!existing) throw new NotFoundException('Customer not found')

  await checkIsWalkIn(uuid, pharmacyId)

  await prisma.customer.update({
    where: { id: existing.id },
    data: { deletedAt: new Date(), deletedById: userId },
  })
}

export const getCustomersDropdown = async (
  pharmacyId: number,
  search?: string,
  customerType?: CustomerType
): Promise<CustomerDropdownItem[]> => {
  return prisma.customer.findMany({
    where: {
      pharmacyId,
      deletedAt: null,
      ...(customerType && { customerType }),
      ...(search && { name: { contains: search, mode: 'insensitive' as const } }),
    },
    select: { uuid: true, name: true, phone: true, customerType: true, isWalkIn: true },
    orderBy: { name: 'asc' },
  }) as unknown as CustomerDropdownItem[]
}
