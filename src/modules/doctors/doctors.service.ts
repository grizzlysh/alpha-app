import { prisma } from '@config/db'
import { CreateDoctorInput, UpdateDoctorInput, DoctorQueryInput } from './doctors.validation'
import { DoctorResponse, DoctorDropdownItem } from './doctors.interface'
import { NotFoundException } from '@exceptions/NotFoundException'
import { ConflictException } from '@exceptions/ConflictException'
import { BadRequestException } from '@exceptions/BadRequestException'
import { PaginationMeta } from '@interfaces/common.interface'

// ── Selects ───────────────────────────────────────────────

const doctorSelect = {
  uuid: true,
  name: true,
  licenseNumber: true,
  specialty: true,
  clinicName: true,
  phone: true,
  status: true,
  user: { select: { uuid: true, name: true, email: true } },
  createdAt: true,
  updatedAt: true,
}

// ── Helpers ───────────────────────────────────────────────

const findDoctor = async (uuid: string, pharmacyId: number) => {
  const doctor = await prisma.doctor.findFirst({
    where: { uuid, pharmacyId, deletedAt: null },
    select: { id: true },
  })
  if (!doctor) throw new NotFoundException('Doctor not found')
  return doctor
}

const checkLicenseDuplicate = async (
  licenseNumber: string,
  pharmacyId: number,
  excludeUuid?: string
) => {
  const existing = await prisma.doctor.findFirst({
    where: {
      licenseNumber,
      pharmacyId,
      deletedAt: null,
      ...(excludeUuid && { NOT: { uuid: excludeUuid } }),
    },
  })
  if (existing) throw new ConflictException('A doctor with this license number already exists')
}

// ── Services ──────────────────────────────────────────────

export const getDoctors = async (
  pharmacyId: number,
  query: DoctorQueryInput
): Promise<{ data: DoctorResponse[]; meta: PaginationMeta }> => {
  const { search, status, sortBy, sortOrder, page, limit } = query
  const skip = (page - 1) * limit

  const where = {
    pharmacyId,
    deletedAt: null,
    ...(status && { status }),
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' as const } },
        { licenseNumber: { contains: search, mode: 'insensitive' as const } },
        { clinicName: { contains: search, mode: 'insensitive' as const } },
      ],
    }),
  }

  const [data, total] = await prisma.$transaction([
    prisma.doctor.findMany({ where, select: doctorSelect, orderBy: { [sortBy]: sortOrder }, skip, take: limit }),
    prisma.doctor.count({ where }),
  ])

  return {
    data: data as unknown as DoctorResponse[],
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  }
}

export const getDoctorByUuid = async (
  uuid: string,
  pharmacyId: number
): Promise<DoctorResponse> => {
  const doctor = await prisma.doctor.findFirst({
    where: { uuid, pharmacyId, deletedAt: null },
    select: doctorSelect,
  })
  if (!doctor) throw new NotFoundException('Doctor not found')
  return doctor as unknown as DoctorResponse
}

export const createDoctor = async (
  data: CreateDoctorInput,
  pharmacyId: number,
  userId: number
): Promise<DoctorResponse> => {
  if (data.licenseNumber) {
    await checkLicenseDuplicate(data.licenseNumber, pharmacyId)
  }

  let linkedUserId: number | undefined
  if (data.userUuid) {
    const user = await prisma.user.findFirst({
      where: { uuid: data.userUuid, deletedAt: null },
      select: { id: true },
    })
    if (!user) throw new NotFoundException('User not found')

    const alreadyLinked = await prisma.doctor.findUnique({
      where: { userId: user.id },
    })
    if (alreadyLinked) throw new ConflictException('This user account is already linked to a doctor profile')

    linkedUserId = user.id
  }

  const doctor = await prisma.doctor.create({
    data: {
      pharmacyId,
      name: data.name,
      licenseNumber: data.licenseNumber,
      specialty: data.specialty,
      clinicName: data.clinicName,
      phone: data.phone,
      userId: linkedUserId,
      createdById: userId,
    },
    select: doctorSelect,
  })
  return doctor as unknown as DoctorResponse
}

export const updateDoctor = async (
  uuid: string,
  data: UpdateDoctorInput,
  pharmacyId: number,
  userId: number
): Promise<DoctorResponse> => {
  const existing = await findDoctor(uuid, pharmacyId)

  if (data.licenseNumber) {
    await checkLicenseDuplicate(data.licenseNumber, pharmacyId, uuid)
  }

  const doctor = await prisma.doctor.update({
    where: { id: existing.id },
    data: { ...data, updatedById: userId },
    select: doctorSelect,
  })
  return doctor as unknown as DoctorResponse
}

export const deleteDoctor = async (
  uuid: string,
  pharmacyId: number,
  userId: number
): Promise<void> => {
  const existing = await findDoctor(uuid, pharmacyId)

  const prescriptionCount = await prisma.prescription.count({
    where: { doctorId: existing.id, deletedAt: null },
  })
  if (prescriptionCount > 0) {
    throw new BadRequestException('Doctor cannot be deleted because they have prescriptions')
  }

  await prisma.doctor.update({
    where: { id: existing.id },
    data: { deletedAt: new Date(), deletedById: userId },
  })
}

export const getDoctorsDropdown = async (
  pharmacyId: number,
  search?: string
): Promise<DoctorDropdownItem[]> => {
  return prisma.doctor.findMany({
    where: {
      pharmacyId,
      status: 'ACTIVE',
      deletedAt: null,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { licenseNumber: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    },
    select: { uuid: true, name: true, licenseNumber: true, clinicName: true },
    orderBy: { name: 'asc' },
  })
}
